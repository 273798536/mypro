import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/pages/HomePage";
import DetailPage from "@/pages/DetailPage";
import HistoryPage from "@/pages/HistoryPage";
import VerifyPage from "@/pages/VerifyPage";
import ExceptionPage from "@/pages/ExceptionPage";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/detail" element={<DetailPage />} />
          <Route path="/history/:recordId" element={<HistoryPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/exceptions" element={<ExceptionPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
