import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import DetailTable from '@/pages/DetailTable';
import ExceptionQueue from '@/pages/ExceptionQueue';
import RecordDetail from '@/pages/RecordDetail';

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/detail-table" element={<DetailTable />} />
        <Route path="/exception-queue" element={<ExceptionQueue />} />
        <Route path="/record/:id" element={<RecordDetail />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
