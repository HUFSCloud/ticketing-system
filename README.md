# ticketing-system

내한콘서트 티켓팅 시스템 부하 실험 프로젝트입니다.

## 폴더 구조

- `backend`: FastAPI 백엔드 애플리케이션
- `frontend`: 프론트엔드 애플리케이션 자리
- `infra`: 인프라 및 부하 테스트 관련 파일 자리
- `docs`: ERD, API 명세, 백엔드 구조/로직 문서
- `for_work`: 작업 계획, 실행 가이드, 발표 준비 자료

## 현재 백엔드 구현 범위

- FastAPI 서버 실행
- 환경변수 기반 설정 로딩
- MySQL 연결 및 SQLAlchemy 세션 관리
- Redis 좌석 임시 선점
- SQS 메시지 전송 준비
- Lambda worker 처리 로직 준비
- 더미 데이터 생성 및 초기화
- 조건부 UPDATE와 unique constraint 기반 중복 예매 방지

주요 테이블:

- `concerts`
- `seats`
- `tickets`
- `ticket_requests`

## API 목록

최종 예매 흐름에서 사용하는 API:

```text
GET  /health
GET  /concerts
GET  /concerts/{concert_id}/seats
POST /seats/hold
POST /payments/confirm
GET  /requests/{request_id}
```

실험/검증용 API:

```text
POST /tickets/direct
```

## 로컬 실행

### 1. 환경변수 준비

```bash
cp .env.example .env
```

로컬 Docker 기준 기본값:

```env
DB_HOST=db
DB_PORT=3306
DB_NAME=ticketing
DB_USER=root
DB_PASSWORD=root
REDIS_HOST=redis
REDIS_PORT=6379
AWS_REGION=ap-northeast-2
SQS_QUEUE_URL=
```

`SQS_QUEUE_URL`이 비어 있으면 로컬 개발 환경으로 보고 SQS 전송은 생략됩니다.

### 2. 서버 실행

```bash
docker compose up -d --build
```

### 3. 상태 확인

```bash
docker compose ps
```

### 4. 더미 데이터 생성

```bash
docker compose exec backend python -m app.dummy_data
```

정상 출력:

```text
Dummy data completed: concerts=4, seats=16300, details=1:300, 2:1000, 3:5000, 4:10000
```

더미 데이터는 총 4개 공연으로 생성됩니다.

```text
1번 공연: 소규모 공연, 300석
2번 공연: 대동제, 1000석
3번 공연: 아레나 콘서트, 5000석
4번 공연: 스타디움 콘서트, 10000석
```

각 공연의 좌석은 A/B/C/D 구역으로 나뉘고, 모든 좌석은 `AVAILABLE` 상태로 생성됩니다.

## API 확인

FastAPI 문서:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/health
```

공연 목록:

```text
http://localhost:8000/concerts
```

좌석 목록:

```text
http://localhost:8000/concerts/1/seats
```

## 빠른 로컬 테스트 흐름

FastAPI docs에서 아래 순서로 실행합니다.

1. `POST /seats/hold`

```json
{
  "concertId": 1,
  "seatId": 1,
  "userId": "user-001"
}
```

2. `POST /payments/confirm`

```json
{
  "requestId": "req-001",
  "concertId": 1,
  "seatId": 1,
  "userId": "user-001",
  "idempotencyKey": "pay-001"
}
```

로컬에서 `SQS_QUEUE_URL`이 비어 있으면 응답은 `PENDING` 상태로 저장됩니다.

3. `GET /requests/req-001`

결제 확정 요청의 현재 처리 상태를 확인합니다.

## 문서

- [API 명세서](docs/API_SPEC.md)
- [ERD](docs/ERD.md)
- [Backend 폴더 구조](docs/BACKEND_STRUCTURE.md)
- [Backend 핵심 로직](docs/BACKEND_LOGIC.md)

## AWS 배포 시 설정

코드에 RDS, Redis, SQS, ALB DNS를 직접 적지 않습니다. 배포 환경에서 환경변수로 주입합니다.

- `DB_HOST`: RDS 엔드포인트
- `DB_PORT`: MySQL 포트
- `DB_NAME`: DB 이름
- `DB_USER`: DB 사용자
- `DB_PASSWORD`: DB 비밀번호
- `REDIS_HOST`: Redis 엔드포인트
- `REDIS_PORT`: Redis 포트
- `AWS_REGION`: AWS 리전
- `SQS_QUEUE_URL`: SQS 큐 URL

ALB DNS는 코드 설정값이 아니라 프론트엔드, Locust, 브라우저 테스트에서 호출할 Base URL로 사용합니다.

## 종료

```bash
docker compose down
```
