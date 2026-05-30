# Backend 폴더 구조

작성일: 2026-05-28

## 전체 구조

```text
backend/
  Dockerfile
  requirements.txt
  app/
    main.py
    dummy_data.py
    api/
    core/
    models/
    schemas/
    lambda_worker/
```

## backend/

### `backend/Dockerfile`

FastAPI 백엔드 Docker 이미지를 만드는 파일이다.

역할:

- Python 3.11 slim 이미지 사용
- `requirements.txt` 의존성 설치
- `app.main:app`을 uvicorn으로 실행

### `backend/requirements.txt`

백엔드 Python 의존성 목록이다.

주요 패키지:

- `fastapi`: API 서버
- `uvicorn`: ASGI 서버
- `sqlalchemy`: DB 모델과 세션 관리
- `pymysql`: MySQL 드라이버
- `redis`: Redis 클라이언트
- `boto3`: SQS 전송용 AWS SDK
- `pydantic-settings`: 환경변수 설정 로딩
- `mangum`: Lambda 배포 가능성 대비

## backend/app/

### `backend/app/main.py`

FastAPI 앱 진입점이다.

역할:

- 앱 시작 시 DB 테이블 자동 생성
- API 라우터 등록
- `/health` API 제공

등록 라우터:

```text
concerts_router
seats_router
payments_router
requests_router
tickets_router
```

### `backend/app/dummy_data.py`

로컬/실험용 더미 데이터를 초기화하는 스크립트이다.

실행:

```bash
python -m app.dummy_data
```

생성 데이터:

- 공연 4개
- 좌석 총 16300개
- 공연별 좌석 수 300개, 1000개, 5000개, 10000개
- 공연별 A/B/C/D 구역
- 모든 좌석 `AVAILABLE`

초기화 대상:

```text
Redis hold keys
ticket_requests
tickets
seats
concerts
```

## backend/app/api/

API 라우터를 모아둔다.

### `backend/app/api/concerts.py`

공연/좌석 조회 API를 담당한다.

API:

```text
GET /concerts
GET /concerts/{concert_id}/seats
```

특징:

- 공연 목록과 남은 좌석 수 조회
- 좌석 조회 시 Redis hold가 있으면 `HOLD`로 응답

### `backend/app/api/tickets.py`

RDS 직접 예매 실험용 API를 담당한다.

API:

```text
POST /tickets/direct
```

특징:

- Redis/SQS/Lambda 없이 DB에 직접 예매 반영
- 조건부 UPDATE로 중복 예매 방지

### `backend/app/api/seats.py`

최종 예매 흐름에서 좌석 임시 선점 API를 담당한다.

API:

```text
POST /seats/hold
```

특징:

- Redis `SET NX EX` 사용
- 같은 좌석 중복 hold 차단
- TTL 300초

### `backend/app/api/payments.py`

최종 예매 흐름에서 결제 확정 요청 접수 API를 담당한다.

API:

```text
POST /payments/confirm
```

특징:

- `ticket_requests`에 `PENDING` 저장
- `SQS_QUEUE_URL`이 있으면 SQS 메시지 전송
- SQS가 없으면 로컬 개발용으로 DB 저장까지만 수행

### `backend/app/api/requests.py`

결제 확정 요청 상태 조회 API를 담당한다.

API:

```text
GET /requests/{request_id}
```

상태:

```text
PENDING
PROCESSING
SUCCESS
FAILED
```

### `backend/app/api/__init__.py`

API 라우터를 한 번에 import할 수 있도록 모아둔다.

## backend/app/core/

설정, DB, Redis, SQS 같은 공통 인프라 코드를 둔다.

### `backend/app/core/config.py`

환경변수 기반 설정을 관리한다.

주요 설정:

- DB 접속 정보
- Redis 접속 정보
- AWS region
- SQS queue URL

`database_url` property로 SQLAlchemy용 MySQL 연결 문자열을 만든다.

### `backend/app/core/database.py`

SQLAlchemy DB 연결을 관리한다.

역할:

- `Base` 선언
- DB engine 생성
- `SessionLocal` 생성
- FastAPI dependency용 `get_db()` 제공
- 앱 시작 시 테이블 생성용 `init_db()` 제공
- MySQL 준비 전 앱이 먼저 시작될 수 있어 DB 연결 재시도 포함

### `backend/app/core/redis.py`

Redis hold 관련 공통 함수를 제공한다.

주요 함수:

- `get_redis_client()`
- `build_seat_hold_key()`
- `hold_seat()`
- `get_hold_user()`
- `get_hold_users()`
- `delete_hold()`

Redis key 형식:

```text
seat:{concert_id}:{seat_id}:hold
```

### `backend/app/core/sqs.py`

SQS 메시지 전송을 담당한다.

특징:

- `SQS_QUEUE_URL`이 없으면 실제 전송 생략
- AWS 환경에서는 `boto3`로 SQS 메시지 전송

## backend/app/models/

SQLAlchemy ORM 모델을 둔다.

### `backend/app/models/concert.py`

`concerts` 테이블 모델이다.

저장 데이터:

- 공연명
- 장소
- 공연 일시
- 전체 좌석 수

### `backend/app/models/seat.py`

`seats` 테이블 모델이다.

저장 데이터:

- 좌석 코드
- 최종 좌석 상태

상태:

```text
AVAILABLE
SOLD
```

주의:

- `HOLD`는 DB에 저장하지 않는다.
- `HOLD`는 Redis 임시 상태이다.

### `backend/app/models/ticket.py`

`tickets` 테이블 모델이다.

최종 예매 성공 내역을 저장한다.

중복 방지 제약:

```text
UNIQUE(request_id)
UNIQUE(idempotency_key)
UNIQUE(concert_id, seat_id)
```

### `backend/app/models/ticket_request.py`

`ticket_requests` 테이블 모델이다.

SQS/Lambda 결제 확정 요청 상태를 저장한다.

상태:

```text
PENDING
PROCESSING
SUCCESS
FAILED
```

### `backend/app/models/__init__.py`

모델을 한 번에 import할 수 있도록 모아둔다.

## backend/app/schemas/

Pydantic 요청/응답 스키마를 둔다.

### `backend/app/schemas/common.py`

공통 API 응답 형식 `ApiResponse`를 정의한다.

### `backend/app/schemas/concert.py`

공연 목록 응답 스키마를 정의한다.

### `backend/app/schemas/seat.py`

좌석 목록 응답 스키마를 정의한다.

### `backend/app/schemas/ticket.py`

직접 예매 요청/응답 스키마를 정의한다.

### `backend/app/schemas/hold.py`

좌석 hold 요청/응답 스키마를 정의한다.

### `backend/app/schemas/payment.py`

결제 확정 요청 접수 스키마를 정의한다.

### `backend/app/schemas/request.py`

결제 확정 요청 상태 조회 응답 스키마를 정의한다.

### `backend/app/schemas/__init__.py`

스키마를 한 번에 import할 수 있도록 모아둔다.

## backend/app/lambda_worker/

SQS 메시지를 처리할 Lambda worker 코드를 둔다.

### `backend/app/lambda_worker/handler.py`

SQS 메시지를 받아 최종 예매를 반영하는 처리 골격이다.

역할:

- SQS 메시지 파싱
- `ticket_requests` 상태를 `PROCESSING`으로 변경
- Redis hold 소유자 확인
- DB 조건부 UPDATE
- `tickets` insert
- `ticket_requests`를 `SUCCESS` 또는 `FAILED`로 변경
- Redis hold 삭제

AWS Lambda에 연결할 진입점:

```text
app.lambda_worker.handler.handler
```
