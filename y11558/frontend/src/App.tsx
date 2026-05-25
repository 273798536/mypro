import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ChainList } from './pages/ChainList';
import { ChainDetail } from './pages/ChainDetail';
import { DirtyDataCenter } from './pages/DirtyDataCenter';
import { Reconciliation } from './pages/Reconciliation';
import { ExportCenter } from './pages/ExportCenter';
import { HistoryQuery } from './pages/HistoryQuery';
import { TechView } from './pages/TechView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/chains" element={<ChainList />} />
            <Route path="/chains/:id" element={<ChainDetail />} />
            <Route path="/dirty-data" element={<DirtyDataCenter />} />
            <Route path="/reconciliation" element={<Reconciliation />} />
            <Route path="/export" element={<ExportCenter />} />
            <Route path="/history" element={<HistoryQuery />} />
            <Route path="/tech-view" element={<TechView />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
