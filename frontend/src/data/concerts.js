// GET /concerts 응답 형식과 동일한 구조로 작성 (API 연동 시 그대로 교체 가능)
// price 필드는 mock 전용 — 실제 API에는 없음
export const mockConcerts = [
  {
    concertId: 1,
    title: "대동제",
    artist: "HUFS 아티스트",
    venue: "HUFS 대운동장",
    concertDate: "2026-05-18T09:00:00",
    totalSeats: 1000,
    remainingSeats: 847,
    price: 0,
  },
  {
    concertId: 2,
    title: "봄 콘서트",
    artist: "밴드 하나",
    venue: "서울 올림픽 공원",
    concertDate: "2026-06-01T18:00:00",
    totalSeats: 500,
    remainingSeats: 123,
    price: 55000,
  },
  {
    concertId: 3,
    title: "여름 페스티벌",
    artist: "DJ 투",
    venue: "인천 아시아드 경기장",
    concertDate: "2026-07-20T17:00:00",
    totalSeats: 2000,
    remainingSeats: 1560,
    price: 88000,
  },
  {
    concertId: 4,
    title: "재즈 나이트",
    artist: "재즈 트리오",
    venue: "홍대 클럽",
    concertDate: "2026-06-15T20:00:00",
    totalSeats: 200,
    remainingSeats: 12,
    price: 33000,
  },
];
