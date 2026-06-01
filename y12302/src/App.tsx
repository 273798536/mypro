import { Header } from './components/layout/Header';
import { Workspace } from './pages/Workspace';
import { DataManagement } from './pages/DataManagement';
import { Detection } from './pages/Detection';
import { Export } from './pages/Export';
import { Review } from './pages/Review';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const { activeTab } = useAppStore();

  const renderPage = () => {
    switch (activeTab) {
      case 'workspace':
        return <Workspace />;
      case 'data':
        return <DataManagement />;
      case 'detection':
        return <Detection />;
      case 'export':
        return <Export />;
      case 'review':
        return <Review />;
      default:
        return <Workspace />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      <Header />
      <main className="flex-1 overflow-hidden">
        {renderPage()}
      </main>
    </div>
  );
}
