import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Package,
  Truck,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { useHistoryStore } from '../store/historyStore';
import { useGameStore } from '../store/gameStore';
import { mockVehicles } from '../data/mockData';
import type { OperationRecord, Vehicle } from '../types';
import { ERROR_TYPE_LABELS } from '../types';

type MaterialTab = 'container' | 'plate' | 'booking' | 'dangerous';

export default function Replay() {
  const navigate = useNavigate();
  const { recordId } = useParams<{ recordId: string }>();
  const { getRecordById } = useHistoryStore();
  const { vehicles } = useGameStore();

  const [record, setRecord] = useState<ReturnType<typeof getRecordById>>(undefined);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState<MaterialTab>('container');

  useEffect(() => {
    if (recordId) {
      const rec = getRecordById(recordId);
      setRecord(rec);
    }
  }, [recordId, getRecordById]);

  useEffect(() => {
    if (!isPlaying || !record) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= record.operations.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000 / playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, record, playbackSpeed]);

  if (!record) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-white/60">
          <p>未找到记录</p>
          <button
            onClick={() => navigate('/history')}
            className="mt-4 btn-primary"
          >
            返回历史记录
          </button>
        </div>
      </div>
    );
  }

  const currentOp = record.operations[currentIndex];
  const currentVehicle =
    vehicles.find((v) => v.id === currentOp?.vehicleId) ||
    mockVehicles.find((v) => v.id === currentOp?.vehicleId);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(record.operations.length - 1, prev + 1));
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/history')}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white">错误回放</h1>
              <p className="text-white/60">{record.playerName} 的答题记录</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success-400">{record.totalScore}</p>
            <p className="text-sm text-white/60">
              {record.correctCount}/{record.totalCount} 正确
            </p>
          </div>
        </div>

        <div className="glass-panel p-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-4 rounded-full bg-primary-500 hover:bg-primary-400 transition-colors"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <button
              onClick={handleNext}
              disabled={currentIndex === record.operations.length - 1}
              className="p-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              <SkipForward className="w-6 h-6" />
            </button>

            <div className="ml-8 flex items-center gap-2">
              <span className="text-white/60 text-sm">速度:</span>
              {[0.5, 1, 2].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-primary-500 text-white'
                      : 'bg-white/10 text-white/60 hover:bg-white/20'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <div className="ml-8 text-white/60">
              {currentIndex + 1} / {record.operations.length}
            </div>
          </div>

          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary-500"
              initial={false}
              animate={{
                width: `${((currentIndex + 1) / record.operations.length) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {currentVehicle && currentOp && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-300" />
                材料信息
              </h2>

              <div className="flex gap-2 mb-6">
                {[
                  { key: 'container' as MaterialTab, label: '集装箱', icon: <Package className="w-4 h-4" /> },
                  { key: 'plate' as MaterialTab, label: '车牌', icon: <Truck className="w-4 h-4" /> },
                  { key: 'booking' as MaterialTab, label: '预约单', icon: <FileText className="w-4 h-4" /> },
                  { key: 'dangerous' as MaterialTab, label: '危品', icon: <ShieldAlert className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
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

              <MaterialContent vehicle={currentVehicle} activeTab={activeTab} />
            </div>

            <div className="space-y-6">
              <div
                className={`glass-panel p-6 border-2 ${
                  currentOp.isCorrect
                    ? 'border-success-500/50 bg-success-500/10'
                    : 'border-danger-500/50 bg-danger-500/10'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">答题结果</h2>
                  {currentOp.isCorrect ? (
                    <CheckCircle className="w-8 h-8 text-success-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-danger-400" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-1">你的操作</p>
                    <p
                      className={`text-xl font-bold ${
                        currentOp.userAction === 'release' ? 'text-success-400' : 'text-danger-400'
                      }`}
                    >
                      {currentOp.userAction === 'release' ? '放行' : '拦截'}
                    </p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-sm text-white/60 mb-1">正确操作</p>
                    <p
                      className={`text-xl font-bold ${
                        currentVehicle.correctAction === 'release'
                          ? 'text-success-400'
                          : 'text-danger-400'
                      }`}
                    >
                      {currentVehicle.correctAction === 'release' ? '放行' : '拦截'}
                    </p>
                  </div>
                </div>

                {!currentOp.isCorrect && currentOp.errorType && (
                  <div className="flex items-center gap-2 p-3 bg-warning-500/20 rounded-lg text-warning-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span>错误类型：{ERROR_TYPE_LABELS[currentOp.errorType]}</span>
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-white/60">得分变化</span>
                  <span
                    className={`text-2xl font-bold ${
                      currentOp.scoreChange >= 0 ? 'text-success-400' : 'text-danger-400'
                    }`}
                  >
                    {currentOp.scoreChange >= 0 ? '+' : ''}
                    {currentOp.scoreChange}
                  </span>
                </div>
              </div>

              {currentVehicle.correctAction === 'intercept' && currentVehicle.interceptReason && (
                <div className="glass-panel p-6">
                  <h2 className="text-lg font-bold text-white mb-4">正确拦截原因</h2>
                  <div className="space-y-2">
                    {currentVehicle.interceptReason.map((reason, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-3 bg-danger-500/20 rounded-lg text-danger-300"
                      >
                        <AlertTriangle className="w-5 h-5" />
                        {reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="glass-panel p-6">
                <h2 className="text-lg font-bold text-white mb-4">答题记录</h2>
                <div className="flex flex-wrap gap-2">
                  {record.operations.map((op, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-10 h-10 rounded-lg font-bold transition-all ${
                        idx === currentIndex
                          ? 'bg-primary-500 text-white ring-2 ring-primary-300'
                          : op.isCorrect
                          ? 'bg-success-500/30 text-success-300 hover:bg-success-500/50'
                          : 'bg-danger-500/30 text-danger-300 hover:bg-danger-500/50'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialContent({ vehicle, activeTab }: { vehicle: Vehicle; activeTab: MaterialTab }) {
  switch (activeTab) {
    case 'container':
      const containerData = vehicle.materials.container.data as { containerNumber: string; size: string; type: string };
      return (
        <div className="space-y-4">
          <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <Package className="w-20 h-20 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-500">集装箱照片</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">箱号</p>
              <p className="text-xl font-mono font-bold text-white">{containerData.containerNumber}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">尺寸/类型</p>
              <p className="text-lg font-bold text-white">{containerData.size} {containerData.type}</p>
            </div>
          </div>
        </div>
      );

    case 'plate':
      const plateData = vehicle.materials.licensePlate.data as { plateNumber: string; vehicleType: string };
      return (
        <div className="space-y-4">
          <div className="aspect-video bg-gradient-to-br from-blue-900 to-blue-950 rounded-xl flex items-center justify-center">
            <div className="bg-white px-12 py-6 rounded-lg shadow-2xl">
              <p className="text-4xl font-black text-black tracking-wider">{plateData.plateNumber}</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-white/60 mb-1">车辆类型</p>
            <p className="text-lg font-bold text-white">{plateData.vehicleType}</p>
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
        <div className="bg-white text-gray-900 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <h3 className="text-xl font-bold">预约单</h3>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                bookingData.valid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
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
      );

    case 'dangerous':
      if (!vehicle.materials.dangerousMark) {
        return (
          <div className="h-full flex items-center justify-center py-12">
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
        <div className="space-y-6">
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
}
