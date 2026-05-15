from pydantic import BaseModel, Field


class SeatSummary(BaseModel):
    # 좌석 상태 조회에서 내려줄 좌석 정보이다.
    seat_id: int = Field(serialization_alias="seatId")
    seat_code: str = Field(serialization_alias="seatCode")
    status: str

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }


class ConcertSeats(BaseModel):
    # 특정 공연의 좌석 목록 응답 데이터이다.
    concert_id: int = Field(serialization_alias="concertId")
    seats: list[SeatSummary]

    model_config = {
        "populate_by_name": True,
    }
