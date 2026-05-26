import { useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind, ChevronLeft, ChevronRight } from 'lucide-react';
import { useYardStore } from '../../store/useYardStore';

export function SimulationBar() {
  const { 
    simulation, 
    containers, 
    startSimulation, 
    stopSimulation, 
    resetSimulation,
    setSimulationStep,
    setSimulationSpeed
  } = useYardStore();
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (simulation.isPlaying && simulation.totalSteps > 0) {
      intervalRef.current = setInterval(() => {
        if (simulation.currentStep < simulation.totalSteps) {
          setSimulationStep(simulation.currentStep + 1);
        } else {
          stopSimulation();
        }
      }, 1000 / simulation.speed);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulation.isPlaying, simulation.currentStep, simulation.speed, simulation.totalSteps]);
  
  const currentContainerId = simulation.pickupSequence[simulation.currentStep - 1];
  const currentContainer = containers.find(c => c.id === currentContainerId);
  
  const handlePlayPause = () => {
    if (simulation.isPlaying) {
      stopSimulation();
    } else {
      if (simulation.currentStep >= simulation.totalSteps) {
        resetSimulation();
      }
      startSimulation();
    }
  };
  
  const handleReset = () => {
    stopSimulation();
    resetSimulation();
  };
  
  const handleStepChange = (step: number) => {
    stopSimulation();
    setSimulationStep(Math.max(0, Math.min(step, simulation.totalSteps)));
  };
  
  const progress = simulation.totalSteps > 0 
    ? (simulation.currentStep / simulation.totalSteps) * 100 
    : 0;
  
  const speedOptions = [0.5, 1, 2, 4];
  
  return (
    <div className="bg-industrial-darker border-t border-industrial-gray/30 h-28 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-industrial-gray/30">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-industrial-light">提箱模拟</span>
          {currentContainer && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-industrial-gray">当前:</span>
              <span className="text-industrial-blue font-mono">{currentContainer.id}</span>
              <span className="text-industrial-gray">|</span>
              <span className="text-industrial-gray">位置: {currentContainer.bay}贝/{currentContainer.row}排/{currentContainer.tier}层</span>
              <span className="text-industrial-gray">|</span>
              <span className="text-industrial-gray">提箱顺序: #{currentContainer.booking.pickupOrder}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-industrial-gray">速度:</span>
          {speedOptions.map(speed => (
            <button
              key={speed}
              onClick={() => setSimulationSpeed(speed)}
              className={`px-2 py-0.5 text-xs rounded transition-colors ${
                simulation.speed === speed
                  ? 'bg-industrial-blue/20 text-industrial-blue'
                  : 'bg-industrial-dark text-industrial-gray hover:text-industrial-light'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 flex items-center px-4 gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleStepChange(0)}
            className="p-1.5 rounded hover:bg-industrial-dark/50 text-industrial-gray hover:text-industrial-light transition-colors"
            title="回到开始"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleStepChange(simulation.currentStep - 1)}
            className="p-1.5 rounded hover:bg-industrial-dark/50 text-industrial-gray hover:text-industrial-light transition-colors"
            disabled={simulation.currentStep <= 0}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-2 rounded bg-industrial-blue hover:bg-industrial-blue/80 text-white transition-colors"
          >
            {simulation.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => handleStepChange(simulation.currentStep + 1)}
            className="p-1.5 rounded hover:bg-industrial-dark/50 text-industrial-gray hover:text-industrial-light transition-colors"
            disabled={simulation.currentStep >= simulation.totalSteps}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded hover:bg-industrial-dark/50 text-industrial-gray hover:text-industrial-light transition-colors"
            title="重置"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <span className="text-xs text-industrial-gray font-mono w-16 text-right">
            {simulation.currentStep} / {simulation.totalSteps}
          </span>
          <div className="flex-1 h-2 bg-industrial-dark rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-industrial-blue to-industrial-green rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={simulation.totalSteps}
            value={simulation.currentStep}
            onChange={(e) => handleStepChange(Number(e.target.value))}
            className="w-32 h-1 bg-industrial-dark rounded-full appearance-none cursor-pointer slider"
          />
        </div>
        
        <div className="text-xs text-industrial-gray">
          进度: {Math.round(progress)}%
        </div>
      </div>
    </div>
  );
}
