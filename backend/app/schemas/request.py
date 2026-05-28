from pydantic import BaseModel, Field


class TicketRequestStatusData(BaseModel):
    # 결제 확정 요청 상태 조회 응답 데이터이다.
    request_id: str = Field(serialization_alias="requestId")
    status: str
    message: str | None = None
    ticket_id: int | None = Field(default=None, serialization_alias="ticketId")

    model_config = {
        "populate_by_name": True,
    }
