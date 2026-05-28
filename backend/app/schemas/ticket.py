from pydantic import BaseModel, Field


class DirectTicketRequest(BaseModel):
    # RDS 직접 예매 실험용 API 요청 데이터이다.
    concert_id: int = Field(validation_alias="concertId")
    seat_id: int = Field(validation_alias="seatId")
    user_id: str = Field(validation_alias="userId")

    model_config = {
        "populate_by_name": True,
    }


class DirectTicketData(BaseModel):
    # 직접 예매 성공 시 내려줄 티켓 데이터이다.
    ticket_id: int = Field(serialization_alias="ticketId")

    model_config = {
        "populate_by_name": True,
    }


class DirectTicketResponse(BaseModel):
    # 직접 예매 API의 성공/실패 응답 형식이다.
    success: bool
    message: str
    data: DirectTicketData | None = None
