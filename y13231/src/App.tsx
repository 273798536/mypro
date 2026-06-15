import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import ConflictListPage from '@/pages/ConflictListPage';
import ConflictDetailPage from '@/pages/ConflictDetailPage';
import { useConflictStore } from '@/stores/conflictStore';

function App() {
  const loadRecords = useConflictStore(state => state.loadRecords);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent-100/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>
      
      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<ConflictListPage />} />
          <Route path="/conflict/:id" element={<ConflictDetailPage />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
