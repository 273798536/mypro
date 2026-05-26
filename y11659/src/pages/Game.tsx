import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  Award,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Truck,
  FileText,
  Package,
  ShieldAlert,
  Pause,
  Play,
  Home,
} from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useHistoryStore } from '../store/historyStore';
import type { Vehicle, UserAction, ErrorType } from '../types';
import { ERROR_TYPE_LABELS } from '../types';

type MaterialTab = 'container' | 'plate' | 'booking' | 'dangerous';

export default function Game() {
  const navigate = useNavigate();
  const {
    status,
    score,
    combo,
    timeRemaining,
    currentVehicleIndex,
    vehicles,
    queue,
    operations,
    settings,
    startGame,
    pauseGame,
    resumeGame,
    submitAction,
    tick,
    getCurrentVehicle,
    getGameRecord,
  } = useGameStore();
  const { addRecord } = useHistoryStore();

  const [activeTab, setActiveTab] = useState<MaterialTab>('container');
  const [selectedAction, setSelectedAction] = useState<UserAction | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [containerNumber, setContainerNumber] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastResult, setLastResult] = useState<{
    correct: boolean;
    scoreChange: number;
    errorType?: ErrorType;
  } | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const currentVehicle = getCurrentVehicle();
  const isGameOver = status === 'finished';

  useEffect(() => {
    if (status === 'idle') {
      startGame();
    }
  }, [status, startGame]);

  useEffect(() => {
    if (status === 'playing' && !isPaused) {
      const timer = setInterval(() => {
        tick();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, isPaused, tick]);

  useEffect(() => {
    if (isGameOver) {
      const record = getGameRecord();
      if (record) {
        addRecord(record);
      }
      setTimeout(() => {
        navigate('/result');
      }, 1500);
    }
  }, [isGameOver, getGameRecord, addRecord, navigate]);

  const handleSubmit = useCallback(() => {
    if (!selectedAction || !currentVehicle) return;

    submitAction(selectedAction, selectedReasons, containerNumber);

    const lastOp = operations[operations.length - 1];
    if (lastOp) {
      setLastResult({
        correct: lastOp.isCorrect,
        scoreChange: lastOp.scoreChange,
        errorType: lastOp.errorType,
      });
      setShowFeedback(true);

      setTimeout(() => {
        setShowFeedback(false);
        setSelectedAction(null);
        setSelectedReasons([]);
        setContainerNumber('');
        setActiveTab('container');
      }, 1200);
    }
  }, [selectedAction, selectedReasons, containerNumber, currentVehicle, submitAction, operations]);

  const toggleReason = (reason: string) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePause = () => {
    if (isPaused) {
      resumeGame();
    } else {
      pauseGame();
    }
    setIsPaused(!isPaused);
  };

  if (status === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-white/60">正在加载...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className={`w-6 h-6 ${timeRemaining < 30 ? 'text-danger-400 animate-pulse' : 'text-primary-300'}`} />
                <span className={`text-2xl font-bold ${timeRemaining < 30 ? 'text-danger-400' : 'text-white'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-success-400" />
                <span className="text-2xl font-bold text-success-400">{score}</span>
              </div>
              {combo >= 2 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 bg-warning-500/20 text-warning-400 px-3 py-1 rounded-full"
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-bold">x{combo}</span>
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white/60">
                {currentVehicleIndex + 1} / {vehicles.length}
              </span>
              <button
                onClick={handlePause}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
              </button>
              <button
                onClick={() => navigate('/')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Home className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-400 to-primary-500"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeRemaining / settings.totalTime) * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2">
            <div className="glass-panel p-4 h-full">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary-300" />
                等待队列
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {queue.slice(0, 5).map((item, idx) => {
                  const vehicle = vehicles.find((v) => v.id === item.vehicleId);
                  const isWarning = item.waitTime >= settings.timeoutThreshold * 0.7;
                  const isDanger = item.waitTime >= settings.timeoutThreshold;

                  return (
                    <motion.div
                      key={item.vehicleId}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-3 rounded-lg border ${
                        isDanger
                          ? 'bg-danger-500/20 border-danger-500/50 animate-pulse'
                          : isWarning
                          ? 'bg-warning-500/20 border-warning-500/50'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="text-sm font-medium text-white">
                        #{idx + 2}
                      </div>
                      <div className="text-xs text-white/60 mt-1">
                        等待: {Math.floor(item.waitTime)}秒
                      </div>
                    </motion.div>
                  );
                })}
                {queue.length === 0 && (
                  <div className="text-center text-white/40 py-8">
                    队列已清空
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {currentVehicle && (
              <MaterialViewer
                vehicle={currentVehicle}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="glass-panel p-4 h-full">
              <h3 className="text-lg font-bold text-white mb-4">操作面板</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  输入箱号确认
                </label>
                <input
                  type="text"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
                  placeholder="请输入箱号..."
                  className="input-field font-mono uppercase"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-white/80 mb-2">
                  选择操作
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedAction('release')}
                    className={`p-4 rounded-lg font-bold transition-all ${
                      selectedAction === 'release'
                        ? 'bg-success-500 text-white shadow-glow-success'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                    放行
                  </button>
                  <button
                    onClick={() => setSelectedAction('intercept')}
                    className={`p-4 rounded-lg font-bold transition-all ${
                      selectedAction === 'intercept'
                        ? 'bg-danger-500 text-white shadow-glow-danger'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    <XCircle className="w-6 h-6 mx-auto mb-1" />
                    拦截
                  </button>
                </div>
              </div>

              {selectedAction === 'intercept' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-4"
                >
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    拦截原因（可多选）
                  </label>
                  <div className="space-y-2">
                    {['预约不匹配', '危品未申报', '预约无效', '箱号错误', '其他'].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => toggleReason(reason)}
                        className={`w-full p-2 rounded-lg text-left text-sm transition-all ${
                          selectedReasons.includes(reason)
                            ? 'bg-danger-500/30 border-danger-500/50 border'
                            : 'bg-white/5 border-white/10 border hover:bg-white/10'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!selectedAction || isPaused}
                className="w-full btn-primary py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认提交
              </button>

              <div className="mt-6 pt-4 border-t border-white/10">
                <h4 className="text-sm font-medium text-white/60 mb-2">操作记录</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {[...operations].reverse().slice(0, 5).map((op, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded bg-white/5"
                    >
                      <span className={op.isCorrect ? 'text-success-400' : 'text-danger-400'}>
                        {op.userAction === 'release' ? '放行' : '拦截'}
                      </span>
                      <span
                        className={`font-bold ${
                          op.scoreChange >= 0 ? 'text-success-400' : 'text-danger-400'
                        }`}
                      >
                        {op.scoreChange >= 0 ? '+' : ''}
                        {op.scoreChange}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showFeedback && lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className={`glass-panel p-8 text-center ${
                lastResult.correct ? 'border-success-500/50' : 'border-danger-500/50'
              }`}
            >
              {lastResult.correct ? (
                <CheckCircle className="w-20 h-20 text-success-400 mx-auto mb-4" />
              ) : (
                <XCircle className="w-20 h-20 text-danger-400 mx-auto mb-4" />
              )}
              <h2
                className={`text-3xl font-bold mb-2 ${
                  lastResult.correct ? 'text-success-400' : 'text-danger-400'
                }`}
              >
                {lastResult.correct ? '正确！' : '错误！'}
              </h2>
              {lastResult.errorType && (
                <div className="flex items-center justify-center gap-2 text-warning-400 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>{ERROR_TYPE_LABELS[lastResult.errorType]}</span>
                </div>
              )}
              <p
                className={`text-2xl font-bold ${
                  lastResult.scoreChange >= 0 ? 'text-success-400' : 'text-danger-400'
                }`}
              >
                {lastResult.scoreChange >= 0 ? '+' : ''}
                {lastResult.scoreChange} 分
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-40"
          >
            <div className="glass-panel p-8 text-center">
              <Pause className="w-16 h-16 text-primary-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">游戏暂停</h2>
              <button
                onClick={handlePause}
                className="btn-primary"
              >
                继续游戏
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MaterialViewer({
  vehicle,
  activeTab,
  onTabChange,
}: {
  vehicle: Vehicle;
  activeTab: MaterialTab;
  onTabChange: (tab: MaterialTab) => void;
}) {
  const tabs: { key: MaterialTab; label: string; icon: React.ReactNode }[] = [
    { key: 'container', label: '集装箱', icon: <Package className="w-4 h-4" /> },
    { key: 'plate', label: '车牌', icon: <Truck className="w-4 h-4" /> },
    { key: 'booking', label: '预约单', icon: <FileText className="w-4 h-4" /> },
    { key: 'dangerous', label: '危品标记', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'container':
        const containerData = vehicle.materials.container.data as { containerNumber: string; size: string; type: string };
        return (
          <div className="space-y-6">
            <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center relative source-watermark" data-source={vehicle.materials.container.source}>
              <div className="text-center">
                <Package className="w-24 h-24 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-500">集装箱照片</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-white/60 mb-1">箱号</p>
                <p className="text-2xl font-mono font-bold text-white">{containerData.containerNumber}</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-sm text-white/60 mb-1">尺寸/类型</p>
                <p className="text-xl font-bold text-white">{containerData.size} {containerData.type}</p>
              </div>
            </div>
          </div>
        );

      case 'plate':
        const plateData = vehicle.materials.licensePlate.data as { plateNumber: string; vehicleType: string };
        return (
          <div className="space-y-6">
            <div className="aspect-video bg-gradient-to-br from-blue-900 to-blue-950 rounded-xl flex items-center justify-center relative source-watermark" data-source={vehicle.materials.licensePlate.source}>
              <div className="bg-white px-12 py-6 rounded-lg shadow-2xl">
                <p className="text-4xl font-black text-black tracking-wider">{plateData.plateNumber}</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">车辆类型</p>
              <p className="text-xl font-bold text-white">{plateData.vehicleType}</p>
            </div>
          </div>
        );

      case 'booking':
        const bookingData = vehicle.materials.bookingNote.data as {
          bookingNumber: string;
          containerNumber: string;
          plateNumber: string;
          cargoType: string;
          isDangerous: boolean;
          valid: boolean;
        };
        return (
          <div className="space-y-4 relative source-watermark" data-source={vehicle.materials.bookingNote.source}>
            <div className="bg-white text-gray-900 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">预约单</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bookingData.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {bookingData.valid ? '有效' : '无效'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">预约号</p>
                  <p className="font-mono font-bold">{bookingData.bookingNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">箱号</p>
                  <p className="font-mono font-bold">{bookingData.containerNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">车牌</p>
                  <p className="font-mono font-bold">{bookingData.plateNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">货物类型</p>
                  <p className="font-bold">{bookingData.cargoType}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">危品申报</p>
                  <p className={`font-bold ${bookingData.isDangerous ? 'text-red-600' : 'text-green-600'}`}>
                    {bookingData.isDangerous ? '是 - 已申报' : '否'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'dangerous':
        if (!vehicle.materials.dangerousMark) {
          return (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-white/40">
                <ShieldAlert className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>无危品标记</p>
              </div>
            </div>
          );
        }
        const dangerousData = vehicle.materials.dangerousMark.data as {
          classNumber: string;
          className: string;
        };
        return (
          <div className="space-y-6 relative source-watermark" data-source={vehicle.materials.dangerousMark.source}>
            <div className="aspect-square max-w-xs mx-auto bg-danger-500 rounded-xl flex items-center justify-center shadow-2xl shadow-danger-500/30">
              <div className="text-center text-white">
                <p className="text-8xl font-black">{dangerousData.classNumber}</p>
                <p className="text-xl font-bold mt-2">{dangerousData.className}</p>
              </div>
            </div>
            <div className="bg-danger-500/20 border border-danger-500/50 rounded-lg p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-danger-400 mx-auto mb-2" />
              <p className="text-danger-300 font-bold">注意：此货物为危险品！</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="glass-panel p-6 h-full">
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-primary-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
