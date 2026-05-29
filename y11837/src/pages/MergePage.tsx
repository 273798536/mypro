import ConfigMerge from '@/components/ConfigMerge';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MergePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white">
      <header className="border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-zinc-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            返回游戏
          </button>
          <div className="w-px h-4 bg-zinc-700" />
          <span className="text-white text-sm font-semibold">配置合并</span>
        </div>
      </header>

      <main className="p-6">
        <ConfigMerge />
      </main>
    </div>
  );
}
