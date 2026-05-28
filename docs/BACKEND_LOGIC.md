# Backend 핵심 로직

작성일: 2026-05-28

## 목적

이 문서는 API 요청/응답 명세가 아니라, 최종 백엔드 내부에서 중복 선점, 중복 예매, 순간 트래픽을 어떻게 처리하는지 설명한다.

## 전체 처리 전략

최종 백엔드는 트래픽 종류에 따라 처리 위치를 분리한다.

```text
조회 요청
→ FastAPI
→ RDS 조회
→ 이후 Redis 캐싱 확장 가능

좌석 선택 요청
→ FastAPI
→ Redis hold

결제 확정 요청
→ FastAPI
→ ticket_requests PENDING 저장
→ SQS 전송
→ Lambda worker
→ RDS 최종 예매 반영
```

역할:

- FastAPI: API 요청 접수와 응답
- Redis: 좌석 임시 선점
- SQS: 결제 확정 요청 버퍼링
- Lambda worker: 최종 예매 처리
- RDS MySQL: 최종 데이터 저장

## 최종 예매 흐름

사용자가 좌석을 선택하고 예매가 확정되는 흐름은 다음과 같다.

```text
1. GET /concerts
   공연 목록 조회

2. GET /concerts/{concert_id}/seats
   좌석 상태 조회

3. POST /seats/hold
   Redis에 좌석 임시 선점

4. POST /payments/confirm
   결제 확정 요청을 PENDING으로 저장하고 SQS에 전송

5. Lambda worker
   SQS 메시지를 읽고 RDS에 최종 예매 반영

6. GET /requests/{request_id}
   프론트가 처리 결과를 조회
```

## RDS 직접 예매 API의 위치

`POST /tickets/direct`는 최종 서비스 흐름의 주 API가 아니라, RDS 직접 처리 성능과 오버부킹 방지를 검증하기 위한 실험용 API이다.

```text
POST /tickets/direct
→ Redis, SQS, Lambda 없이 RDS에 직접 예매 반영
```

최종 서비스 흐름에서는 다음 API 조합을 사용한다.

```text
POST /seats/hold
POST /payments/confirm
GET /requests/{request_id}
```

## 좌석 상태 관리 원칙

DB에는 최종 상태만 저장한다.

```text
AVAILABLE
SOLD
```

Redis에는 임시 상태를 저장한다.

```text
HOLD
```

이렇게 분리한 이유:

- `HOLD`는 시간이 지나면 자동 만료되어야 한다.
- Redis는 TTL을 지원하므로 임시 상태에 적합하다.
- DB는 최종 판매 상태만 저장해야 정합성을 유지하기 쉽다.

좌석 조회 시 상태 판단:

```text
DB status = SOLD
→ SOLD

DB status = AVAILABLE + Redis hold 있음
→ HOLD

DB status = AVAILABLE + Redis hold 없음
→ AVAILABLE
```

## RDS 직접 예매 로직

API:

```text
POST /tickets/direct
```

처리 순서:

```text
1. seats 조건부 UPDATE 실행
2. UPDATE 성공 여부 확인
3. 성공하면 tickets insert
4. commit
5. 실패하면 rollback 후 실패 응답
```

핵심 SQL:

```sql
UPDATE seats
SET status = 'SOLD'
WHERE concert_id = :concert_id
  AND seat_id = :seat_id
  AND status = 'AVAILABLE';
```

성공 판단:

```text
affected rows = 1
→ 예매 성공

affected rows = 0
→ 이미 판매된 좌석 또는 잘못된 좌석
```

이 방식이 필요한 이유:

- `SELECT` 후 `UPDATE` 방식은 동시 요청에서 위험하다.
- 여러 요청이 동시에 `AVAILABLE`을 읽을 수 있기 때문이다.
- 조건부 UPDATE는 DB가 한 번에 검사와 변경을 처리한다.
- 따라서 같은 좌석에는 한 요청만 성공한다.

마지막 방어선:

```text
UNIQUE(concert_id, seat_id)
```

이 제약조건은 어떤 경로로든 같은 공연/좌석 티켓이 두 개 생기는 것을 막는다.

## Redis hold 로직

API:

```text
POST /seats/hold
```

Redis key:

```text
seat:{concert_id}:{seat_id}:hold
```

예시:

```text
seat:1:15:hold
```

처리 방식:

```text
SET key value NX EX 300
```

의미:

```text
NX
→ key가 없을 때만 저장

EX 300
→ 300초 뒤 자동 만료
```

