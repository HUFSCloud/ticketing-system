import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { confirmPayment } from "../api/payments";
import { fmtPrice } from "../api/seatSection";
import { useCountdown } from "../hooks/useCountdown";

const PAY_METHODS = [
  { id: "CARD",  label: "신용카드 **** 1234", icon: "💳" },
  { id: "KAKAO", label: "카카오페이",          icon: "🟡" },
  { id: "TOSS",  label: "토스페이",            icon: "🔵" },
  { id: "BANK",  label: "계좌이체",            icon: "🏦" },
];

// UUID v4 (간단 버전)
function uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function Payment() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // 좌석 화면에서 navigate state로 넘긴 정보
  // state: { concertId, seat: { seatId, seatCode, name, price }, holdTtlSeconds, userId }
  const concertId = state?.concertId;
  const seat = state?.seat;
  const userId = state?.userId;
  const holdTtl = state?.holdTtlSeconds || 300;

  const [method, setMethod] = useState("CARD");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState(null);

  // 5분 카운트다운 — 만료 시 결과(실패) 화면으로 이동
  const onExpire = () => {
    navigate("/result/expired", {
      replace: true,
      state: { reason: "선점 시간이 초과되었습니다.", seat },
    });
  };
  const { mm, ss, urgent } = useCountdown(holdTtl, onExpire);

  // state가 비어있으면 잘못된 진입 — 좌석 페이지로 돌려보냄
  if (!concertId || !seat || !userId) {
    return (
      <div className="page">
        <p className="status-msg status-msg--error">
          잘못된 접근입니다. 좌석 선택부터 시작해주세요.
        </p>
        <button className="btn-primary" onClick={() => navigate("/concerts")}>
          공연 목록으로
        </button>
      </div>
    );
  }

  const total = seat.price;

  const handleConfirm = async () => {
    if (paying) return;
    setPaying(true);
    setError(null);

    const requestId = `req-${uuid()}`;
    const idempotencyKey = `pay-${uuid()}`;

    try {
      const result = await confirmPayment({
        requestId,
        concertId,
        seatId: seat.seatId,
        userId,
        idempotencyKey,
      });
      // 결과 화면으로 이동 (requestId로 폴링)
      navigate(`/result/${encodeURIComponent(result.requestId)}`, {
        state: { seat, total, method },
      });
    } catch (e) {
      setError(e.message || "결제 확정에 실패했습니다.");
      setPaying(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-header__title">결제</h1>
        <p className="page-header__subtitle">선점한 좌석을 결제하세요</p>
      </header>

      <div className="steps">
        <span className="step step--done">① 좌석 선택 ✓</span>
        <span className="step-arrow">→</span>
        <span className="step step--active">② 결제</span>
        <span className="step-arrow">→</span>
        <span className="step">③ 완료</span>
      </div>

      <div className="payment-container">
        {/* 카운트다운 */}
        <div className={`timer-box ${urgent ? "timer-box--urgent" : ""}`}>
          <div>
            <div className="timer-box__label">선점 유효 시간</div>
            <div className="timer-box__sub">만료 시 자동 실패 처리</div>
          </div>
          <div className={`timer-display ${urgent ? "timer-display--urgent" : ""}`}>
            ⏱ {mm}:{ss}
          </div>
        </div>

        {/* 좌석 확인 */}
        <div className="panel-box">
          <div className="panel-title">예매 좌석 확인</div>
          <div className="seat-line">
            <span className="seat-line__name">
              {seat.name}석 · {seat.code}
            </span>
            <span className="seat-line__price">{fmtPrice(seat.price)}</span>
          </div>
          <div className="total-line">
            <span>총 결제 금액</span>
            <span className="total-line__amount">{fmtPrice(total)}</span>
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="panel-box">
          <div className="panel-title">결제 수단 (Mock)</div>
          <div className="pay-method-list">
            {PAY_METHODS.map((m) => (
              <label
                key={m.id}
                className={`pay-method ${method === m.id ? "pay-method--checked" : ""}`}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                />
                <span className="pay-method__icon">{m.icon}</span>
                <span className="pay-method__text">{m.label}</span>
                {method === m.id && <span className="pay-method__check">✓</span>}
              </label>
            ))}
          </div>
          <p className="hint">
            ※ 결제 수단은 화면용 mock 입니다. 백엔드 요청에는 포함되지 않습니다.
          </p>
        </div>

        {error && <p className="status-msg status-msg--error">{error}</p>}

        <button
          className="btn-primary btn-primary--lg"
          disabled={paying}
          onClick={handleConfirm}
        >
          {paying ? "결제 처리 중..." : `${fmtPrice(total)} 결제하기`}
        </button>

        <p className="hint">POST /payments/confirm → SQS 적재</p>
      </div>
    </div>
  );
}
