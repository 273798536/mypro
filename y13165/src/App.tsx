import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import ImportPage from '@/pages/ImportPage';
import DetailPage from '@/pages/DetailPage';
import ChartPage from '@/pages/ChartPage';

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ImportPage />} />
          <Route path="/detail" element={<DetailPage />} />
          <Route path="/chart" element={<ChartPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
