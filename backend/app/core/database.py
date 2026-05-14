from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


class Base(DeclarativeBase):
    # 모든 SQLAlchemy 모델이 상속할 기본 클래스
    pass


# 환경변수에서 만든 DB 연결 문자열로 MySQL 연결 엔진을 생성한다.
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=3600,
)

# 요청마다 독립적인 DB 세션을 만들기 위한 세션 팩토리이다.
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    # FastAPI dependency에서 사용할 DB 세션을 만들고 요청 처리 후 닫는다.
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
