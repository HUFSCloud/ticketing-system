# ticketing-system

내한콘서트 티켓팅 시스템 부하 실험 프로젝트입니다.

## 폴더 구조

- `backend`: FastAPI 백엔드 애플리케이션
- `frontend`: 프론트엔드 애플리케이션 자리
- `infra/locust`: Locust 부하 테스트 코드 자리

## 현재 구현 범위

현재 구현된 범위는 다음과 같습니다.

- FastAPI 서버 실행
- 환경변수 기반 설정 로딩
- MySQL 연결 설정
- SQLAlchemy 모델 정의
  - `concerts`
  - `seats`
  - `tickets`
- 서버 시작 시 테이블 자동 생성
- 공연 목록 조회 API
- 좌석 목록 조회 API
- 0단계 직접 예매 API
- 더미 데이터 생성 스크립트
- 조건부 UPDATE 기반 중복 예매 방지

현재 백엔드는 0단계 실험용 최소 API를 제공합니다.

```text
GET  /health
GET  /concerts
GET  /concerts/{concert_id}/seats
POST /tickets/direct
```

## 로컬 테스트 방법

### 최초 1회 실행

```bash
cp .env.example .env
```

### 1. 서버 실행

```bash
docker compose up -d --build
```

### 2. 상태 확인

```bash
docker compose ps
```

### 3. 더미 데이터 삽입

```bash
docker compose exec backend python -m app.dummy_data
```

정상 출력:

```text
Dummy data completed: concert_id=1, seats=1000
```

### 4. API 확인

Health check:

```text
http://localhost:8000/health
```

API 문서:

```text
http://localhost:8000/docs
```

공연 목록:

```text
http://localhost:8000/concerts
```

좌석 목록:

```text
http://localhost:8000/concerts/1/seats
```

### FastAPI docs에서 직접 예매 테스트

FastAPI docs에 접속합니다.

```text
http://localhost:8000/docs
```

직접 예매 첫 번째 요청:

1. `POST /tickets/direct` 항목을 클릭합니다.
2. `Try it out` 버튼을 클릭합니다.
3. Request body에 아래 값을 입력합니다.

```json
{
  "concertId": 1,
  "seatId": 1,
  "userId": "user-001"
}
```

4. `Execute` 버튼을 클릭합니다.

첫 번째 요청은 성공해야 합니다.

```json
{
  "success": true,
  "message": "예매 성공",
  "data": {
    "ticketId": 1
  }
}
```

직접 예매 두 번째 요청:

같은 `seatId`로 `userId`만 바꿔 다시 실행합니다.

```json
{
  "concertId": 1,
  "seatId": 1,
  "userId": "user-002"
}
```

두 번째 요청은 실패해야 합니다.

```json
{
  "success": false,
  "message": "이미 판매된 좌석입니다.",
  "data": null
}
```

### 다시 테스트하고 싶을 때

DB 데이터를 초기화하고 다시 넣습니다.

```bash
docker compose exec backend python -m app.dummy_data
```

### 종료

```bash
docker compose down
```
