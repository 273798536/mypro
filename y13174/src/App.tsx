import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import HomePage from "@/pages/HomePage";
import DetailPage from "@/pages/DetailPage";
import HistoryPage from "@/pages/HistoryPage";
import VerifyPage from "@/pages/VerifyPage";
import ExceptionPage from "@/pages/ExceptionPage";
import { useDeflectionStore } from '@/store/useDeflectionStore';

export default function App() {
  const initStore = useDeflectionStore((s) => s.initStore);
  const unifiedDataSource = useDeflectionStore((s) => s.unifiedDataSource);

  useEffect(() => {
    if (!unifiedDataSource) {
      initStore();
    }
  }, [unifiedDataSource, initStore]);

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
