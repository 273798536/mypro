import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useStore } from '@/store/useStore';

export default function Layout() {
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);
  const setError = useStore((state) => state.setError);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-serif font-semibold text-primary-700">
                菜场卸货公示清单管理系统
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                处理零散会议纪要，保留原始痕迹，生成可追溯的公示清单
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                操作员：交通工程师
              </div>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 animate-fade-in-up grid-lines">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
              <span className="text-red-700">{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                关闭
              </button>
            </div>
          )}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
              <div className="bg-white px-8 py-4 rounded-lg shadow-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent" />
                <span className="text-gray-700">处理中...</span>
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
