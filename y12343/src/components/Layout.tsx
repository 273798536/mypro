import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useStore } from '@/store';
import { X } from 'lucide-react';

export default function Layout() {
  const { loadData, error, clearError } = useStore();

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className="flex-1 relative">
        {error && (
          <div className="absolute top-4 right-4 z-50 animate-slide-up">
            <div className="bg-accent-error/90 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="hover:bg-white/20 p-1 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