동시 요청 예시:

```text
user-1 -> seat:1:15:hold 생성 성공
user-2 -> 같은 key가 이미 있으므로 실패
user-3 -> 같은 key가 이미 있으므로 실패
```

따라서 많은 사용자가 같은 좌석을 눌러도 Redis 원자 연산으로 한 명만 임시 선점할 수 있다.

주의:

- hold는 최종 예매 성공이 아니다.
- hold는 결제로 넘어가기 위한 임시 선점이다.
- 최종 성공은 Lambda worker가 RDS 조건부 UPDATE로 결정한다.

## 결제 확정 요청 로직

API:

```text
POST /payments/confirm
```

처리 순서:

```text
1. request_id와 idempotency_key 중복 확인
2. 이미 접수된 요청이면 기존 상태 반환
3. 공연/좌석 존재 여부 확인
4. Redis hold 소유자 확인
5. ticket_requests에 PENDING 저장
6. SQS_QUEUE_URL이 있으면 SQS 메시지 전송
7. 클라이언트에 PENDING 응답
```

응답이 `PENDING`인 이유:

- 이 API는 최종 예매 성공을 의미하지 않는다.
- 실제 예매 성공/실패는 Lambda worker가 결정한다.
- 클라이언트는 `GET /requests/{request_id}`로 상태를 확인한다.

SQS를 사용하는 이유:

- 결제 확정 요청이 순간적으로 몰려도 바로 DB에 모두 쓰지 않는다.
- 큐에 쌓아두고 Lambda가 처리한다.
- RDS 커넥션 폭주를 줄일 수 있다.

## 요청 상태 조회 로직

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

상태 의미:

```text
PENDING
→ 요청 접수 완료, 아직 처리 전

PROCESSING
→ Lambda worker가 처리 중

SUCCESS
→ 최종 예매 성공

FAILED
→ 최종 예매 실패
```

## Lambda worker 로직

진입점:

```text
app.lambda_worker.handler.handler
```

SQS 메시지 예시:

```json
{
  "requestId": "req-001",
  "concertId": 1,
  "seatId": 15,
  "userId": "user-001",
  "idempotencyKey": "pay-001"
}
```

처리 순서:

```text
1. SQS 메시지 파싱
2. ticket_requests 조회 또는 생성
3. 상태를 PROCESSING으로 변경
4. Redis hold 소유자 확인
5. hold가 없거나 userId가 다르면 FAILED
6. seats 조건부 UPDATE
7. tickets insert
8. ticket_requests SUCCESS 저장
9. Redis hold 삭제
10. commit
```

실패 처리:

```text
Redis hold 없음
→ FAILED

hold 소유자가 다름
→ FAILED

이미 SOLD
→ FAILED

unique constraint 위반
→ FAILED
```

## 중복 처리 방어 구조

중복 예매는 여러 층에서 막는다.

```text
1차: Redis SET NX EX
같은 좌석 중복 hold 차단

2차: DB 조건부 UPDATE
AVAILABLE 좌석만 SOLD로 변경

3차: UNIQUE(concert_id, seat_id)
같은 좌석 티켓 중복 생성 차단

4차: request_id / idempotency_key unique
SQS 메시지 재처리와 중복 결제 요청 방어
```

## Locust 실험 관점

최종 예매 호출 흐름:

```text
GET /concerts
GET /concerts/1/seats
POST /seats/hold
POST /payments/confirm
GET /requests/{request_id}
```

RDS 직접 예매 실험용 호출 흐름:

```text
GET /concerts
GET /concerts/1/seats
POST /tickets/direct
```

처리량 테스트:

```text
각 사용자에게 다른 seatId 할당
```

오버부킹 테스트:

```text
여러 사용자가 같은 seatId 요청
```

정상 기대 결과:

```text
hold는 한 명만 성공
최종 티켓은 한 개만 생성
나머지는 실패 처리
```

## 현재 구현상 주의점

- 로컬에서 `SQS_QUEUE_URL`이 비어 있으면 SQS 전송은 생략된다.
- 이 경우 `/payments/confirm`은 `PENDING`만 저장한다.
- `SQS_QUEUE_URL`이 있는데 전송에 실패하면 요청 상태를 `FAILED`로 저장한다.
- Lambda worker는 로컬에서 직접 함수 호출로 검증할 수 있다.
- 실제 AWS에서는 SQS queue URL, Lambda 환경변수, RDS/Redis 보안그룹 연결이 필요하다.
