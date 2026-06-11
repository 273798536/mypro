import { useEffect } from 'react';
import TopToolbar from '@/components/TopToolbar';
import IsolationPanel from '@/components/IsolationPanel';
import ProfileCanvas from '@/components/ProfileCanvas';
import SidebarDetail from '@/components/SidebarDetail';
import StatusBar from '@/components/StatusBar';
import ViewDrawer from '@/components/ViewDrawer';
import SummaryModal from '@/components/SummaryModal';
import { useAppStore } from '@/store/useAppStore';
import { Loader2, AlertCircle, X } from 'lucide-react';

export default function ColdAisleProfile() {
  const { refreshAll, loading, error } = useAppStore();
  const dismissError = useAppStore(s => s.error !== null ? () => useAppStore.setState({ error: null }) : null);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="w-full h-full flex flex-col bg-cold-bg text-slate-100 overflow-hidden">
      <TopToolbar />
      <div className="flex-1 flex min-h-0 relative">
        <IsolationPanel />
        <div className="flex-1 relative min-w-0">
          <ProfileCanvas />
          {loading && (
            <div className="absolute inset-0 bg-cold-bg/70 backdrop-blur-[1px] flex items-center justify-center z-20">
              <div className="flex items-center gap-3 px-4 py-3 rounded-[2px] bg-slate-900/80 border border-cold-border">
                <Loader2 className="w-4 h-4 text-cold-accent animate-spin" />
                <span className="text-xs text-slate-200">加载冷通道剖面数据...</span>
              </div>
            </div>
          )}
        </div>
        <SidebarDetail />
      </div>
      <StatusBar />
      <ViewDrawer />
      <SummaryModal />

      {error && dismissError && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="px-4 py-3 rounded-[2px] bg-cold-danger/15 border border-cold-danger/40 backdrop-blur-md flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-cold-danger shrink-0 mt-0.5" />
            <div className="flex-1 text-[12px] text-cold-danger leading-relaxed">{error}</div>
            <button onClick={dismissError} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
