import React, { useState } from 'react';
import { Flame, Snowflake, RotateCw, Coffee } from 'lucide-react';
import { usePhysicsStore } from '@/store/physicsStore';
import { useGameStore } from '@/store/gameStore';
import { HeatExchangeResult } from '@/types';

interface ControlPanelProps {
  disabled?: boolean;
  onPour?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ disabled, onPour }) => {
  const { addHeat, addIce, stir, addTemperaturePoint, temperature } = usePhysicsStore();
  const { addAction, addException, currentOrder, gameId } = useGameStore();
  const [heatPower] = useState(1000);
  const [iceMass] = useState(50);
  const [stirSpeed] = useState(5);
  const [actionDuration] = useState(2);

  const executeAction = (
    type: 'heat' | 'ice' | 'stir',
    actionFn: () => HeatExchangeResult,
    params: Record<string, number>
  ) => {
    if (disabled) return;

    const timestamp = Date.now();
    const result = actionFn();

    const actionId = `act_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
    
    addAction({
      id: actionId,
      type,
      timestamp,
      params,
      heatExchange: result,
    });

    addTemperaturePoint({
      timestamp,
      temperature,
      actionId,
    });

    if (result.isAbnormal && result.abnormalType) {
      const exceptionType = result.abnormalType === 'conservation' 
        ? 'conservation_error' as const
        : result.abnormalType === 'temperature_bound'
        ? 'temperature_bound' as const
        : 'timeout' as const;
      
      addException({
        actionId,
        timestamp,
        type: exceptionType,
        details: result.abnormalType === 'conservation'
          ? { conservationError: result.errorMargin }
          : { temperature, expectedRange: [0, 100] },
        reviewed: false,
      });
    }
  };

  const handleHeat = () => {
    executeAction('heat', () => addHeat(heatPower, actionDuration), {
      power: heatPower,
      duration: actionDuration,
    });
  };

  const handleIce = () => {
    executeAction('ice', () => addIce(iceMass, -10), {
      mass: iceMass,
      temp: -10,
    });
  };

  const handleStir = () => {
    executeAction('stir', () => stir(stirSpeed, actionDuration), {
      speed: stirSpeed,
      duration: actionDuration,
    });
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4 font-display text-center">操作面板</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleHeat}
          disabled={disabled}
          className="btn-game btn-heat flex flex-col items-center gap-2"
        >
          <Flame size={28} />
          <span>加热</span>
          <span className="text-xs opacity-75">+{actionDuration}秒</span>
        </button>
        
        <button
          onClick={handleIce}
          disabled={disabled}
          className="btn-game btn-ice flex flex-col items-center gap-2"
        >
          <Snowflake size={28} />
          <span>加冰</span>
          <span className="text-xs opacity-75">{iceMass}g</span>
        </button>
        
        <button
          onClick={handleStir}
          disabled={disabled}
          className="btn-game btn-stir flex flex-col items-center gap-2"
        >
          <RotateCw size={28} />
          <span>搅拌</span>
          <span className="text-xs opacity-75">+{actionDuration}秒</span>
        </button>
        
        <button
          onClick={onPour}
          disabled={disabled || !currentOrder}
          className="btn-game btn-pour flex flex-col items-center gap-2"
        >
          <Coffee size={28} />
          <span>完成</span>
          <span className="text-xs opacity-75">提交订单</span>
        </button>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="text-sm text-gray-600">
          <div>加热功率: {heatPower}W</div>
          <div>冰块温度: -10°C</div>
          <div>搅拌速度: {stirSpeed}级</div>
        </div>
      </div>
    </div>
  );
};
