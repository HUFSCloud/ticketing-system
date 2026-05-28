from pydantic import BaseModel, Field


class SeatHoldRequest(BaseModel):
    # 좌석 임시 선점 API 요청 데이터이다.
    concert_id: int = Field(validation_alias="concertId")
    seat_id: int = Field(validation_alias="seatId")
    user_id: str = Field(validation_alias="userId")

    model_config = {
        "populate_by_name": True,
    }


class SeatHoldData(BaseModel):
    # 좌석 임시 선점 성공 시 내려줄 데이터이다.
    concert_id: int = Field(serialization_alias="concertId")
    seat_id: int = Field(serialization_alias="seatId")
    hold_ttl_seconds: int = Field(serialization_alias="holdTtlSeconds")

    model_config = {
        "populate_by_name": True,
    }


class SeatHoldResponse(BaseModel):
    # 좌석 임시 선점 API의 성공/실패 응답 형식이다.
    success: bool
    message: str
    data: SeatHoldData | None = None
