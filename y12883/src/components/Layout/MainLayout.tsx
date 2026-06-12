import { ReactNode, useEffect } from 'react';
import SidebarNav from './SidebarNav';
import { useAppStore } from '@/store/useAppStore';
import SampleDataModal from './SampleDataModal';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { initData, isFirstVisit, isInitialized } = useAppStore();

  useEffect(() => {
    if (!isInitialized) {
      initData();
    }
  }, [initData, isInitialized]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-deep-900 via-deep-700 to-deep-800">
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50 pointer-events-none" />
      
      <SidebarNav />
      
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      {isFirstVisit && isInitialized && <SampleDataModal />}
    </div>
  );
}
