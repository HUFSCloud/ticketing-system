# API 명세서

작성일: 2026-05-28

## 범위

최종 백엔드 API 명세이다. 실제 예매 흐름은 Redis hold, SQS, Lambda worker, RDS 확정 처리를 기준으로 한다.

Base URL:

```text
http://localhost:8000
```

## API 목록

최종 예매 흐름:

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

## 1. Health Check

### `GET /health`

Response:

```json
{
  "status": "ok"
}
```

## 2. 공연 목록 조회

### `GET /concerts`

Response:

```json
{
  "success": true,
  "data": [
    {
      "concertId": 1,
      "title": "소규모 공연",
      "venue": "HUFS 소극장",
      "concertDate": "2026-05-17T18:00:00",
      "totalSeats": 300,
      "remainingSeats": 300
    },
    {
      "concertId": 2,
      "title": "대동제",
      "venue": "HUFS",
      "concertDate": "2026-05-18T09:00:00",
      "totalSeats": 1000,
      "remainingSeats": 1000
    },
    {
      "concertId": 3,
      "title": "아레나 콘서트",
      "venue": "KSPO DOME",
      "concertDate": "2026-05-19T19:00:00",
      "totalSeats": 5000,
      "remainingSeats": 5000
    },
    {
      "concertId": 4,
      "title": "스타디움 콘서트",
      "venue": "Seoul Stadium",
      "concertDate": "2026-05-20T19:00:00",
      "totalSeats": 10000,
      "remainingSeats": 10000
    }
  ]
}
```

## 3. 좌석 목록 조회

### `GET /concerts/{concert_id}/seats`

DB의 `SOLD`와 Redis의 hold 상태를 조합해 반환한다.

Success response:

```json
{
  "success": true,
  "data": {
    "concertId": 1,
    "seats": [
      {
        "seatId": 1,
        "seatCode": "A-1",
        "status": "AVAILABLE"
      },
      {
        "seatId": 2,
        "seatCode": "A-2",
        "status": "HOLD"
      },
      {
        "seatId": 3,
        "seatCode": "A-3",
        "status": "SOLD"
      }
    ]
  }
}
```

## 4. RDS 직접 예매 실험용 API

### `POST /tickets/direct`

Redis, SQS, Lambda 없이 DB에 직접 예매를 반영하는 실험용 API이다.

Request:

```json
{
  "concertId": 1,
  "seatId": 1,
  "userId": "user-001"
}
```

Success response:

```json
{
  "success": true,
  "message": "예매 성공",
  "data": {
    "ticketId": 1
  }
}
```

Failure response examples:

```json
{
  "success": false,
  "message": "이미 판매된 좌석입니다.",
  "data": null
}
```

직접 예매는 조건부 UPDATE로 처리한다.

```sql
UPDATE seats
SET status = 'SOLD'
WHERE concert_id = :concert_id
  AND seat_id = :seat_id
  AND status = 'AVAILABLE';
```

## 5. 좌석 임시 선점

### `POST /seats/hold`

Redis `SET NX EX`로 좌석을 300초 동안 임시 선점한다.

Request:

```json
{
  "concertId": 1,
  "seatId": 1,
  "userId": "user-001"
}
```

Success response:

```json
{
  "success": true,
  "message": "좌석이 임시 선점되었습니다.",
  "data": {
    "concertId": 1,
    "seatId": 1,
    "holdTtlSeconds": 300
  }
}
```

Failure response examples:

```json
{
  "success": false,
  "message": "이미 선택 중인 좌석입니다.",
  "data": null
}
```

```json
{
  "success": false,
  "message": "이미 판매된 좌석입니다.",
  "data": null
}
```

## 6. 결제 확정 요청 접수

### `POST /payments/confirm`

결제 성공 이벤트를 `ticket_requests`에 `PENDING`으로 저장하고, `SQS_QUEUE_URL`이 있으면 SQS로 전송한다. 결제 확정 요청은 좌석 hold를 생성한 사용자만 접수할 수 있다.

Request:

```json
{
  "requestId": "req-001",
  "concertId": 1,
  "seatId": 1,
  "userId": "user-001",
  "idempotencyKey": "pay-001"
}
```

Response:

```json
{
  "success": true,
  "message": "결제 확정 요청이 접수되었습니다.",
  "data": {
    "requestId": "req-001",
    "status": "PENDING"
  }
}
```

Failure response examples:

```json
{
  "success": false,
  "message": "좌석 임시 선점 정보가 유효하지 않습니다.",
  "data": null
}
```

```json
{
  "success": false,
  "message": "이미 판매된 좌석입니다.",
  "data": null
}
```

```json
{
  "success": false,
  "message": "SQS 전송에 실패했습니다.",
  "data": {
    "requestId": "req-001",
    "status": "FAILED"
  }
}
```

## 7. 요청 상태 조회

### `GET /requests/{request_id}`

결제 확정 요청의 처리 상태를 조회한다.

Response:

```json
{
  "success": true,
  "data": {
    "requestId": "req-001",
    "status": "SUCCESS",
    "message": "예매가 확정되었습니다.",
    "ticketId": 1
  }
}
```

상태:

```text
PENDING
PROCESSING
SUCCESS
FAILED
```

## 더미 데이터

```bash
docker compose exec backend python -m app.dummy_data
```

생성 데이터:

```text
1번 공연: 소규모 공연, 300석
2번 공연: 대동제, 1000석
3번 공연: 아레나 콘서트, 5000석
4번 공연: 스타디움 콘서트, 10000석
좌석 구역: 공연별 A/B/C/D 구역
```
