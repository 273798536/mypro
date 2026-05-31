import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { useGameTimer } from '@/hooks/useGameTimer';
import { Header } from '@/components/layout/Header';
import { CluePool } from '@/components/game/CluePool';
import { CaseArea } from '@/components/game/CaseArea';
import { RiskPanel } from '@/components/game/RiskPanel';
import { PauseModal } from '@/components/game/PauseModal';
import { Toast } from '@/components/common/Toast';
import { Button } from '@/components/common/Button';
import { Flag } from 'lucide-react';

export default function GamePage() {
  const status = useGameStore((state) => state.status);
  const finishGame = useGameStore((state) => state.finishGame);
  const navigate = useNavigate();
  
  useGameTimer();

  useEffect(() => {
    if (status === 'idle') {
      navigate('/');
    } else if (status === 'finished') {
      navigate('/settlement');
    }
  }, [status, navigate]);

  const handleSubmitEarly = () => {
    finishGame();
  };

  if (status === 'idle') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
      <Header />
      
      <main className="pt-24 pb-8 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-6">
            <p className="text-white/60 text-sm">
              拖拽左侧线索到中间对应案件中，收集足够证据后做出判定
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSubmitEarly}
              className="flex items-center gap-2"
            >
              <Flag size={16} />
              提交结算
            </Button>
          </div>

          <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
            <div className="col-span-3">
              <CluePool />
            </div>
            
            <div className="col-span-5">
              <CaseArea />
            </div>
            
            <div className="col-span-4">
              <RiskPanel />
            </div>
          </div>
        </div>
      </main>

      <PauseModal />
      <Toast />
    </div>
  );
}
