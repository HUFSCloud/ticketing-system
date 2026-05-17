import { useNavigate } from "react-router-dom";
import { mockConcerts } from "../data/concerts";

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price) {
  return price === 0 ? "무료" : `${price.toLocaleString("ko-KR")}원`;
}

function remainingLabel(remaining, total) {
  const ratio = remaining / total;
  if (remaining === 0) return { text: "매진", color: "#ef4444" };
  if (ratio < 0.1) return { text: `잔여 ${remaining}석`, color: "#f97316" };
  return { text: `잔여 ${remaining}석`, color: "#22c55e" };
}

function ConcertCard({ concert }) {
  const navigate = useNavigate();
  const label = remainingLabel(concert.remainingSeats, concert.totalSeats);
  const soldOut = concert.remainingSeats === 0;

  return (
    <div className="concert-card">
      <div className="concert-card__header">
        <span className="concert-card__title">{concert.title}</span>
        <span className="concert-card__remaining" style={{ color: label.color }}>
          {label.text}
        </span>
      </div>
      <p className="concert-card__artist">{concert.artist}</p>
      <div className="concert-card__info">
        <span>📅 {formatDate(concert.concertDate)}</span>
        <span>📍 {concert.venue}</span>
        <span>🎟 총 {concert.totalSeats.toLocaleString()}석</span>
        <span>💰 {formatPrice(concert.price)}</span>
      </div>
      <button
        className={`concert-card__btn${soldOut ? " concert-card__btn--disabled" : ""}`}
        disabled={soldOut}
        onClick={() => navigate(`/concerts/${concert.concertId}/seats`)}
      >
        {soldOut ? "매진" : "좌석 선택"}
      </button>
    </div>
  );
}

export default function ConcertList() {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">🎵 공연 목록</h1>
        <p className="page-header__subtitle">원하는 공연을 선택하세요</p>
      </header>
      <main className="concert-grid">
        {mockConcerts.map((c) => (
          <ConcertCard key={c.concertId} concert={c} />
        ))}
      </main>
    </div>
  );
}
