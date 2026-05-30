import { api } from "./client";

// POST /payments/confirm
// 요청: { requestId, concertId, seatId, userId, idempotencyKey }
// 응답: { success, message, data: { requestId, status } }
// status는 PENDING으로 즉시 응답하고, SQS+Lambda가 비동기로 SUCCESS/FAILED 처리한다.
export async function confirmPayment({ requestId, concertId, seatId, userId, idempotencyKey }) {
  const res = await api.post("/payments/confirm", {
    requestId,
    concertId,
    seatId,
    userId,
    idempotencyKey,
  });
  return res.data;
}

// GET /requests/{requestId}
// 응답: { success, data: { requestId, status, message, ticketId } }
// status: PENDING | PROCESSING | SUCCESS | FAILED
// 결과 화면에서 폴링으로 호출한다.
export async function getRequestStatus(requestId) {
  const res = await api.get(`/requests/${requestId}`);
  return res.data;
}
