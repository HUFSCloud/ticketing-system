from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Seat(Base):
    # 좌석의 최종 판매 상태를 저장하는 테이블
    __tablename__ = "seats"
    __table_args__ = (
        UniqueConstraint("concert_id", "seat_code", name="uq_concert_seat_code"),
    )

    seat_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    concert_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("concerts.concert_id"),
        nullable=False,
    )
    seat_code: Mapped[str] = mapped_column(String(20), nullable=False)

    # RDS에는 최종 판매 상태만 저장하고, 임시 선점 상태는 Redis에 저장한다.
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="AVAILABLE")
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    concert = relationship("Concert", back_populates="seats")
    tickets = relationship("Ticket", back_populates="seat")
