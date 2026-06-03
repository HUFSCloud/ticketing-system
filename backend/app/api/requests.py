from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import TicketRequest
from app.schemas import ApiResponse, TicketRequestStatusData

router = APIRouter(tags=["requests"])


@router.get(
    "/requests/{request_id}",
    response_model=ApiResponse[TicketRequestStatusData],
)
def get_ticket_request_status(
    request_id: str,
    db: Session = Depends(get_db),
):
    # request_id 기준으로 결제 확정 요청 처리 상태를 조회한다.
    ticket_request = db.get(TicketRequest, request_id)
    if ticket_request is None:
        raise HTTPException(status_code=404, detail="요청을 찾을 수 없습니다.")

    return ApiResponse(
        success=True,
        data=TicketRequestStatusData(
            request_id=ticket_request.request_id,
            status=ticket_request.status,
            message=ticket_request.message,
            ticket_id=ticket_request.ticket_id,
        ),
    )
