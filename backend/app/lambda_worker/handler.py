import json
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, init_db
from app.core.redis import delete_hold, get_hold_user, invalidate_seats_cache
from app.models import Ticket, TicketRequest


def fail_request(
    db: Session,
    ticket_request: TicketRequest,
    message: str,
) -> None:
    # 요청을 실패 상태로 저장한다.
    db.refresh(ticket_request)
    if ticket_request.status == "SUCCESS":
        return

    ticket_request.status = "FAILED"
    ticket_request.message = message
    ticket_request.processed_at = datetime.utcnow()
    db.commit()


def process_ticket_request(payload: dict[str, Any]) -> None:
    # SQS 메시지 한 건을 최종 예매 처리한다.
    db = SessionLocal()
    try:
        request_id = payload["requestId"]
        concert_id = int(payload["concertId"])
        seat_id = int(payload["seatId"])
        user_id = payload["userId"]
        idempotency_key = payload["idempotencyKey"]

        ticket_request = db.get(TicketRequest, request_id)
        if ticket_request is None:
            ticket_request = TicketRequest(
                request_id=request_id,
                idempotency_key=idempotency_key,
                concert_id=concert_id,
                seat_id=seat_id,
                user_id=user_id,
                status="PENDING",
                message="Lambda에서 요청을 생성했습니다.",
            )
            try:
                db.add(ticket_request)
                db.commit()
                db.refresh(ticket_request)
            except IntegrityError:
                db.rollback()
                ticket_request = db.get(TicketRequest, request_id)
                if ticket_request is None:
                    raise

        if ticket_request.status in {"SUCCESS", "FAILED"}:
            return

        # PROCESSING에서 멈춘 요청도 SQS 재시도로 다시 처리할 수 있게 한다.
        ticket_request.status = "PROCESSING"
        ticket_request.message = "예매 확정 처리 중입니다."
        db.commit()

        hold_user = get_hold_user(concert_id, seat_id)
        if hold_user != user_id:
            fail_request(db, ticket_request, "좌석 임시 선점 정보가 유효하지 않습니다.")
            return

        result = db.execute(
            text(
                """
                UPDATE seats
                SET status = 'SOLD'
                WHERE concert_id = :concert_id
                  AND seat_id = :seat_id
                  AND status = 'AVAILABLE'
                """
            ),
            {
                "concert_id": concert_id,
                "seat_id": seat_id,
            },
        )

        if result.rowcount != 1:
            fail_request(db, ticket_request, "이미 판매된 좌석입니다.")
            return

        ticket = Ticket(
            request_id=request_id,
            idempotency_key=idempotency_key,
            concert_id=concert_id,
            seat_id=seat_id,
            user_id=user_id,
        )
        db.add(ticket)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            ticket_request = db.get(TicketRequest, request_id)
            if ticket_request is not None:
                fail_request(db, ticket_request, "중복 예매 요청입니다.")
            return

        ticket_request.status = "SUCCESS"
        ticket_request.message = "예매가 확정되었습니다."
        ticket_request.ticket_id = ticket.ticket_id
        ticket_request.processed_at = datetime.utcnow()

        db.commit()
        try:
            invalidate_seats_cache(concert_id)
        except Exception:
            pass
        delete_hold(concert_id, seat_id)
    finally:
        db.close()


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    # AWS Lambda SQS event 진입점이다.
    init_db()

    processed_count = 0
    for record in event.get("Records", []):
        payload = json.loads(record["body"])
        process_ticket_request(payload)
        processed_count += 1

    return {
        "processed": processed_count,
    }
