import logging

from fastapi import APIRouter, Depends, HTTPException
from redis.exceptions import RedisError
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.redis import (
    get_hold_users,
    get_seats_cache,
    set_seats_cache,
)
from app.models import Concert, Seat
from app.schemas import ApiResponse, ConcertSeats, ConcertSummary, SeatSummary

logger = logging.getLogger(__name__)

router = APIRouter(tags=["concerts"])  # 공연 관련 API를 묶는 라우터이다.


# 공연 목록을 조회하고 공연별 판매되지 않은 좌석 수를 함께 반환한다.
@router.get("/concerts", response_model=ApiResponse[list[ConcertSummary]])
def get_concerts(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Concert,
            func.count(Seat.seat_id).label("remaining_seats"),
        )
        .outerjoin(
            Seat,
            (Seat.concert_id == Concert.concert_id) & (Seat.status == "AVAILABLE"),
        )
        .group_by(Concert.concert_id)
        .order_by(Concert.concert_id)
        .all()
    )

    data = [
        ConcertSummary(
            concert_id=concert.concert_id,
            title=concert.title,
            venue=concert.venue,
            concert_date=concert.concert_date,
            total_seats=concert.total_seats,
            remaining_seats=remaining_seats,
        )
        for concert, remaining_seats in rows
    ]

    return ApiResponse(success=True, data=data)


# 특정 공연의 좌석 목록과 좌석 상태를 함께 반환한다.
@router.get("/concerts/{concert_id}/seats", response_model=ApiResponse[ConcertSeats])
def get_concert_seats(concert_id: int, db: Session = Depends(get_db)):
    # 존재하지 않는 공연이면 좌석 목록 대신 404를 반환한다.
    concert = db.get(Concert, concert_id)
    if concert is None:
        raise HTTPException(status_code=404, detail="공연을 찾을 수 없습니다.")

    # 1) Redis 캐시에서 좌석 데이터를 먼저 조회한다.
    seats_data = None
    try:
        seats_data = get_seats_cache(concert_id)
    except RedisError:
        logger.warning("concert=%d seats cache read failed, fallback to DB", concert_id)

    if seats_data is not None:
        # Cache HIT: DB 조회 없이 캐시 데이터를 사용한다.
        logger.info("concert=%d seats cache hit", concert_id)
    else:
        # Cache MISS: DB에서 조회한 뒤 Redis에 저장한다.
        logger.info("concert=%d seats cache miss", concert_id)
        seats = (
            db.query(Seat)
            .filter(Seat.concert_id == concert_id)
            .order_by(Seat.seat_id)
            .all()
        )
        seats_data = [
            {
                "seat_id": seat.seat_id,
                "seat_code": seat.seat_code,
                "status": seat.status,
            }
            for seat in seats
        ]
        try:
            set_seats_cache(concert_id, seats_data)
        except RedisError:
            logger.warning("concert=%d seats cache write failed", concert_id)

    # 2) AVAILABLE 좌석의 hold 상태를 Redis에서 실시간 조회한다.
    available_seat_ids = [
        s["seat_id"] for s in seats_data if s["status"] == "AVAILABLE"
    ]

    try:
        hold_users = get_hold_users(concert_id, available_seat_ids)
    except RedisError:
        hold_users = {}

    data = ConcertSeats(
        concert_id=concert_id,
        seats=[
            SeatSummary(
                seat_id=s["seat_id"],
                seat_code=s["seat_code"],
                status="HOLD" if s["seat_id"] in hold_users else s["status"],
            )
            for s in seats_data
        ],
    )

    return ApiResponse(success=True, data=data)
