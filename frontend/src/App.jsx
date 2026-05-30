import { Routes, Route, Navigate } from "react-router-dom";
import ConcertList from "./pages/ConcertList";
import SeatSelection from "./pages/SeatSelection";
import Payment from "./pages/Payment";
import Result from "./pages/Result";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/concerts" replace />} />
      <Route path="/concerts" element={<ConcertList />} />
      <Route path="/concerts/:concertId/seats" element={<SeatSelection />} />
      <Route path="/payment" element={<Payment />} />
      <Route path="/result/:requestId" element={<Result />} />
    </Routes>
  );
}
