import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ArchiveList from "@/pages/ArchiveList";
import ArchiveDetail from "@/pages/ArchiveDetail";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ArchiveList />} />
        <Route path="/archive/:id" element={<ArchiveDetail />} />
      </Routes>
    </Router>
  );
}
