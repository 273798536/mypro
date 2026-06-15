import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useDataStore } from '@/store/useDataStore';
import { AlertCircle, X, Loader2 } from 'lucide-react';

export default function MainLayout() {
  const { error, clearError, loading } = useDataStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#051439] via-[#0A2463] to-[#051439]">
      <Sidebar />
      <main className="ml-64 min-h-screen transition-all duration-300">
        <div className="p-6">
          <Outlet />
        </div>
      </main>

      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-[#0A2463] animate-spin" />
            <p className="text-[#0A2463] font-medium">处理中...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-slide-up">
          <div className="bg-[#E63946] text-white rounded-xl shadow-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">发生错误</p>
              <p className="text-sm text-white/90 mt-1">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
