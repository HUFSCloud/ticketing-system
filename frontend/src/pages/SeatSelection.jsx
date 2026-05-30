import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSeats, holdSeat } from "../api/seats";
import { parseSeatCode, SECTION_MAP, fmtPrice } from "../api/seatSection";
import { useUserId } from "../hooks/useUserId";

const MAX_SELECT = 4;

// 좌석 한 칸 컴포넌트
function SeatBox({ seat, selected, onToggle }) {
  const meta = parseSeatCode(seat.seatCode);
  // 다른 사용자가 hold 중이면 클릭 불가
  const clickable = seat.status === "AVAILABLE" || selected;
  const cls = selected
    ? "seat seat--selected"
    : seat.status === "SOLD"
    ? "seat seat--sold"
    : seat.status === "HOLD"
    ? "seat seat--hold"
    : "seat seat--available";

  return (
    <button
      type="button"
      className={cls}
      disabled={!clickable}
      onClick={() => clickable && onToggle(seat)}
      title={`${meta.code} · ${meta.name}석 · ${fmtPrice(meta.price)}`}
    >
      {seat.status === "SOLD" ? "×" : meta.number}
    </button>
  );
}

export default function SeatSelection() {
  const { concertId } = useParams();
  const navigate = useNavigate();
  const userId = useUserId();

  const [data, setData] = useState(null); // { concertId, seats }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]); // [{ seatId, seatCode, ...meta }]
  const [filter, setFilter] = useState("전체");
  const [holding, setHolding] = useState(false);
  const [toast, setToast] = useState(null);

  const loadSeats = () => {
    setLoading(true);
    setError(null);
    getSeats(concertId)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSeats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concertId]);

  // 구역별로 그룹핑 (A/B/C/D)
  const grouped = useMemo(() => {
    if (!data) return {};
    const out = { A: [], B: [], C: [], D: [] };
    for (const seat of data.seats) {
      const letter = (seat.seatCode || "").split("-")[0];
      if (out[letter]) out[letter].push(seat);
    }
    return out;
  }, [data]);

  const sectionLetters = ["A", "B", "C", "D"];
  const visibleLetters =
    filter === "전체"
      ? sectionLetters
      : sectionLetters.filter((l) => SECTION_MAP[l]?.name === filter);

  const toggleSeat = (seat) => {
    setSelected((prev) => {
      if (prev.find((s) => s.seatId === seat.seatId)) {
        return prev.filter((s) => s.seatId !== seat.seatId);
      }
      if (prev.length >= MAX_SELECT) {
        showToast(`최대 ${MAX_SELECT}석까지 선택할 수 있습니다.`);
        return prev;
      }
      return [...prev, { ...seat, ...parseSeatCode(seat.seatCode) }];
    });
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const totalPrice = selected.reduce((a, s) => a + s.price, 0);

  // 좌석 선점 → 백엔드는 1좌석씩만 받으므로 순차 호출
  // 첫 좌석 성공 시 결제 화면으로 이동 (여러 좌석은 향후 백엔드 확장 시 처리)
  const handleHold = async () => {
    if (!selected.length || !userId || holding) return;
    setHolding(true);
    try {
      // 일단 첫 좌석 한 개만 hold (백엔드 스펙: 1요청당 1좌석)
      const seat = selected[0];
      const heldData = await holdSeat({
        concertId: Number(concertId),
        seatId: seat.seatId,
        userId,
      });
      // 결제 화면으로 holdId/seat 정보 전달
      navigate("/payment", {
        state: {
          concertId: Number(concertId),
          seat,
          holdTtlSeconds: heldData.holdTtlSeconds,
          userId,
        },
      });
    } catch (e) {
      showToast(e.message || "좌석 선점에 실패했습니다.");
      loadSeats(); // 좌석 상태 재조회
    } finally {
      setHolding(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <p className="status-msg">좌석 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <header className="page-header">
          <button className="back-btn" onClick={() => navigate("/concerts")}>
            ← 공연 목록
          </button>
          <h1 className="page-header__title">좌석 선택</h1>
        </header>
        <p className="status-msg status-msg--error">오류: {error}</p>
        <button className="btn-primary" onClick={loadSeats}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate("/concerts")}>
          ← 공연 목록
        </button>
        <h1 className="page-header__title">좌석 선택</h1>
        <p className="page-header__subtitle">
          원하는 좌석을 선택하세요 (최대 {MAX_SELECT}석)
        </p>
      </header>

      <div className="steps">
        <span className="step step--active">① 좌석 선택</span>
        <span className="step-arrow">→</span>
        <span className="step">② 결제</span>
        <span className="step-arrow">→</span>
        <span className="step">③ 완료</span>
      </div>

      <div className="seat-layout">
        <div className="seat-area">
          <div className="stage">S T A G E</div>

          {/* 구역 필터 */}
          <div className="filter-row">
            <button
              className={`chip ${filter === "전체" ? "chip--active" : ""}`}
              onClick={() => setFilter("전체")}
            >
              전체
            </button>
            {sectionLetters.map((l) => (
              <button
                key={l}
                className={`chip ${filter === SECTION_MAP[l].name ? "chip--active" : ""}`}
                onClick={() => setFilter(SECTION_MAP[l].name)}
              >
                {SECTION_MAP[l].name}석{" "}
                <span className="chip-price">{fmtPrice(SECTION_MAP[l].price)}</span>
              </button>
            ))}
          </div>

          {/* 좌석 그리드 */}
          {visibleLetters.map((letter) => {
            const seats = grouped[letter] || [];
            if (!seats.length) return null;
            const meta = SECTION_MAP[letter];
            return (
              <div key={letter} className="section-block">
                <div className="section-header">
                  <span className="section-name" style={{ color: meta.color }}>
                    {meta.name}석
                  </span>
                  <span className="section-price">{fmtPrice(meta.price)}</span>
                </div>
                <div className="seat-grid">
                  {seats.map((seat) => (
                    <SeatBox
                      key={seat.seatId}
                      seat={seat}
                      selected={!!selected.find((s) => s.seatId === seat.seatId)}
                      onToggle={toggleSeat}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div className="legend">
            <span className="legend-item">
              <span className="legend-sw legend-sw--available" /> 선택 가능
            </span>
            <span className="legend-item">
              <span className="legend-sw legend-sw--selected" /> 선택됨
            </span>
            <span className="legend-item">
              <span className="legend-sw legend-sw--hold" /> hold 중
            </span>
            <span className="legend-item">
              <span className="legend-sw legend-sw--sold" /> 매진
            </span>
          </div>
        </div>

        {/* 우측 패널 */}
        <aside className="side-panel">
          <div className="panel-box">
            <div className="panel-title">
              선택한 좌석 ({selected.length}/{MAX_SELECT})
            </div>
            {selected.length === 0 ? (
              <p className="empty-text">좌석을 클릭해서 선택하세요</p>
            ) : (
              <>
                {selected.map((s) => (
                  <div key={s.seatId} className="seat-line">
                    <span className="seat-line__name">
                      {s.name}석 · {s.code}
                    </span>
                    <span className="seat-line__price">{fmtPrice(s.price)}</span>
                  </div>
                ))}
                <div className="total-line">
                  <span>합계</span>
                  <span className="total-line__amount">{fmtPrice(totalPrice)}</span>
                </div>
              </>
            )}
          </div>

          <button
            className="btn-primary"
            disabled={!selected.length || holding}
            onClick={handleHold}
          >
            {holding ? "선점 중..." : "좌석 선점하기"}
          </button>

          {selected.length > 0 && (
            <button className="btn-ghost" onClick={() => setSelected([])}>
              선택 초기화
            </button>
          )}

          {selected.length > 1 && (
            <p className="hint hint--warn">
              ※ 백엔드 스펙 상 1회 요청에 1좌석만 선점됩니다. 첫 좌석부터 처리합니다.
            </p>
          )}

          <p className="hint">POST /seats/hold</p>
        </aside>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
