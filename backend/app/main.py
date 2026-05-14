from fastapi import FastAPI

from app.core.config import get_settings

# 시작 시 환경변수 기반 설정을 로드한다.
settings = get_settings()

app = FastAPI(title="Ticketing System API")


@app.get("/health")
def health():
    return {"status": "ok"}
