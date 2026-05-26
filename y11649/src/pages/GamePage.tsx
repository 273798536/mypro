import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { SlopeMap } from '@/components/game/SlopeMap';
import { ControlPanel } from '@/components/game/ControlPanel';
import { Timer } from '@/components/game/Timer';
import { WarningBanner } from '@/components/game/WarningBanner';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Home } from 'lucide-react';

export const GamePage = () => {
  const navigate = useNavigate();
  const { status, updateTimer, report } = useGameStore();

  useEffect(() => {
    if (status === 'idle') {
      navigate('/');
      return;
    }

    if (status === 'won' || status === 'lost') {
      navigate('/result');
      return;
    }
  }, [status, navigate]);

  useEffect(() => {
    if (status !== 'playing') return;

    const interval = setInterval(() => {
      updateTimer();
    }, 1000);

    return () => clearInterval(interval);
  }, [status, updateTimer]);

  if (status === 'idle') return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                <Home size={20} />
              </Button>
              <h1 className="text-xl font-bold text-gray-800 font-display">滑雪救援派遣赛</h1>
            </div>
            <div className="flex-1 max-w-md">
              <Timer />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                {status === 'paused' && '已暂停'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <WarningBanner />

        <div className="mt-6 grid lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 180px)' }}>
          <div className="lg:col-span-2">
            <Card variant="elevated" className="h-full">
              <SlopeMap />
            </Card>
          </div>
          <div className="overflow-y-auto pr-2" style={{ maxHeight: '100%' }}>
            <ControlPanel />
          </div>
        </div>
      </main>
    </div>
  );
};
