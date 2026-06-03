import logging
from uuid import uuid4

from fastapi import APIRouter, Depends
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import invalidate_seats_cache
from app.models import Concert, Seat, Ticket
from app.schemas import DirectTicketData, DirectTicketRequest, DirectTicketResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["tickets"])  # 티켓 관련 API를 묶는 라우터이다.


@router.post("/tickets/direct", response_model=DirectTicketResponse)
def create_direct_ticket(
    request: DirectTicketRequest,
    db: Session = Depends(get_db),
):
    # 좌석이 AVAILABLE일 때만 SOLD로 바꾸는 조건부 UPDATE로 중복 예매를 막는다.
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
            "concert_id": request.concert_id,
            "seat_id": request.seat_id,
        },
    )

    if result.rowcount != 1:
        db.rollback()
        concert = db.get(Concert, request.concert_id)
        if concert is None:
            return DirectTicketResponse(
                success=False,
                message="공연을 찾을 수 없습니다.",
                data=None,
            )

        seat = db.get(Seat, request.seat_id)
        if seat is None or seat.concert_id != request.concert_id:
            return DirectTicketResponse(
                success=False,
                message="좌석을 찾을 수 없습니다.",
                data=None,
            )

        return DirectTicketResponse(
            success=False,
            message="이미 판매된 좌석입니다.",
            data=None,
        )

    # 티켓을 생성한다. 좌석이 이미 판매된 경우에는 UNIQUE 제약조건 위반으로 예외가 발생하므로 롤백한다.
    ticket = Ticket(
        request_id=f"direct-{uuid4()}",
        idempotency_key=f"direct-{uuid4()}",
        concert_id=request.concert_id,
        seat_id=request.seat_id,
        user_id=request.user_id,
    )

    try:
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
    except IntegrityError:
        db.rollback()
        return DirectTicketResponse(
            success=False,
            message="이미 판매된 좌석입니다.",
            data=None,
        )

    try:
        invalidate_seats_cache(request.concert_id)
    except RedisError:
        logger.warning("concert=%d seats cache invalidation failed", request.concert_id)

    return DirectTicketResponse(
        success=True,
        message="예매 성공",
        data=DirectTicketData(ticket_id=ticket.ticket_id),
    )
