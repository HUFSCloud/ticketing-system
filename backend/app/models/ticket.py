from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Ticket(Base):
    # 최종 예매 성공 내역을 저장하는 테이블
    __tablename__ = "tickets"
    __table_args__ = (
        UniqueConstraint("request_id", name="uq_ticket_request"),
        UniqueConstraint("idempotency_key", name="uq_ticket_idempotency"),
        UniqueConstraint("concert_id", "seat_id", name="uq_ticket_seat"),
    )

    ticket_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # 0~1단계 직접 예매에서는 임시 값을 넣고, SQS 단계부터 실제 request/idempotency 값을 사용한다.
    request_id: Mapped[str] = mapped_column(String(100), nullable=False)
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
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    concert = relationship("Concert", back_populates="tickets")
    seat = relationship("Seat", back_populates="tickets")
