import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import BackupRecords from '@/pages/BackupRecords';
import ReviewCenter from '@/pages/ReviewCenter';
import IndexEngine from '@/pages/IndexEngine';
import History from '@/pages/History';
import ReportPage from '@/pages/ReportPage';
import { useAuditStore } from '@/store/useAuditStore';

function Bootstrapper() {
  const loadRounds = useAuditStore((s) => s.loadRounds);
  const setCurrentRound = useAuditStore((s) => s.setCurrentRound);
  const rounds = useAuditStore((s) => s.rounds);
  const currentRoundId = useAuditStore((s) => s.currentRoundId);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  useEffect(() => {
    if (rounds.length > 0 && !currentRoundId) {
      const active = rounds.find((r) => r.status === 'active') || rounds[0];
      setCurrentRound(active.id);
    }
  }, [rounds, currentRoundId, setCurrentRound]);

  return null;
}

export default function App() {
  return (
    <Router>
      <Bootstrapper />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/backup" element={<BackupRecords />} />
          <Route path="/review" element={<ReviewCenter />} />
          <Route path="/index-engine" element={<IndexEngine />} />
          <Route path="/history" element={<History />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
