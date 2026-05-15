from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import concerts_router
from app.core.config import get_settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 SQLAlchemy 모델 기준으로 필요한 테이블을 생성한다.
    init_db()
    yield

# 시작 시 환경변수 기반 설정을 로드한다.
settings = get_settings()

app = FastAPI(title="Ticketing System API", lifespan=lifespan)
app.include_router(concerts_router)


@app.get("/health")
def health():
    return {"status": "ok"}
