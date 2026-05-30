import { api } from "./client";

// GET /concerts/{id}/seats
// 응답: { success, data: { concertId, seats: [{ seatId, seatCode, status }] } }
// status: AVAILABLE | HOLD | SOLD
export async function getSeats(concertId) {
  const res = await api.get(`/concerts/${concertId}/seats`);
  return res.data; // { concertId, seats }
}

// POST /seats/hold
// 요청: { concertId, seatId, userId }
// 응답: { success, message, data: { concertId, seatId, holdTtlSeconds } }
// 한 번에 한 좌석씩만 hold 가능. 여러 좌석은 순차적으로 호출해야 한다.
export async function holdSeat({ concertId, seatId, userId }) {
  const res = await api.post("/seats/hold", { concertId, seatId, userId });
  return res.data;
}
