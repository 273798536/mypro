import { useState } from 'react';
import { Vector3 } from 'three';
import { Plus, Minus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { BallState } from '../../types';
import { useExperimentStore } from '../../store/useExperimentStore';
import { PARAM_BOUNDS } from '../../utils/physics';
import { cn } from '../../utils/cn';

interface BallParamsProps {
  ball: BallState;
  canRemove: boolean;
}

export function BallParams({ ball, canRemove }: BallParamsProps) {
  const [expanded, setExpanded] = useState(true);
  const updateBall = useExperimentStore((state) => state.updateBall);
  const removeBall = useExperimentStore((state) => state.removeBall);

  const speed = ball.velocity.length();

  const handleMassChange = (value: number) => {
    updateBall(ball.id, { mass: value }, `参数面板 - ${ball.label}`);
  };

  const handleSpeedChange = (value: number) => {
    const direction = ball.velocity.clone().normalize();
    if (direction.length() < 0.01) {
      direction.set(1, 0, 0);
    }
    const newVelocity = direction.multiplyScalar(value);
    updateBall(ball.id, { velocity: newVelocity }, `参数面板 - ${ball.label}`);
  };

  const handleRadiusChange = (value: number) => {
    updateBall(ball.id, { radius: value }, `参数面板 - ${ball.label}`);
  };

  const handleVelocityXChange = (value: number) => {
    const newVel = new Vector3(value, 0, ball.velocity.z);
    updateBall(ball.id, { velocity: newVel }, `参数面板 - ${ball.label}`);
  };

  const handleVelocityZChange = (value: number) => {
    const newVel = new Vector3(ball.velocity.x, 0, value);
    updateBall(ball.id, { velocity: newVel }, `参数面板 - ${ball.label}`);
  };

  return (
    <div className="bg-space-800 rounded-lg overflow-hidden border border-space-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-space-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: ball.color, boxShadow: `0 0 8px ${ball.color}` }}
          />
          <span className="font-medium">{ball.label}</span>
          <span className="text-xs text-white/50 mono-text">
            m={ball.mass.toFixed(2)}kg
          </span>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeBall(ball.id);
              }}
              className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="text-xs text-white/40 mb-2">
            来源: {ball.source || '未知'} (行 {ball.sourceLine || '-'})
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>质量 (kg)</span>
              <span className="mono-text text-cyber-400">{ball.mass.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={PARAM_BOUNDS.mass.min}
              max={PARAM_BOUNDS.mass.max}
              step={0.1}
              value={ball.mass}
              onChange={(e) => handleMassChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>速率 (m/s)</span>
              <span className="mono-text text-cyber-400">{speed.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={PARAM_BOUNDS.velocity.min}
              max={PARAM_BOUNDS.velocity.max}
              step={0.1}
              value={speed}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>半径 (m)</span>
              <span className="mono-text text-cyber-400">{ball.radius.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={PARAM_BOUNDS.radius.min}
              max={PARAM_BOUNDS.radius.max}
              step={0.05}
              value={ball.radius}
              onChange={(e) => handleRadiusChange(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Vx (m/s)</span>
                <span className="mono-text">{ball.velocity.x.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-PARAM_BOUNDS.velocity.max}
                max={PARAM_BOUNDS.velocity.max}
                step={0.1}
                value={ball.velocity.x}
                onChange={(e) => handleVelocityXChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Vz (m/s)</span>
                <span className="mono-text">{ball.velocity.z.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={-PARAM_BOUNDS.velocity.max}
                max={PARAM_BOUNDS.velocity.max}
                step={0.1}
                value={ball.velocity.z}
                onChange={(e) => handleVelocityZChange(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BallParamsList() {
  const balls = useExperimentStore((state) => state.balls);
  const addBall = useExperimentStore((state) => state.addBall);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/70">球体参数</h3>
        <button
          onClick={addBall}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
            "bg-cyber-500/20 text-cyber-400 hover:bg-cyber-500/30"
          )}
        >
          <Plus size={14} />
          添加
        </button>
      </div>

      {balls.map((ball) => (
        <BallParams key={ball.id} ball={ball} canRemove={balls.length > 1} />
      ))}
    </div>
  );
}
