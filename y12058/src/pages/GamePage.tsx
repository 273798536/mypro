import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CoffeeCup } from '@/components/game/CoffeeCup';
import { Thermometer } from '@/components/game/Thermometer';
import { ControlPanel } from '@/components/game/ControlPanel';
import { OrderCard } from '@/components/game/OrderCard';
import { TemperatureChart } from '@/components/chart/TemperatureChart';
import { ActionTimeline } from '@/components/chart/ActionTimeline';
import { useGameStore } from '@/store/gameStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { cleanOrderData } from '@/utils/dataCleaner';
import rawOrders from '@/data/rawOrders.csv?raw';
import { Order } from '@/types';

export const GamePage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentOrder, 
    actions, 
    isComplete, 
    startGame, 
    completeGame, 
    updateElapsedTime,
    startTime,
    setBadRows,
  } = useGameStore();
  const { addTemperaturePoint, temperature } = usePhysicsStore();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const { validOrders, badRows } = cleanOrderData(rawOrders);
    setOrders(validOrders);
    setBadRows(badRows);
  }, [setBadRows]);

  useEffect(() => {
    if (!currentOrder || isComplete) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      updateElapsedTime(elapsed);
      setRemainingTime(currentOrder.timeLimit - elapsed);

      if (elapsed > 0 && actions.length > 0) {
        const lastAction = actions[actions.length - 1];
        const hasRecentPoint = usePhysicsStore.getState().temperatureHistory.some(
          p => p.actionId === lastAction.id
        );
        if (!hasRecentPoint) {
          addTemperaturePoint({
            timestamp: Date.now(),
            temperature,
            actionId: lastAction.id,
          });
        }
      }

      if (remainingTime <= 0) {
        handleComplete();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentOrder, isComplete, startTime, remainingTime, actions, updateElapsedTime, addTemperaturePoint, temperature]);

  useEffect(() => {
    if (isComplete) {
      navigate('/result');
    }
  }, [isComplete, navigate]);

  const handleSelectOrder = (order: Order) => {
    startGame(order);
    setRemainingTime(order.timeLimit);
    addTemperaturePoint({
      timestamp: Date.now(),
      temperature: 25,
    });
  };

  const handleComplete = () => {
    completeGame();
  };

  return (
    <div className="min-h-screen bg-cream p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-display text-coffee-dark">
          ☕ 热力学咖啡工坊
        </h1>
        <p className="text-coffee-medium mt-2">
          通过真实热力学原理制作完美咖啡
        </p>
      </header>

      {!currentOrder ? (
        <div className="max-w-4xl mx-auto">
          <div className="card mb-6">
            <h2 className="text-2xl font-bold mb-4 font-display text-center">选择订单</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className="p-4 bg-cream rounded-lg border-2 border-cream-dark hover:border-coffee-medium transition-colors text-left"
                >
                  <div className="font-bold text-lg">订单 #{order.id}</div>
                  <div className="text-sm text-gray-600 mt-2">
                    <div>目标温度: {order.targetTemperature}°C</div>
                    <div>容量: {order.capacity}ml</div>
                    <div>时限: {order.timeLimit}秒</div>
                  </div>
                  {order.note && (
                    <div className="text-xs text-gray-500 mt-2">{order.note}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <OrderCard order={currentOrder} remainingTime={remainingTime} />
              <ControlPanel disabled={isComplete} onPour={handleComplete} />
            </div>

            <div className="lg:col-span-5 space-y-6">
              <div className="card">
                <div className="flex justify-around">
                  <CoffeeCup />
                  <Thermometer />
                </div>
              </div>
              <TemperatureChart />
            </div>

            <div className="lg:col-span-4">
              <ActionTimeline />
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/audit')}
              className="px-6 py-2 bg-coffee-dark text-white rounded-lg hover:bg-coffee-medium transition-colors"
            >
              进入物理科普馆审核
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
