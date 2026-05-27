import { useAppStore } from './store/useAppStore';
import { MainPage } from './pages/MainPage';
import { ReportPage } from './pages/ReportPage';

export default function App() {
  const currentPage = useAppStore((state) => state.currentPage);

  return (
    <div className="font-sans">
      {currentPage === 'main' ? <MainPage /> : <ReportPage />}
    </div>
  );
}
