from fastapi import APIRouter, Depends
from redis.exceptions import RedisError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import HOLD_TTL_SECONDS, hold_seat
from app.models import Concert, Seat
from app.schemas import SeatHoldData, SeatHoldRequest, SeatHoldResponse

router = APIRouter(tags=["seats"])


@router.post("/seats/hold", response_model=SeatHoldResponse)
def create_seat_hold(
    request: SeatHoldRequest,
    db: Session = Depends(get_db),
):
    # 존재하지 않는 공연이면 hold를 생성하지 않는다.
    concert = db.get(Concert, request.concert_id)
    if concert is None:
        return SeatHoldResponse(
            success=False,
            message="공연을 찾을 수 없습니다.",
            data=None,
        )

    seat = db.get(Seat, request.seat_id)
    if seat is None or seat.concert_id != request.concert_id:
        return SeatHoldResponse(
            success=False,
            message="좌석을 찾을 수 없습니다.",
            data=None,
        )

    if seat.status == "SOLD":
        return SeatHoldResponse(
            success=False,
            message="이미 판매된 좌석입니다.",
            data=None,
        )

    try:
        held = hold_seat(request.concert_id, request.seat_id, request.user_id)
    except RedisError:
        return SeatHoldResponse(
            success=False,
            message="좌석 임시 선점 처리에 실패했습니다.",
            data=None,
        )

    if not held:
        return SeatHoldResponse(
            success=False,
            message="이미 선택 중인 좌석입니다.",
            data=None,
        )

    return SeatHoldResponse(
        success=True,
        message="좌석이 임시 선점되었습니다.",
        data=SeatHoldData(
            concert_id=request.concert_id,
            seat_id=request.seat_id,
            hold_ttl_seconds=HOLD_TTL_SECONDS,
        ),
    )
