import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="text-center px-6">
        <div className="mb-6">
          <AlertTriangle size={64} className="mx-auto text-amber-500 opacity-80" />
        </div>
        <h1 className="text-6xl font-bold text-slate-700 mb-2">404</h1>
        <p className="text-xl text-slate-300 mb-2">页面不存在</p>
        <p className="text-slate-500 mb-8">您访问的页面可能已被移除或不存在</p>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          <Home size={18} />
          返回工作台
        </button>
      </div>
    </div>
  );
}
