import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Header } from "./components/layout/Header";
import { WorkbenchPage } from "./pages/WorkbenchPage";
import { DataManagementPage } from "./pages/DataManagementPage";
import { ExportPage } from "./pages/ExportPage";
import { BondDetailPage } from "./pages/BondDetailPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function AppLayout() {
  const location = useLocation();
  const isDetailPage = location.pathname.startsWith('/detail/');

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {!isDetailPage && <Header />}
      <Routes>
        <Route path="/" element={<WorkbenchPage />} />
        <Route path="/data" element={<DataManagementPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/detail/:bondId" element={<BondDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
