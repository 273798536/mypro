import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { StatusBar } from '@/components/game/StatusBar';
import { OrderPanel } from '@/components/game/OrderPanel';
import { ExchangePanel } from '@/components/game/ExchangePanel';
import { HedgingPanel } from '@/components/game/HedgingPanel';
import { ControlBar } from '@/components/game/ControlBar';
import { SettlementModal } from '@/components/game/SettlementModal';
import { Button } from '@/components/common/Button';
import { Home } from 'lucide-react';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { status, loadSavedGame } = useGameStore();

  useEffect(() => {
    if (status === 'idle') {
      const loaded = loadSavedGame();
      if (!loaded) {
        navigate('/');
      }
    }
  }, [status, loadSavedGame, navigate]);

  if (status === 'idle') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">加载中...</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            返回主页
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <StatusBar />

      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="h-full">
            <OrderPanel />
          </div>
          <div className="h-full">
            <ExchangePanel />
          </div>
          <div className="h-full">
            <HedgingPanel />
          </div>
        </div>
      </div>

      <ControlBar />
      <SettlementModal />
    </div>
  );
};
