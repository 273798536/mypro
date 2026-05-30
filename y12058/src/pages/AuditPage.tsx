import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Play, Pause, FastForward, Rewind } from 'lucide-react';
import { ExceptionFilter } from '@/components/audit/ExceptionFilter';
import { BadRowsList } from '@/components/audit/BadRowsList';
import { TemperatureChart } from '@/components/chart/TemperatureChart';
import { ActionTimeline } from '@/components/chart/ActionTimeline';
import { useAuditStore } from '@/store/auditStore';
import { useGameStore } from '@/store/gameStore';
import { usePhysicsStore } from '@/store/physicsStore';

export const AuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { exceptions } = useGameStore();
  const { temperatureHistory } = usePhysicsStore();
  const {
    isReplaying,
    replaySpeed,
    currentReplayTime,
    setIsReplaying,
    setReplaySpeed,
    setCurrentReplayTime,
  } = useAuditStore();
  
  const [replayIndex, setReplayIndex] = useState(0);

  const handlePlayPause = () => {
    setIsReplaying(!isReplaying);
  };

  const handleSpeedChange = (speed: number) => {
    setReplaySpeed(speed);
  };

  const handleSeek = (index: number) => {
    setReplayIndex(index);
    setCurrentReplayTime(index);
  };

  const totalPoints = temperatureHistory.length;
  const progress = totalPoints > 0 ? (replayIndex / (totalPoints - 1)) * 100 : 0;

  return (
    <div className="min-h-screen bg-cream p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-display text-coffee-dark">
          🔬 物理科普馆审核
        </h1>
        <p className="text-coffee-medium mt-2">
          异常数据复核与操作回放分析
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="card mb-6">
          <h3 className="text-xl font-bold mb-4 font-display">操作回放控制</h3>
          
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => handleSeek(0)}
              className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <Rewind size={20} />
            </button>
            
            <button
              onClick={handlePlayPause}
              className="p-3 bg-coffee-dark text-white rounded-lg hover:bg-coffee-medium transition-colors"
            >
              {isReplaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button
              onClick={() => handleSeek(totalPoints - 1)}
              className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <FastForward size={20} />
            </button>
            
            <div className="flex gap-2 ml-4">
              {[0.5, 1, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`px-3 py-1 rounded text-sm ${
                    replaySpeed === speed
                      ? 'bg-coffee-dark text-white'
                      : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <div className="ml-auto text-sm text-gray-600">
              {replayIndex + 1} / {totalPoints}
            </div>
          </div>
          
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-coffee-dark transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <input
            type="range"
            min={0}
            max={totalPoints - 1}
            value={replayIndex}
            onChange={(e) => handleSeek(parseInt(e.target.value))}
            className="w-full mt-2"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <TemperatureChart />
            <ActionTimeline />
            
            <div className="card">
              <h3 className="text-xl font-bold mb-4 font-display">热交换触发分析</h3>
              <div className="space-y-3">
                {exceptions.slice(0, 5).map((exception, index) => (
                  <div key={exception.id} className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-red-700">
                          触发点 #{index + 1}: {exception.type === 'temperature_bound' ? '温度越界' : exception.type === 'conservation_error' ? '守恒错误' : '超时'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        操作ID: {exception.actionId}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="font-medium">为什么影响成绩：</div>
                      {exception.type === 'temperature_bound' && (
                        <p>温度超出合理范围（0-100℃），违反热力学基本规律，扣20分。物理科普：在标准大气压下，水的沸点是100℃，冰点是0℃，超出这个范围的温度在正常条件下不可能存在。</p>
                      )}
                      {exception.type === 'conservation_error' && (
                        <p>热量守恒定律被破坏，扣30分。物理科普：根据热力学第一定律，系统内能的变化等于传入的热量减去对外做的功。在这个模拟中，Q入 - Q出 应该等于 ΔU。</p>
                      )}
                      {exception.type === 'timeout' && (
                        <p>订单制作超时，扣15分。物理科普：虽然不违反物理定律，但时间效率是评价咖啡师技能的重要指标。</p>
                      )}
                    </div>
                  </div>
                ))}
                {exceptions.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    🎉 无异常记录！完美的热力学操作
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <ExceptionFilter />
            <BadRowsList />
            
            <div className="card">
              <h3 className="text-xl font-bold mb-4 font-display">操作指导</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="font-bold text-blue-700 mb-1">💡 温度控制技巧</div>
                  <p>小幅度多次调整比大幅度单次调整更容易达到目标温度。每次加热/加冰后观察温度变化，再决定下一步操作。</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-bold text-green-700 mb-1">⚡ 热量守恒原理</div>
                  <p>Q = cmΔT，其中Q是热量，c是比热容，m是质量，ΔT是温度变化。记住这个公式，它是计算的基础！</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="font-bold text-purple-700 mb-1">🧊 加冰的影响</div>
                  <p>冰块不仅降低温度，还会增加液体质量。冰的熔化需要吸收大量热量（熔化潜热），所以加冰的降温效果非常显著。</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-coffee-dark text-white rounded-lg hover:bg-coffee-medium transition-colors"
            >
              <Home size={20} />
              返回游戏
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
