import TopNav from '@/components/UI/TopNav';
import HomePage from '@/pages/HomePage';
import ReviewPage from '@/pages/ReviewPage';
import HistoryPage from '@/pages/HistoryPage';
import RisksPage from '@/pages/RisksPage';
import ImportPage from '@/pages/ImportPage';
import { useUIStore } from '@/store/useUISTore';
import { useEffect } from 'react';

export default function App() {
  const { activeTab } = useUIStore();

  useEffect(() => {
    console.log(
      '%c🌊 海洋浮游生物计数系统已启动',
      'color: #00D4AA; font-size: 14px; font-weight: bold; padding: 4px 8px; background: rgba(0,212,170,0.1); border-radius: 4px;',
    );
    console.log(
      '%c提示: 在界面右上角点击「复核入口」可打开终端控制台，或直接访问复核中心页面',
      'color: #5AADCB; font-size: 11px;',
    );
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomePage />;
      case 'review':
        return <ReviewPage />;
      case 'history':
        return <HistoryPage />;
      case 'risks':
        return <RisksPage />;
      case 'import':
        return <ImportPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-ocean-950 relative overflow-hidden">
      <TopNav />
      <div className="flex-1 flex overflow-hidden relative">
        {renderContent()}
      </div>
    </div>
  );
}
