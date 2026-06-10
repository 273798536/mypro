import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import SampleList from '@/pages/SampleList';
import SampleDetail from '@/pages/SampleDetail';
import HistoryCompare from '@/pages/HistoryCompare';
import AuditLog from '@/pages/AuditLog';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<SampleList />} />
          <Route path="/sample/:id" element={<SampleDetail />} />
          <Route path="/sample/:id/history" element={<HistoryCompare />} />
          <Route path="/audit-log" element={<AuditLog />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
};

export default App;
