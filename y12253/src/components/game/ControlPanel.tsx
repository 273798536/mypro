import React, { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Radio, Gauge } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';

const ControlPanel: React.FC = () => {
  const [speed, setSpeed] = useState(1);
  const { fireSonar, moveSubmarine, currentPhase, currentSonarPulse, isBeatWindow } = useGameStore();

  const isPlaying = currentPhase === 'playing';
  const canFireSonar = isPlaying && !currentSonarPulse;

  const handleMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (isPlaying) {
      moveSubmarine(direction, speed);
    }
  };

  return (
    <div className="glow-border rounded-lg p-4 bg-deep-ocean-950/50">
      <h3 className="text-tech-cyan-500 font-display text-sm mb-4">导航控制</h3>
      
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div />
        <button
          onClick={() => handleMove('up')}
          disabled={!isPlaying}
          className={`p-3 rounded-lg flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-deep-ocean-800 hover:bg-deep-ocean-700 text-tech-cyan-400 hover:shadow-glow-cyan'
              : 'bg-deep-ocean-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <ArrowUp size={20} />
        </button>
        <div />
        
        <button
          onClick={() => handleMove('left')}
          disabled={!isPlaying}
          className={`p-3 rounded-lg flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-deep-ocean-800 hover:bg-deep-ocean-700 text-tech-cyan-400 hover:shadow-glow-cyan'
              : 'bg-deep-ocean-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <ArrowLeft size={20} />
        </button>
        
        <div className={`p-3 rounded-lg flex items-center justify-center ${
          isBeatWindow ? 'bg-sonar-green-500/20 text-sonar-green-400' : 'bg-deep-ocean-800 text-gray-500'
        }`}>
          <span className="text-xs font-mono">●</span>
        </div>
        
        <button
          onClick={() => handleMove('right')}
          disabled={!isPlaying}
          className={`p-3 rounded-lg flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-deep-ocean-800 hover:bg-deep-ocean-700 text-tech-cyan-400 hover:shadow-glow-cyan'
              : 'bg-deep-ocean-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <ArrowRight size={20} />
        </button>
        
        <div />
        <button
          onClick={() => handleMove('down')}
          disabled={!isPlaying}
          className={`p-3 rounded-lg flex items-center justify-center transition-all ${
            isPlaying
              ? 'bg-deep-ocean-800 hover:bg-deep-ocean-700 text-tech-cyan-400 hover:shadow-glow-cyan'
              : 'bg-deep-ocean-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <ArrowDown size={20} />
        </button>
        <div />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Gauge size={14} /> 航速
          </span>
          <span className="text-xs font-mono text-tech-cyan-400">{speed} 节</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`flex-1 py-2 rounded text-xs font-mono transition-all ${
                speed === s
                  ? 'bg-tech-cyan-500 text-deep-ocean-950'
                  : 'bg-deep-ocean-800 text-gray-400 hover:bg-deep-ocean-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={fireSonar}
        disabled={!canFireSonar}
        className={`w-full py-3 rounded-lg font-display text-sm flex items-center justify-center gap-2 transition-all ${
          canFireSonar
            ? 'bg-sonar-green-500/20 text-sonar-green-400 border border-sonar-green-500/50 hover:bg-sonar-green-500/30 hover:shadow-glow-green'
            : 'bg-deep-ocean-800 text-gray-500 border border-gray-700 cursor-not-allowed'
        }`}
      >
        <Radio size={16} className={canFireSonar ? 'animate-pulse' : ''} />
        {currentSonarPulse ? '扫描中...' : '发射声呐'}
      </button>

      <div className="mt-4 text-xs text-gray-500 text-center">
        {isBeatWindow ? (
          <span className="text-sonar-green-400">✓ 节拍窗口 - 及时决策</span>
        ) : (
          <span className="text-warning-orange-400">○ 等待节拍...</span>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
