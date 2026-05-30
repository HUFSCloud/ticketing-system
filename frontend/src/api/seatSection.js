// 좌석 등급/가격 매핑.
// 백엔드는 seat_code 문자열만 주고 가격 필드가 없어서, 프론트에서 seat_code 앞 문자로 추론한다.
// dummy_data.py 기준: 좌석 구역 A/B/C/D 250개씩, seat_code는 "A-1", "B-1" 같은 형태.
//
// 매핑 (팀 합의 후 조정):
//   A-* → VIP석 (170,000원)
//   B-* → R석   (130,000원)
//   C-* → S석   ( 99,000원)
//   D-* → A석   ( 77,000원)

export const SECTION_MAP = {
  A: { name: "VIP", price: 170000, color: "#ef4444" },
  B: { name: "R",   price: 130000, color: "#f97316" },
  C: { name: "S",   price:  99000, color: "#22c55e" },
  D: { name: "A",   price:  77000, color: "#3b82f6" },
};

export const DEFAULT_SECTION = {
  name: "기타", price: 0, color: "#94a3b8",
};

// "A-12" -> { code: "A-12", section: "A", number: 12, ...SECTION_MAP["A"] }
export function parseSeatCode(seatCode) {
  const [letter, numberStr] = (seatCode || "").split("-");
  const meta = SECTION_MAP[letter] || DEFAULT_SECTION;
  return {
    code: seatCode,
    letter,
    number: Number(numberStr) || 0,
    ...meta,
  };
}

// 가격 포맷
export const fmtPrice = (n) =>
  n === 0 ? "무료" : `${n.toLocaleString("ko-KR")}원`;
