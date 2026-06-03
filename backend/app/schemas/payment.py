from pydantic import BaseModel, Field


class PaymentConfirmRequest(BaseModel):
    # 결제 확정 요청 접수 API 요청 데이터이다.
    request_id: str = Field(validation_alias="requestId")
    concert_id: int = Field(validation_alias="concertId")
    seat_id: int = Field(validation_alias="seatId")
    user_id: str = Field(validation_alias="userId")
    idempotency_key: str = Field(validation_alias="idempotencyKey")

    model_config = {
        "populate_by_name": True,
    }


class PaymentConfirmData(BaseModel):
    # 결제 확정 요청 접수 후 내려줄 상태 데이터이다.
    request_id: str = Field(serialization_alias="requestId")
    status: str

    model_config = {
        "populate_by_name": True,
    }


class PaymentConfirmResponse(BaseModel):
    # 결제 확정 요청 접수 API의 응답 형식이다.
    success: bool
    message: str
    data: PaymentConfirmData | None = None
