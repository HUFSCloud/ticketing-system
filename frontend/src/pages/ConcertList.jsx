import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function getStatus(remaining) {
  if (remaining === 0) return { text: "매진", className: "badge--sold" };
  return { text: "예매중", className: "badge--on-sale" };
}

const THUMB_COLORS = [
  ["#6366f1", "#8b5cf6"],
  ["#0ea5e9", "#6366f1"],
  ["#f59e0b", "#ef4444"],
  ["#10b981", "#0ea5e9"],
  ["#ec4899", "#f97316"],
];

function Thumbnail({ index, title }) {
  const [from, to] = THUMB_COLORS[index % THUMB_COLORS.length];
  return (
    <div
      className="concert-thumb"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      <span className="concert-thumb__text">{title.slice(0, 2)}</span>
    </div>
  );
}

function ConcertCard({ concert, index }) {
  const navigate = useNavigate();
  const status = getStatus(concert.remainingSeats);
  const soldOut = concert.remainingSeats === 0;

  return (
    <div className="concert-card" onClick={() => !soldOut && navigate(`/concerts/${concert.concertId}/seats`)}>
      <Thumbnail index={index} title={concert.title} />
      <div className="concert-card__body">
        <div className="concert-card__top">
          <h2 className="concert-card__title">{concert.title}</h2>
          <span className={`badge ${status.className}`}>{status.text}</span>
        </div>
        <div className="concert-card__meta">
          <span>🗓 {formatDate(concert.concertDate)} {formatTime(concert.concertDate)}</span>
          <span>📍 {concert.venue}</span>
          <span>🎟 잔여 {concert.remainingSeats.toLocaleString()} / {concert.totalSeats.toLocaleString()}석</span>
        </div>
      </div>
      <button
        className={`book-btn${soldOut ? " book-btn--disabled" : ""}`}
        disabled={soldOut}
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/concerts/${concert.concertId}/seats`);
        }}
      >
        {soldOut ? "매진" : "예매하기"}
      </button>
    </div>
  );
}

export default function ConcertList() {
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/concerts")
      .then((res) => {
        if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
        return res.json();
      })
      .then((json) => setConcerts(json.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__logo">HUFS <span>티켓</span></h1>
        <p className="page-header__subtitle">원하는 공연을 선택하세요</p>
      </header>
      <main>
        {loading && <p className="status-msg">불러오는 중...</p>}
        {error && <p className="status-msg status-msg--error">오류: {error}</p>}
        {!loading && !error && concerts.length === 0 && (
          <p className="status-msg">등록된 공연이 없습니다.</p>
        )}
        {!loading && !error && concerts.length > 0 && (
          <div className="concert-list">
            {concerts.map((c, i) => (
              <ConcertCard key={c.concertId} concert={c} index={i} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
