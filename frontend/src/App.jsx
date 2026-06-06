import { Routes, Route, Navigate } from "react-router-dom";
import ConcertList from "./pages/ConcertList";
import SeatSelection from "./pages/SeatSelection";
import ResultPage from "./pages/ResultPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/concerts" replace />} />
      <Route path="/concerts" element={<ConcertList />} />
      <Route path="/concerts/:concertId/seats" element={<SeatSelection />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
