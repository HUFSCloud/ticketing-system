from datetime import datetime

from redis.exceptions import RedisError
from sqlalchemy import text

from app.core.database import SessionLocal, init_db
from app.core.redis import get_redis_client
from app.models import Concert, Seat

DEFAULT_SEAT_COUNT = 1000


def build_seat_code(seat_number: int, seat_count: int) -> str:
    # 좌석 번호를 A/B/C/D 구역으로 나눠 사람이 보기 좋은 좌석 코드로 만든다.
    section_names = ["A", "B", "C", "D"]
    section_size = (seat_count + len(section_names) - 1) // len(section_names)
    section_index = min((seat_number - 1) // section_size, len(section_names) - 1)
    number_in_section = seat_number - (section_index * section_size)
    return f"{section_names[section_index]}-{number_in_section}"


def clear_redis_holds() -> None:
    # 더미 데이터 초기화 시 이전 실험에서 남은 Redis hold도 함께 지운다.
    try:
        client = get_redis_client()
        hold_keys = list(client.scan_iter(match="seat:*:*:hold"))
        if hold_keys:
            client.delete(*hold_keys)
    except RedisError:
        # Redis가 실행 중이 아니면 DB 더미 데이터 초기화만 진행한다.
        return


def reset_dummy_data(seat_count: int = DEFAULT_SEAT_COUNT) -> None:
    # 실험을 같은 조건으로 반복할 수 있도록 기존 데이터를 초기화한다.
    init_db()
    clear_redis_holds()

    db = SessionLocal()
    try:
        db.execute(text("DELETE FROM ticket_requests"))
        db.execute(text("DELETE FROM tickets"))
        db.execute(text("DELETE FROM seats"))
        db.execute(text("DELETE FROM concerts"))
        db.execute(text("ALTER TABLE tickets AUTO_INCREMENT = 1"))
        db.execute(text("ALTER TABLE seats AUTO_INCREMENT = 1"))
        db.execute(text("ALTER TABLE concerts AUTO_INCREMENT = 1"))

        concert = Concert(
            title="대동제",
            venue="HUFS",
            concert_date=datetime(2026, 5, 18, 9, 0, 0),
            total_seats=seat_count,
        )
        # 좌석이 concert_id를 참조할 수 있도록 공연 ID를 먼저 할당받는다.
        db.add(concert)
        db.flush()

        seats = [
            Seat(
                concert_id=concert.concert_id,
                seat_code=build_seat_code(seat_number, seat_count),
                status="AVAILABLE",
            )
            for seat_number in range(1, seat_count + 1)
        ]
        db.add_all(seats)
        db.commit()

        print(
            f"Dummy data completed: concert_id={concert.concert_id}, "
            f"seats={seat_count}"
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    reset_dummy_data()
