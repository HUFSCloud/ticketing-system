# API 명세서

수정일: 2026-05-15

Base URL:

```text
http://localhost:8000
```

## API 목록

```text
GET  /health
GET  /concerts
GET  /concerts/{concert_id}/seats
POST /tickets/direct
```

## 1. Health Check

### `GET /health`

서버 상태 확인용 API이다.

Response:

```json
{
  "status": "ok"
}
```

## 2. 공연 목록 조회

### `GET /concerts`

공연 목록과 남은 좌석 수를 조회한다.

Response:

```json
{
  "success": true,
  "data": [
    {
      "concertId": 1,
      "title": "대동제",
      "venue": "HUFS",
      "concertDate": "2026-05-18T09:00:00",
      "totalSeats": 1000,
      "remainingSeats": 1000
    }
  ]
}
```

## 3. 좌석 목록 조회

### `GET /concerts/{concert_id}/seats`

특정 공연의 좌석 목록과 좌석 상태를 조회한다.

Path parameter:

| 이름       | 타입 | 설명    |
| ---------- | ---- | ------- |
| concert_id | int  | 공연 ID |

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
        "seatId": 251,
        "seatCode": "B-1",
        "status": "AVAILABLE"
      }
    ]
  }
}
```

Not found:

```json
{
  "detail": "공연을 찾을 수 없습니다."
}
```

## 4. 직접 예매

### `POST /tickets/direct`

Redis, SQS, Lambda 없이 DB에 직접 예매를 반영하는 0~1단계 실험용 API이다.

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

Failure responses:

```json
{
  "success": false,
  "message": "공연을 찾을 수 없습니다.",
  "data": null
}
```

```json
{
  "success": false,
  "message": "좌석을 찾을 수 없습니다.",
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

## 직접 예매 처리 규칙

예매는 조건부 UPDATE로 처리한다.

```sql
UPDATE seats
SET status = 'SOLD'
WHERE concert_id = :concert_id
  AND seat_id = :seat_id
  AND status = 'AVAILABLE';
```

판단 기준:

```text
affected rows = 1 -> 예매 성공
affected rows = 0 -> 예매 실패
```

`tickets` 테이블의 `UNIQUE(concert_id, seat_id)`도 중복 예매를 막는 방어선으로 사용한다.

## 더미 데이터

로컬 테스트용 더미 데이터 생성:

```bash
docker compose exec backend python -m app.dummy_data
```

생성 데이터:

```text
공연명: 대동제
장소: HUFS
일시: 2026-05-18 09:00:00
좌석: 1000개
좌석 구역: A/B/C/D 각 250개
```
