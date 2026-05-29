import { useEffect, useCallback } from 'react';
import { Flame } from 'lucide-react';
import CityScene from '../components/CityScene';
import ControlPanel from '../components/ControlPanel';
import InfoPanel from '../components/InfoPanel';
import TimeAxis from '../components/TimeAxis';
import AlertBanner from '../components/AlertBanner';
import { useAppStore } from '../store';
import { createInitialSimulation } from '../utils/mockData';
import { getAllSimulations, saveSimulation } from '../utils/storage';
import { compareSimulations } from '../utils/comparisonEngine';

export default function Home() {
  const {
    currentSimulation,
    comparisonSimulation,
    setCurrentSimulation,
    setSimulationHistory,
    setComparison,
    addSimulationToHistory,
  } = useAppStore();

  const initializeApp = useCallback(async () => {
    const savedSimulations = await getAllSimulations();

    if (savedSimulations.length > 0) {
      setSimulationHistory(savedSimulations);
      setCurrentSimulation(savedSimulations[0]);
    } else {
      const initialSim = createInitialSimulation();
      await saveSimulation(initialSim);
      setCurrentSimulation(initialSim);
      setSimulationHistory([initialSim]);
      addSimulationToHistory(initialSim);
    }
  }, [setCurrentSimulation, setSimulationHistory, addSimulationToHistory]);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    if (currentSimulation && comparisonSimulation) {
      const comp = compareSimulations(currentSimulation, comparisonSimulation);
      setComparison(comp);
    }
  }, [currentSimulation, comparisonSimulation, setComparison]);

  if (!currentSimulation) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">正在加载城市消防覆盖沙盘...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 flex flex-col overflow-hidden">
      <header className="h-14 bg-slate-900/95 border-b border-slate-700 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">城市消防覆盖沙盘</h1>
            <p className="text-xs text-slate-400">消防规划决策支持系统</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400">当前模拟</div>
            <div className="text-sm font-medium text-white">
              {currentSimulation.name}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative overflow-hidden">
        <AlertBanner />

        <ControlPanel />

        <main className="flex-1 relative">
          <CityScene />
        </main>

        <InfoPanel />

        <TimeAxis />
      </div>
    </div>
  );
}
