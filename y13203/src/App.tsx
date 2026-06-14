import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import AnomalyPage from "@/pages/AnomalyPage";
import HistoryPage from "@/pages/HistoryPage";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-56 p-6">
          <Routes>
            <Route path="/" element={<AnomalyPage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
