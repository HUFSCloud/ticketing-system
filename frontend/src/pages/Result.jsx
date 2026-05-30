import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getRequestStatus } from "../api/payments";
import { fmtPrice } from "../api/seatSection";

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 20; // 약 20초까지 대기

export default function Result() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  // state: { seat, total, method }  (Payment에서 넘어옴)
  const seat = state?.seat;
  const total = state?.total ?? seat?.price ?? 0;

  // requestId가 "expired" 같은 특수 값이면 만료 처리
  const isExpired = requestId === "expired";
  const initialReason = state?.reason;

  const [status, setStatus] = useState(isExpired ? "FAILED" : "PENDING");
  const [message, setMessage] = useState(isExpired ? initialReason : "예매 처리 중...");
  const [ticketId, setTicketId] = useState(null);
  const [error, setError] = useState(null);
  const pollCount = useRef(0);

  useEffect(() => {
    if (isExpired) return; // 만료 케이스는 폴링 안 함

    let cancelled = false;

    const poll = async () => {
      try {
        const data = await getRequestStatus(requestId);
        if (cancelled) return;

        setStatus(data.status);
        setMessage(data.message || "");
        if (data.ticketId) setTicketId(data.ticketId);

        if (data.status === "SUCCESS" || data.status === "FAILED") {
          return; // 종료
        }

        pollCount.current += 1;
        if (pollCount.current >= POLL_MAX_ATTEMPTS) {
          setError("처리 시간이 너무 길어집니다. 잠시 후 다시 확인해주세요.");
          return;
        }
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || "상태 조회에 실패했습니다.");
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const isSuccess = status === "SUCCESS";
  const isFailed = status === "FAILED";
  const isPending = !isSuccess && !isFailed;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">예매 결과</h1>
      </header>

      <div className="steps">
        <span className="step step--done">① 좌석 선택 ✓</span>
        <span className="step-arrow">→</span>
        <span className="step step--done">② 결제 ✓</span>
        <span className="step-arrow">→</span>
        <span className="step step--active">③ 완료</span>
      </div>

      <div className="result-container">
        {isPending && (
          <div className="result-banner result-banner--pending">
            <div className="result-icon result-icon--pending">⏳</div>
            <div className="result-title">예매 처리 중...</div>
            <p className="result-sub">
              SQS → Lambda → RDS 처리 결과를 기다리는 중입니다.
            </p>
            <p className="result-status-text">{message}</p>
            <p className="result-status-text result-status-text--mono">
              상태: {status}
            </p>
          </div>
        )}

        {isSuccess && (
          <>
            <div className="result-banner result-banner--success">
              <div className="result-icon result-icon--success">✓</div>
              <div className="result-title">예매가 완료되었습니다!</div>
              <p className="result-sub">SQS → Lambda → RDS 처리 완료</p>
            </div>

            <div className="panel-box">
              <div className="panel-title">예매 상세</div>
              <Row label="요청 ID" value={requestId} mono />
              {ticketId && <Row label="티켓 번호" value={`#${ticketId}`} mono />}
              {seat && (
                <Row
                  label="좌석"
                  value={`${seat.name}석 · ${seat.code}`}
                />
              )}
              <Row label="결제 금액" value={fmtPrice(total)} highlight />
              <Row label="처리 상태" value={status} mono />
            </div>
          </>
        )}

        {isFailed && (
          <div className="result-banner result-banner--fail">
            <div className="result-icon result-icon--fail">✕</div>
            <div className="result-title">예매에 실패했습니다</div>
            <p className="result-sub">{message || "처리 중 오류가 발생했습니다."}</p>
          </div>
        )}

        {error && <p className="status-msg status-msg--error">{error}</p>}

        <div className="result-actions">
          {isSuccess && (
            <button className="btn-primary" onClick={() => navigate("/concerts")}>
              홈으로
            </button>
          )}
          {(isFailed || error) && (
            <button className="btn-primary" onClick={() => navigate("/concerts")}>
              공연 목록으로
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, highlight }) {
  return (
    <div className="seat-line">
      <span className="seat-line__name">{label}</span>
      <span
        className={`seat-line__price${mono ? " seat-line__price--mono" : ""}${
          highlight ? " seat-line__price--hl" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
