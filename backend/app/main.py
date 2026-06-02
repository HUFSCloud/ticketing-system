import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

# 애플리케이션 로거가 콘솔에 출력되도록 기본 로그 레벨을 설정한다.
logging.basicConfig(level=logging.INFO)

from app.api import (
    concerts_router,
    payments_router,
    requests_router,
    seats_router,
    tickets_router,
)
from app.core.config import get_settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 SQLAlchemy 모델 기준으로 필요한 테이블을 생성한다.
    init_db()
    yield

# 시작 시 환경변수 기반 설정을 로드한다.
settings = get_settings()

# FastAPI 앱을 생성하고 API 라우터를 등록한다.
app = FastAPI(title="Ticketing System API", lifespan=lifespan)
app.include_router(concerts_router)
app.include_router(seats_router)
app.include_router(payments_router)
app.include_router(requests_router)
app.include_router(tickets_router)

# 헬스체크 API이다. 서버가 정상적으로 실행 중인지 확인할 때 사용한다.
@app.get("/health")
def health():
    return {"status": "ok"}
