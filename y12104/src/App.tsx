import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import DataManagement from './pages/DataManagement';
import RankingCenter from './pages/RankingCenter';
import TieBreakConfirm from './pages/TieBreakConfirm';
import AppealCenter from './pages/AppealCenter';
import VersionHistory from './pages/VersionHistory';
import ReportExport from './pages/ReportExport';
import { useAppStore } from './store/appStore';

export default function App() {
  const { currentPage } = useAppStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'data':
        return <DataManagement />;
      case 'ranking':
        return <RankingCenter />;
      case 'tiebreak':
        return <TieBreakConfirm />;
      case 'appeal':
        return <AppealCenter />;
      case 'history':
        return <VersionHistory />;
      case 'report':
        return <ReportExport />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
}
