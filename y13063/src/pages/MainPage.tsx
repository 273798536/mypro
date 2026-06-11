import TopBar from '@/components/TopBar';
import FilterPanel from '@/components/FilterPanel';
import ProfileView from '@/components/ProfileView';
import DetailPanel from '@/components/DetailPanel';
import HelpModal from '@/components/HelpModal';
import { useAppStore } from '@/store/useAppStore';
import { useEffect } from 'react';

export default function MainPage() {
  const showHelp = useAppStore((s) => s.showHelp);
  const setShowHelp = useAppStore((s) => s.setShowHelp);

  useEffect(() => {
    const seen = sessionStorage.getItem('gw-help-seen');
    if (!seen) {
      setShowHelp(true);
      sessionStorage.setItem('gw-help-seen', '1');
    }
  }, [setShowHelp]);

  return (
    <div className="h-screen w-screen flex flex-col bg-surface-bg overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <FilterPanel />
        <main className="flex-1 flex overflow-hidden">
          <ProfileView />
          <DetailPanel />
        </main>
      </div>
      {showHelp && <HelpModal />}
    </div>
  );
}
