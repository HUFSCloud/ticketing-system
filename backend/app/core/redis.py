import json
from datetime import datetime, timezone

from redis import Redis

from app.core.config import get_settings

settings = get_settings()

HOLD_TTL_SECONDS = 300


def get_redis_client() -> Redis:
    # 환경변수 기반 Redis 클라이언트를 생성한다.
    return Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        decode_responses=True,
    )


def build_seat_hold_key(concert_id: int, seat_id: int) -> str:
    # 좌석 임시 선점 정보를 저장할 Redis key를 만든다.
    return f"seat:{concert_id}:{seat_id}:hold"


def hold_seat(concert_id: int, seat_id: int, user_id: str) -> bool:
    # Redis SET NX EX로 같은 좌석을 한 사용자만 임시 선점하게 한다.
    client = get_redis_client()
    key = build_seat_hold_key(concert_id, seat_id)
    value = json.dumps(
        {
            "userId": user_id,
            "createdAt": datetime.now(timezone.utc).isoformat(),
        }
    )
    return bool(client.set(key, value, nx=True, ex=HOLD_TTL_SECONDS))


def get_hold_user(concert_id: int, seat_id: int) -> str | None:
    # Redis hold 값이 있으면 소유자 userId를 반환한다.
    client = get_redis_client()
    raw_value = client.get(build_seat_hold_key(concert_id, seat_id))
    if raw_value is None:
        return None

    data = json.loads(raw_value)
    return data.get("userId")


def get_hold_users(concert_id: int, seat_ids: list[int]) -> dict[int, str]:
    # 여러 좌석의 hold 상태를 한 번에 조회한다.
    if not seat_ids:
        return {}

    client = get_redis_client()
    keys = [build_seat_hold_key(concert_id, seat_id) for seat_id in seat_ids]
    values = client.mget(keys)

    hold_users: dict[int, str] = {}
    for seat_id, raw_value in zip(seat_ids, values, strict=True):
        if raw_value is None:
            continue
        data = json.loads(raw_value)
        user_id = data.get("userId")
        if user_id:
            hold_users[seat_id] = user_id

    return hold_users


def delete_hold(concert_id: int, seat_id: int) -> None:
    # 최종 예매 처리 후 Redis hold를 삭제한다.
    client = get_redis_client()
    client.delete(build_seat_hold_key(concert_id, seat_id))


# ---------- 좌석 목록 캐시 ----------

SEATS_CACHE_TTL_SECONDS = 3


def build_seats_cache_key(concert_id: int) -> str:
    # 공연별 좌석 목록 캐시 Redis key를 만든다.
    return f"seats:cache:{concert_id}"


def get_seats_cache(concert_id: int) -> list[dict] | None:
    # 캐시된 좌석 목록을 조회한다. 캐시가 없거나 Redis 장애 시 None을 반환한다.
    client = get_redis_client()
    raw = client.get(build_seats_cache_key(concert_id))
    if raw is None:
        return None
    return json.loads(raw)


def set_seats_cache(concert_id: int, seats_data: list[dict]) -> None:
    # DB에서 조회한 좌석 목록을 Redis에 캐시한다.
    client = get_redis_client()
    client.setex(
        build_seats_cache_key(concert_id),
        SEATS_CACHE_TTL_SECONDS,
        json.dumps(seats_data),
    )


def invalidate_seats_cache(concert_id: int) -> None:
    # 좌석 상태가 변경되면 캐시를 즉시 삭제한다.
    client = get_redis_client()
    client.delete(build_seats_cache_key(concert_id))
