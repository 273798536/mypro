import { useState } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EquipmentSelector } from './EquipmentSelector';
import { getInjuryName } from '@/data/victims';
import { getWeatherInfo } from '@/data/weather';
import { getDifficultyLabel } from '@/data/slopes';
import type { EquipmentType } from '@/types';
import {
  Sun,
  Cloud,
  CloudSnow,
  Snowflake,
  Wind,
  User,
  Play,
  Pause,
  RotateCcw,
  Send,
} from 'lucide-react';

export const ControlPanel = () => {
  const {
    patrollers,
    victims,
    weather,
    slopeMap,
    selectedPatroller,
    selectedVictim,
    selectPatroller,
    selectVictim,
    dispatchPatroller,
    pauseGame,
    resumeGame,
    restartGame,
    status,
  } = useGameStore();

  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType[]>([]);

  const weatherIcon = () => {
    switch (weather) {
      case 'sunny': return <Sun className="text-yellow-500" size={24} />;
      case 'cloudy': return <Cloud className="text-gray-500" size={24} />;
      case 'light-snow': return <CloudSnow className="text-blue-400" size={24} />;
      case 'heavy-snow': return <Snowflake className="text-blue-600" size={24} />;
      case 'blizzard': return <Wind className="text-blue-800" size={24} />;
      default: return <Sun size={24} />;
    }
  };

  const weatherInfo = getWeatherInfo(weather);
  const selectedVictimData = victims.find(v => v.id === selectedVictim);
  const selectedPatrollerData = patrollers.find(p => p.id === selectedPatroller);

  const idlePatrollers = patrollers.filter(p => p.status === 'idle');
  const activeVictims = victims.filter(v => !v.isRescued && !v.isFailed);

  const canDispatch = selectedPatrollerData && selectedVictimData && selectedPatrollerData.status === 'idle';

  const handleDispatch = () => {
    if (!selectedPatroller || !selectedVictim) return;
    dispatchPatroller(selectedPatroller, selectedVictim, selectedEquipment);
    setSelectedEquipment([]);
  };

  const getLocationName = (locationId: string): string => {
    return slopeMap.find(n => n.id === locationId)?.name || locationId;
  };

  return (
    <div className="space-y-4">
      <Card variant="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">天气状况</h3>
            {weatherIcon()}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-semibold">{weatherInfo?.name}</div>
          <p className="text-sm text-gray-600">{weatherInfo?.description}</p>
          <div className="mt-2 text-xs text-gray-500">
            速度系数: {weatherInfo?.speedModifier}x | 能见度: {weatherInfo?.visibility}%
          </div>
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader className="pb-3">
          <h3 className="font-semibold text-gray-800">游戏控制</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            {status === 'playing' ? (
              <Button variant="secondary" onClick={pauseGame} className="flex-1">
                <Pause size={16} className="mr-2" />
                暂停
              </Button>
            ) : status === 'paused' ? (
              <Button variant="success" onClick={resumeGame} className="flex-1">
                <Play size={16} className="mr-2" />
                继续
              </Button>
            ) : null}
            <Button variant="secondary" onClick={restartGame}>
              <RotateCcw size={16} />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader className="pb-3">
          <h3 className="font-semibold text-gray-800">巡逻员 ({idlePatrollers.length}/{patrollers.length} 可用)</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {patrollers.map(patroller => (
              <button
                key={patroller.id}
                onClick={() => patroller.status === 'idle' && selectPatroller(patroller.id === selectedPatroller ? null : patroller.id)}
                disabled={patroller.status !== 'idle'}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedPatroller === patroller.id
                    ? 'border-snow-blue-500 bg-snow-blue-50'
                    : patroller.status === 'idle'
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    patroller.status === 'idle' ? 'bg-snow-blue-500' : 'bg-gray-400'
                  }`}>
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{patroller.name}</div>
                    <div className="text-xs text-gray-500">
                      {patroller.status === 'idle' ? '待命' :
                       patroller.status === 'en-route' ? '前往中' :
                       patroller.status === 'rescuing' ? '救援中' : '返回中'}
                    </div>
                  </div>
                  {patroller.status === 'en-route' && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">进度</div>
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-snow-blue-500 rounded-full"
                          style={{ width: `${patroller.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card variant="default">
        <CardHeader className="pb-3">
          <h3 className="font-semibold text-gray-800">待救援 ({activeVictims.length})</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {activeVictims.map(victim => {
              const timePercent = (victim.timeRemaining / victim.initialTime) * 100;
              const isUrgent = timePercent < 30;

              return (
                <button
                  key={victim.id}
                  onClick={() => selectVictim(victim.id === selectedVictim ? null : victim.id)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedVictim === victim.id
                      ? 'border-orange-500 bg-orange-50'
                      : isUrgent
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium">{victim.name}</div>
                      <div className="text-xs text-gray-500">
                        {getInjuryName(victim.injury)} · {getLocationName(victim.location)}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        难度: {getDifficultyLabel(slopeMap.find(n => n.id === victim.location)?.difficulty || 'green')}
                      </div>
                    </div>
                    <div className={`text-sm font-mono ${isUrgent ? 'text-alert-red-500 font-bold animate-pulse' : 'text-gray-600'}`}>
                      {Math.floor(victim.timeRemaining / 60)}:{(victim.timeRemaining % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isUrgent ? 'bg-alert-red-500' : timePercent < 50 ? 'bg-yellow-500' : 'bg-success-green-500'
                      }`}
                      style={{ width: `${timePercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
            {activeVictims.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                所有伤员已处理
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {canDispatch && (
        <Card variant="elevated" className="border-snow-blue-300">
          <CardHeader className="pb-3 bg-snow-blue-50">
            <h3 className="font-semibold text-snow-blue-700">派遣救援</h3>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{selectedPatrollerData?.name}</span>
                {' → '}
                <span className="font-medium">{selectedVictimData?.name}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                需要装备: {selectedVictimData?.requiredEquipment.map(e => {
                  const names: Record<string, string> = {
                    stretcher: '担架', oxygen: '氧气瓶', aed: 'AED',
                    'first-aid': '急救包', rope: '绳索', radio: '对讲机',
                  };
                  return names[e] || e;
                }).join('、')}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">选择装备</div>
              <EquipmentSelector
                selected={selectedEquipment}
                onChange={setSelectedEquipment}
                required={selectedVictimData?.requiredEquipment}
              />
            </div>

            <Button onClick={handleDispatch} className="w-full">
              <Send size={16} className="mr-2" />
              派遣救援
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
