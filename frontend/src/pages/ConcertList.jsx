import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
      <div className="concert-card__info">
        <span>📅 {formatDate(concert.concertDate)}</span>
        <span>📍 {concert.venue}</span>
        <span>🎟 총 {concert.totalSeats.toLocaleString()}석</span>
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
  const [concerts, setConcerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/concerts")
      .then((res) => {
        if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
        return res.json();
      })
      .then((json) => {
        setConcerts(json.data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">🎵 공연 목록</h1>
        <p className="page-header__subtitle">원하는 공연을 선택하세요</p>
      </header>
      <main>
        {loading && <p className="status-msg">불러오는 중...</p>}
        {error && <p className="status-msg status-msg--error">오류: {error}</p>}
        {!loading && !error && concerts.length === 0 && (
          <p className="status-msg">등록된 공연이 없습니다.</p>
        )}
        {!loading && !error && concerts.length > 0 && (
          <div className="concert-grid">
            {concerts.map((c) => (
              <ConcertCard key={c.concertId} concert={c} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
