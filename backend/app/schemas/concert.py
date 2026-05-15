from datetime import datetime

from pydantic import BaseModel, Field


class ConcertSummary(BaseModel):
    # 공연 목록 조회에서 내려줄 공연 요약 정보이다.
    concert_id: int = Field(serialization_alias="concertId")
    title: str
    venue: str
    concert_date: datetime = Field(serialization_alias="concertDate")
    total_seats: int = Field(serialization_alias="totalSeats")
    remaining_seats: int = Field(serialization_alias="remainingSeats")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
