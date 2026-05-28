from datetime import datetime

from fastapi import APIRouter, Depends
from redis.exceptions import RedisError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import get_hold_user
from app.core.sqs import send_sqs_message
from app.models import Concert, Seat, TicketRequest
from app.schemas import PaymentConfirmData, PaymentConfirmRequest, PaymentConfirmResponse

router = APIRouter(tags=["payments"])


def build_existing_payment_response(ticket_request: TicketRequest) -> PaymentConfirmResponse:
    # 같은 결제 요청이 다시 들어오면 기존 처리 상태를 그대로 내려준다.
    is_failed = ticket_request.status == "FAILED"
    return PaymentConfirmResponse(
        success=not is_failed,
        message=ticket_request.message or "이미 접수된 결제 확정 요청입니다.",
        data=PaymentConfirmData(
            request_id=ticket_request.request_id,
            status=ticket_request.status,
        ),
    )


@router.post("/payments/confirm", response_model=PaymentConfirmResponse)
def confirm_payment(
    request: PaymentConfirmRequest,
    db: Session = Depends(get_db),
):
    # 결제 확정 요청은 최종 예매 성공이 아니라 PENDING 상태로 접수한다.
    existing = db.get(TicketRequest, request.request_id)
    if existing is not None:
        return build_existing_payment_response(existing)

    existing_by_key = (
        db.query(TicketRequest)
        .filter(TicketRequest.idempotency_key == request.idempotency_key)
        .first()
    )
    if existing_by_key is not None:
        return build_existing_payment_response(existing_by_key)

    concert = db.get(Concert, request.concert_id)
    if concert is None:
        return PaymentConfirmResponse(
            success=False,
            message="공연을 찾을 수 없습니다.",
            data=None,
        )

    seat = db.get(Seat, request.seat_id)
    if seat is None or seat.concert_id != request.concert_id:
        return PaymentConfirmResponse(
            success=False,
            message="좌석을 찾을 수 없습니다.",
            data=None,
        )

    if seat.status == "SOLD":
        return PaymentConfirmResponse(
            success=False,
            message="이미 판매된 좌석입니다.",
            data=None,
        )

    try:
        hold_user = get_hold_user(request.concert_id, request.seat_id)
    except RedisError:
        return PaymentConfirmResponse(
            success=False,
            message="좌석 임시 선점 정보를 확인할 수 없습니다.",
            data=None,
        )

    if hold_user != request.user_id:
        return PaymentConfirmResponse(
            success=False,
            message="좌석 임시 선점 정보가 유효하지 않습니다.",
            data=None,
        )

    ticket_request = TicketRequest(
        request_id=request.request_id,
        idempotency_key=request.idempotency_key,
        concert_id=request.concert_id,
        seat_id=request.seat_id,
        user_id=request.user_id,
        status="PENDING",
        message="예매 확정 처리 대기 중입니다.",
    )

    try:
        db.add(ticket_request)
        db.commit()
    except IntegrityError:
        db.rollback()
        existing_after_race = db.get(TicketRequest, request.request_id)
        if existing_after_race is not None:
            return build_existing_payment_response(existing_after_race)

        existing_by_key = (
            db.query(TicketRequest)
            .filter(TicketRequest.idempotency_key == request.idempotency_key)
            .first()
        )
        if existing_by_key is None:
            raise

        return build_existing_payment_response(existing_by_key)

    message = {
        "requestId": request.request_id,
        "concertId": request.concert_id,
        "seatId": request.seat_id,
        "userId": request.user_id,
        "idempotencyKey": request.idempotency_key,
    }
    try:
        sent = send_sqs_message(message)
    except Exception:
        # SQS 설정이 있는데 전송에 실패하면 운영자가 확인할 수 있도록 실패 상태로 남긴다.
        ticket_request.status = "FAILED"
        ticket_request.message = "SQS 전송에 실패했습니다."
        ticket_request.processed_at = datetime.utcnow()
        db.commit()
        return PaymentConfirmResponse(
            success=False,
            message="SQS 전송에 실패했습니다.",
            data=PaymentConfirmData(
                request_id=request.request_id,
                status="FAILED",
            ),
        )

    if not sent:
        ticket_request.message = "SQS 전송 없이 PENDING 상태로 저장되었습니다."
        db.commit()

    return PaymentConfirmResponse(
        success=True,
        message="결제 확정 요청이 접수되었습니다.",
        data=PaymentConfirmData(
            request_id=request.request_id,
            status="PENDING",
        ),
    )
