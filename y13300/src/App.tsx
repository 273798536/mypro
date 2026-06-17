import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import TicketList from "@/pages/TicketList.js";
import TicketDetail from "@/pages/TicketDetail.js";
import VersionCompare from "@/pages/VersionCompare.js";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TicketList />} />
        <Route path="/ticket/:id" element={<TicketDetail />} />
        <Route path="/ticket/:id/compare" element={<VersionCompare />} />
      </Routes>
    </Router>
  );
}
