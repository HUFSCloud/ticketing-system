# ticketing-system

내한콘서트 티켓팅 시스템 부하 실험 프로젝트입니다.

## 시작하는 법

```bash
cp .env.example .env
docker compose up --build
```

브라우저에서 `http://localhost:8000/health`를 확인합니다.

로컬 PC에서 MySQL에 직접 접속할 때는 `localhost:3307`을 사용합니다.

## 폴더 구조

- `backend`: FastAPI 백엔드 애플리케이션
- `frontend`: 프론트엔드 애플리케이션 자리
- `infra/locust`: Locust 부하 테스트 코드 자리
