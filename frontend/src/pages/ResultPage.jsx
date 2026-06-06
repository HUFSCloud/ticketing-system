import { useLocation, useNavigate } from "react-router-dom";

export default function ResultPage() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    navigate("/concerts", { replace: true });
    return null;
  }

  const { success, message, ticketId, concertTitle, seatCode } = state;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__logo">
          HUFS <span>티켓</span>
        </h1>
      </header>

      <div className="result-card">
        <div className={`result-icon${success ? " result-icon--success" : " result-icon--fail"}`}>
          {success ? "✓" : "✕"}
        </div>

        <h2 className="result-title">
          {success ? "예매가 완료됐습니다!" : "예매에 실패했습니다"}
        </h2>

        <p className="result-msg">{message}</p>

        {success && (
          <div className="result-info">
            {ticketId && (
              <div className="result-info__row">
                <span>티켓 번호</span>
                <strong>#{ticketId}</strong>
              </div>
            )}
            {concertTitle && (
              <div className="result-info__row">
                <span>공연</span>
                <strong>{concertTitle}</strong>
              </div>
            )}
            {seatCode && (
              <div className="result-info__row">
                <span>좌석</span>
                <strong>{seatCode}</strong>
              </div>
            )}
          </div>
        )}

        <button className="book-btn" style={{ marginTop: "1.5rem" }} onClick={() => navigate("/concerts")}>
          공연 목록으로
        </button>
      </div>
    </div>
  );
}
