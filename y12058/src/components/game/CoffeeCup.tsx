import React, { useState, useEffect } from 'react';
import { usePhysicsStore } from '@/store/physicsStore';

export const CoffeeCup: React.FC = () => {
  const { temperature, mass } = usePhysicsStore();
  const [isStirring, setIsStirring] = useState(false);
  
  useEffect(() => {
    if (isStirring) {
      const timer = setTimeout(() => setIsStirring(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isStirring]);

  const getCoffeeColor = () => {
    if (temperature < 50) return '#654321';
    if (temperature < 80) return '#4A2C2A';
    return '#3D2314';
  };

  const showSteam = temperature > 60;
  const fillPercentage = Math.min(100, (mass / 500) * 100);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-bold mb-4 font-display">咖啡杯</h3>
      
      {showSteam && (
        <div className="flex gap-2 mb-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-4 h-8 bg-gray-300 rounded-full opacity-50 animate-steam"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      )}
      
      <div className="relative w-40 h-48">
        <div className="absolute inset-0 border-8 border-coffee-dark rounded-b-[3rem] bg-coffee-light overflow-hidden">
          <div
            className="absolute bottom-0 left-0 right-0 transition-all duration-500"
            style={{
              height: `${fillPercentage}%`,
              backgroundColor: getCoffeeColor(),
            }}
          >
            {isStirring && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-swirl opacity-60" />
              </div>
            )}
          </div>
        </div>
        
        <div className="absolute right-0 top-1/4 w-8 h-16 border-4 border-coffee-dark rounded-r-full bg-transparent" />
      </div>
      
      <div className="mt-4 text-center text-coffee-medium">
        <div>容量: {mass.toFixed(0)} ml</div>
        <div className="text-sm text-gray-500">
          {temperature > 80 ? '🔥 滚烫' : temperature > 50 ? '☕ 温热' : '❄️ 冰凉'}
        </div>
      </div>
    </div>
  );
};
