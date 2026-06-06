import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const USER_ID = "demo-user";

function groupBySection(seats) {
  return seats.reduce((acc, seat) => {
    const section = seat.seatCode.split("-")[0];
    if (!acc[section]) acc[section] = [];
    acc[section].push(seat);
    return acc;
  }, {});
}

function SeatButton({ seat, selected, onClick }) {
  const isAvailable = seat.status === "AVAILABLE";
  const isSold = seat.status === "SOLD";

  let cls = "seat";
  if (isSold) cls += " seat--sold";
  else if (selected) cls += " seat--selected";
  else cls += " seat--available";

  return (
    <button
      className={cls}
      disabled={!isAvailable}
      onClick={() => isAvailable && onClick(seat)}
      title={seat.seatCode}
    >
      {seat.seatCode.split("-")[1]}
    </button>
  );
}

export default function SeatSelection() {
  const { concertId } = useParams();
  const navigate = useNavigate();

  const [seats, setSeats] = useState([]);
  const [concert, setConcert] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/concerts").then((r) => r.json()),
      fetch(`/api/concerts/${concertId}/seats`).then((r) => r.json()),
    ])
      .then(([concertsJson, seatsJson]) => {
        const found = concertsJson.data?.find(
          (c) => c.concertId === Number(concertId)
        );
        setConcert(found ?? null);
        setSeats(seatsJson.data?.seats ?? []);
      })
      .catch(() => setError("데이터를 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [concertId]);

  async function handleBook() {
    if (!selected) return;
    setBooking(true);
    try {
      const res = await fetch("/api/tickets/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concertId: Number(concertId),
          seatId: selected.seatId,
          userId: USER_ID,
        }),
      });
      const json = await res.json();
      navigate("/result", {
        state: {
          success: json.success,
          message: json.message,
          ticketId: json.data?.ticketId,
          concertTitle: concert?.title,
          seatCode: selected.seatCode,
        },
      });
    } catch {
      navigate("/result", {
        state: { success: false, message: "네트워크 오류가 발생했습니다." },
      });
    }
  }

  const sections = groupBySection(seats);
  const available = seats.filter((s) => s.status === "AVAILABLE").length;

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate("/concerts")}>
          ← 공연 목록
        </button>
        <h1 className="page-header__logo">
          HUFS <span>티켓</span>
        </h1>
        {concert && (
          <p className="page-header__subtitle">
            {concert.title} · {concert.venue} · 잔여 {available.toLocaleString()}석
          </p>
        )}
      </header>

      {loading && <p className="status-msg">좌석 정보 불러오는 중...</p>}
      {error && <p className="status-msg status-msg--error">{error}</p>}

      {!loading && !error && (
        <div className="seat-layout">
          <div className="stage">STAGE</div>

          <div className="seat-sections">
            {Object.entries(sections).map(([section, sectionSeats]) => (
              <div key={section} className="seat-section">
                <div className="seat-section__label">{section}구역</div>
                <div className="seat-grid">
                  {sectionSeats.map((seat) => (
                    <SeatButton
                      key={seat.seatId}
                      seat={seat}
                      selected={selected?.seatId === seat.seatId}
                      onClick={setSelected}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="seat-legend">
            <span><span className="legend-dot legend-dot--available" /> 예매 가능</span>
            <span><span className="legend-dot legend-dot--selected" /> 선택됨</span>
            <span><span className="legend-dot legend-dot--sold" /> 매진</span>
          </div>

          <div className="booking-bar">
            <span className="booking-bar__info">
              {selected ? `선택: ${selected.seatCode}` : "좌석을 선택하세요"}
            </span>
            <button
              className={`book-btn${!selected || booking ? " book-btn--disabled" : ""}`}
              disabled={!selected || booking}
              onClick={handleBook}
            >
              {booking ? "처리 중..." : "예매하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
