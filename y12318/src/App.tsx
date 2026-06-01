import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ImportPage from "@/pages/ImportPage";
import OverviewPage from "@/pages/OverviewPage";
import DetailPage from "@/pages/DetailPage";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-base">
        <Sidebar />
        <main className="flex-1 ml-56">
          <Routes>
            <Route path="/" element={<Navigate to="/import" replace />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/detail/:skuId" element={<DetailPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
