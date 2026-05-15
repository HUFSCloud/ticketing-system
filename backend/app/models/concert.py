from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Concert(Base):
    # 공연 기본 정보를 저장하는 테이블
    __tablename__ = "concerts"

    concert_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    venue: Mapped[str] = mapped_column(String(100), nullable=False)
    concert_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    total_seats: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    # 하나의 공연은 여러 좌석과 여러 티켓을 가진다.
    seats = relationship("Seat", back_populates="concert")
    tickets = relationship("Ticket", back_populates="concert")
