import { GameHeader } from '../components/game/GameHeader';
import { CityMap } from '../components/game/CityMap';
import { SoundCardPanel } from '../components/game/SoundCardPanel';
import { GovernancePanel } from '../components/game/GovernancePanel';
import { RisksPanel } from '../components/risks/RisksPanel';
import { RecordsPanel } from '../components/records/RecordsPanel';
import { useGameStore } from '../store/gameStore';
import { useEffect } from 'react';

export function GamePage() {
  const recalculateState = useGameStore((state) => state.recalculateState);

  useEffect(() => {
    recalculateState();
  }, [recalculateState]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-eco-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <GameHeader />

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-7">
              <CityMap />
            </div>

            <div className="col-span-5 space-y-6">
              <SoundCardPanel />
              <GovernancePanel />
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-5">
              <RisksPanel />
            </div>

            <div className="col-span-7">
              <RecordsPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
