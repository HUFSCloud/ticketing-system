import { useNavigate, useParams } from "react-router-dom";
import { mockConcerts } from "../data/concerts";

export default function SeatSelection() {
  const { concertId } = useParams();
  const navigate = useNavigate();
  const concert = mockConcerts.find((c) => c.concertId === Number(concertId));

  return (
    <div className="page">
      <header className="page-header">
        <button className="back-btn" onClick={() => navigate("/concerts")}>
          ← 공연 목록
        </button>
        <h1 className="page-header__title">
          {concert ? concert.title : "공연"} — 좌석 선택
        </h1>
        <p className="page-header__subtitle">
          이 페이지는 프론트 1팀이 구현 예정입니다
        </p>
      </header>
      <main className="placeholder">
        <div className="placeholder__box">
          <p>🪑 좌석 선택 화면</p>
          <p>concertId: {concertId}</p>
        </div>
      </main>
    </div>
  );
}
