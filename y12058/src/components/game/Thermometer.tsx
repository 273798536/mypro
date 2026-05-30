import React from 'react';
import { usePhysicsStore } from '@/store/physicsStore';

export const Thermometer: React.FC = () => {
  const { temperature, conservationStatus } = usePhysicsStore();
  
  const minTemp = 0;
  const maxTemp = 100;
  const percentage = ((temperature - minTemp) / (maxTemp - minTemp)) * 100;
  
  const getColor = () => {
    if (temperature < 40) return '#3498DB';
    if (temperature < 70) return '#F39C12';
    return '#E74C3C';
  };

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-4 font-display">水温表</h3>
      
      <div className="relative w-20 h-64 bg-gray-200 rounded-full border-4 border-coffee-dark overflow-hidden">
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-b-full"
          style={{
            height: `${percentage}%`,
            backgroundColor: getColor(),
          }}
        />
        
        <div className="absolute inset-0 flex flex-col justify-between py-2">
          {[100, 75, 50, 25, 0].map(temp => (
            <div key={temp} className="flex items-center">
              <div className="w-3 h-0.5 bg-coffee-dark" />
              <span className="text-xs font-bold ml-1 text-coffee-dark">{temp}</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mt-4 text-center">
        <div className="text-3xl font-bold" style={{ color: getColor() }}>
          {temperature.toFixed(1)}°C
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={`status-indicator ${conservationStatus === 'valid' ? 'status-valid' : 'status-error'}`} />
          <span className="text-sm text-coffee-medium">
            {conservationStatus === 'valid' ? '守恒正常' : '守恒异常'}
          </span>
        </div>
      </div>
    </div>
  );
};
