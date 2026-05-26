import { Loader2 } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

export default function Loading() {
  const { loading, loadingText } = useUIStore();

  if (!loading) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex items-center gap-4">
        <Loader2 size={28} className="text-primary-600 animate-spin" />
        <div>
          <p className="text-gray-800 font-medium">{loadingText || '加载中...'}</p>
          <p className="text-sm text-gray-500 mt-1">请稍候</p>
        </div>
      </div>
    </div>
  );
}
