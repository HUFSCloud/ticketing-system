from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class TicketRequest(Base):
    # 결제 확정 요청의 처리 상태를 저장하는 테이블
    __tablename__ = "ticket_requests"
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_request_idempotency"),
    )

    request_id: Mapped[str] = mapped_column(String(100), primary_key=True)
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=False)
    concert_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("concerts.concert_id"),
        nullable=False,
    )
    seat_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("seats.seat_id"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    message: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ticket_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("tickets.ticket_id"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
