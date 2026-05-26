import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { BridgeSimulator } from '../physics/BridgeSimulator';
import BuildCanvas from '../components/BuildCanvas';
import MaterialPanel from '../components/MaterialPanel';
import StatusBar from '../components/StatusBar';
import ToolBar from '../components/ToolBar';
import ResultPanel from '../components/ResultPanel';
import ImportDialog from '../components/ImportDialog';
import { AlertTriangle } from 'lucide-react';

export default function BuildPage() {
  const navigate = useNavigate();
  const simContainerRef = useRef<HTMLDivElement>(null);
  const simulatorRef = useRef<BridgeSimulator | null>(null);
  const [showSim, setShowSim] = useState(false);
  const [simReady, setSimReady] = useState(false);
  
  const {
    currentLevel,
    nodes,
    members,
    materials,
    windSetting,
    isSimulating,
    updateSimulation,
    endSimulation,
    isReplaying
  } = useGameStore();
  
  useEffect(() => {
    if (!currentLevel) {
      navigate('/');
    }
  }, [currentLevel, navigate]);
  
  useEffect(() => {
    if (isSimulating && !simulatorRef.current && simContainerRef.current && simReady) {
      const simulator = new BridgeSimulator(
        currentLevel!,
        nodes,
        members,
        materials,
        windSetting,
        {
          onUpdate: (time, progress, vehicleIndex, stresses, nodePositions, warnings) => {
            updateSimulation(time, progress, vehicleIndex, stresses, nodePositions, warnings);
          },
          onFailure: (reason, message, memberId) => {
            endSimulation(false, reason, message, memberId);
            setTimeout(() => {
              if (simulatorRef.current) {
                simulatorRef.current.destroy();
                simulatorRef.current = null;
              }
              setShowSim(false);
              setSimReady(false);
            }, 2000);
          },
          onSuccess: () => {
            endSimulation(true);
            setTimeout(() => {
              if (simulatorRef.current) {
                simulatorRef.current.destroy();
                simulatorRef.current = null;
              }
              setShowSim(false);
              setSimReady(false);
            }, 1500);
          }
        }
      );
      
      simulatorRef.current = simulator;
      simulator.init(simContainerRef.current, 1000, 550);
    }
    
    return () => {
      if (simulatorRef.current) {
        simulatorRef.current.destroy();
        simulatorRef.current = null;
      }
    };
  }, [isSimulating, simReady, currentLevel, nodes, members, materials, windSetting, updateSimulation, endSimulation]);
  
  useEffect(() => {
    if (isSimulating && !showSim) {
      setShowSim(true);
      setTimeout(() => setSimReady(true), 100);
    }
  }, [isSimulating, showSim]);
  
  if (!currentLevel) return null;
  
  if (isReplaying) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-4">
      <header className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              {currentLevel.name}
            </h1>
            <p className="text-slate-400 text-sm">{currentLevel.description}</p>
          </div>
          {isSimulating && (
            <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg animate-pulse">
              <AlertTriangle size={18} />
              <span className="font-medium">模拟测试中...</span>
            </div>
          )}
        </div>
      </header>
      
      <div className="flex gap-4">
        <div className="w-64 space-y-4">
          <ToolBar />
          <MaterialPanel />
        </div>
        
        <div className="flex-1 relative">
          {showSim ? (
            <div 
              ref={simContainerRef}
              className="w-[1000px] h-[550px] rounded-xl border-2 border-slate-700 overflow-hidden bg-slate-900"
            />
          ) : (
            <BuildCanvas width={1000} height={550} />
          )}
        </div>
        
        <div className="w-72">
          <StatusBar />
        </div>
      </div>
      
      <ResultPanel />
      <ImportDialog />
    </div>
  );
}
