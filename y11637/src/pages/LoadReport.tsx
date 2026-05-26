import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Package,
  Home,
} from 'lucide-react';
import { getSessionById, getLevelById } from '../utils/storage';
import type { GameSession, Level, CargoBox, Compartment } from '../types';
import { ZONE_LABELS } from '../types';
import { formatTime } from '../utils/game';

export default function LoadReport() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<GameSession | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const foundSession = getSessionById(sessionId);
    if (!foundSession) {
      navigate('/');
      return;
    }

    setSession(foundSession);

    const foundLevel = getLevelById(foundSession.levelId);
    if (foundLevel) {
      setLevel(foundLevel);
    }
  }, [sessionId, navigate]);

  const usedTime = useMemo(() => {
    if (!session || !level) return 0;
    const totalTime = (session.endTime || Date.now()) - session.startTime - session.pauseDuration;
    return Math.floor(totalTime / 1000);
  }, [session, level]);

  const exportReport = () => {
    if (!session || !level) return;

    const report = {
      exportedAt: new Date().toISOString(),
      sessionId: session.id,
      level: {
        id: level.id,
        name: level.name,
        difficulty: level.difficulty,
        source: level.source,
        version: level.version,
      },
      score: session.score,
      usedTime,
      timeLimit: level.timeLimit,
      errors: session.errors,
      actions: session.actions,
      loadingResult: Array.from(session.placedCargos.entries()).map(([compartmentId, cargoId]) => {
        const cargo = level.cargoBoxes.find((c) => c.id === cargoId);
        const compartment = level.compartments.find((c) => c.id === compartmentId);
        return {
          compartmentId,
          cargoId,
          cargoName: cargo?.name,
          cargoZone: cargo?.zone,
          compartmentZone: compartment?.zone,
          destination: cargo?.destination,
          priority: cargo?.priority,
        };
      }),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `装载报告_${level.name}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReplay = () => {
    if (level) {
      navigate(`/game/${level.id}`);
    }
  };

  if (!session || !level || !session.score) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const score = session.score;
  const totalPossible =
    score.baseScore +
    level.cargoBoxes.length * 5 +
    level.cargoBoxes.length * 3 +
    level.timeLimit * 0.5;
  const scorePercentage = Math.min(100, (score.total / totalPossible) * 100);

  const getScoreGrade = () => {
    if (scorePercentage >= 90) return { label: '优秀', color: 'text-status-success' };
    if (scorePercentage >= 70) return { label: '良好', color: 'text-primary-500' };
    if (scorePercentage >= 50) return { label: '及格', color: 'text-status-warning' };
    return { label: '需加强', color: 'text-status-error' };
  };

  const grade = getScoreGrade();

  const zoneStats = useMemo(() => {
    const stats: Record<string, { correct: number; wrong: number; total: number }> = {
      frozen: { correct: 0, wrong: 0, total: 0 },
      chilled: { correct: 0, wrong: 0, total: 0 },
      ambient: { correct: 0, wrong: 0, total: 0 },
    };

    level.cargoBoxes.forEach((cargo) => {
      stats[cargo.zone].total++;
    });

    Array.from(session.placedCargos.entries()).forEach(([compartmentId, cargoId]) => {
      const cargo = level.cargoBoxes.find((c) => c.id === cargoId);
      const compartment = level.compartments.find((c) => c.id === compartmentId);
      if (cargo && compartment) {
        if (cargo.zone === compartment.zone) {
          stats[cargo.zone].correct++;
        } else {
          stats[cargo.zone].wrong++;
        }
      }
    });

    return stats;
  }, [level, session.placedCargos]);

  const zoneColors: Record<string, string> = {
    frozen: 'bg-zone-frozen',
    chilled: 'bg-zone-chilled',
    ambient: 'bg-zone-ambient',
  };

  return (
    <div className="min-h-screen py-8 px-4 pb-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>返回关卡</span>
          </button>
          <div className="flex gap-3">
            <button onClick={exportReport} className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              导出报告
            </button>
            <button onClick={handleReplay} className="btn-primary flex items-center gap-2">
              <RotateCcw size={18} />
              再玩一次
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-8 mb-8 text-center"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-2">装载报告</h1>
          <p className="text-gray-500 mb-6">
            {level.name} · 来源: {level.source} · 版本 v{level.version}
          </p>

          <div className="relative inline-block mb-6">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="#e5e7eb"
                strokeWidth="12"
                fill="none"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke={
                  scorePercentage >= 70
                    ? '#2ECC71'
                    : scorePercentage >= 50
                    ? '#FFBF00'
                    : '#E71D36'
                }
                strokeWidth="12"
                fill="none"
                strokeDasharray={440}
                strokeDashoffset={440 - (440 * scorePercentage) / 100}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 440 }}
                animate={{ strokeDashoffset: 440 - (440 * scorePercentage) / 100 }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-800">{score.total}</span>
              <span className={`text-sm font-medium ${grade.color}`}>{grade.label}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-gray-800">{score.baseScore}</div>
              <div className="text-sm text-gray-500">基础分</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-status-success">+{score.zoneCorrectness}</div>
              <div className="text-sm text-gray-500">温层正确</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-primary-500">+{score.unloadOrder}</div>
              <div className="text-sm text-gray-500">顺序合理</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-yellow-600">+{score.timeBonus}</div>
              <div className="text-sm text-gray-500">时间奖励</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-gray-600">
            <Clock size={18} />
            <span>
              用时 {formatTime(usedTime)} / 限制 {formatTime(level.timeLimit)}
            </span>
          </div>
        </motion.div>

        {score.deductions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6 mb-8 bg-red-50 border-red-100"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <XCircle size={20} className="text-status-error" />
              扣分明细
            </h2>
            <div className="space-y-3">
              {score.deductions.map((deduction, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {deduction.type === 'zone_mismatch' && (
                      <AlertTriangle size={18} className="text-status-error" />
                    )}
                    {deduction.type === 'unload_order' && (
                      <AlertTriangle size={18} className="text-status-warning" />
                    )}
                    {deduction.type === 'timeout' && (
                      <Clock size={18} className="text-status-warning" />
                    )}
                    <span className="text-gray-700">{deduction.reason}</span>
                  </div>
                  <span className="font-bold text-status-error">-{deduction.amount}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={20} className="text-primary-500" />
            温层合规检查
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(zoneStats).map(([zone, stat]) => (
              <div key={zone} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`w-3 h-3 rounded-full ${zoneColors[zone]}`}></span>
                  <span className="font-medium text-gray-700">{ZONE_LABELS[zone as keyof typeof ZONE_LABELS]}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">应装数量</span>
                    <span className="font-medium">{stat.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">正确放置</span>
                    <span className="font-medium text-status-success">{stat.correct}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">温层错误</span>
                    <span className="font-medium text-status-error">{stat.wrong}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">正确率</span>
                    <span className={`font-bold ${
                      stat.total > 0 && stat.correct === stat.total
                        ? 'text-status-success'
                        : stat.wrong > 0
                        ? 'text-status-error'
                        : 'text-gray-600'
                    }`}>
                      {stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {session.errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6 mb-8"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-status-warning" />
              错误回溯
            </h2>
            <div className="space-y-3">
              {session.errors.map((error, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    error.type === 'zone_mismatch'
                      ? 'bg-red-50 border-status-error'
                      : error.type === 'unload_order'
                      ? 'bg-yellow-50 border-status-warning'
                      : 'bg-orange-50 border-orange-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {error.type === 'zone_mismatch' && (
                      <XCircle size={20} className="text-status-error mt-0.5 flex-shrink-0" />
                    )}
                    {error.type === 'unload_order' && (
                      <AlertTriangle size={20} className="text-status-warning mt-0.5 flex-shrink-0" />
                    )}
                    {error.type === 'timeout' && (
                      <Clock size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-gray-800">{error.message}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(error.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-6"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-primary-500" />
            卸货顺序检查
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">货箱</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">温层</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">目的站点</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">优先级</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {level.cargoBoxes
                  .sort((a, b) => a.priority - b.priority)
                  .map((cargo) => {
                    const isPlaced = Array.from(session.placedCargos.values()).includes(cargo.id);
                    const compartment = level.compartments.find(
                      (c) => session.placedCargos.get(c.id) === cargo.id
                    );
                    const isZoneCorrect = compartment && compartment.zone === cargo.zone;
                    const station = level.stations.find((s) => s.id === cargo.destination);

                    return (
                      <tr key={cargo.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 px-4">
                          <span className="font-medium text-gray-800">{cargo.name}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded text-white ${zoneColors[cargo.zone]}`}
                          >
                            {ZONE_LABELS[cargo.zone]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{station?.name}</td>
                        <td className="py-3 px-4 text-gray-600">{cargo.priority}</td>
                        <td className="py-3 px-4">
                          {isPlaced ? (
                            isZoneCorrect ? (
                              <span className="flex items-center gap-1 text-status-success">
                                <CheckCircle size={16} />
                                正确
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-status-error">
                                <XCircle size={16} />
                                温层错误
                              </span>
                            )
                          ) : (
                            <span className="text-gray-400">未装载</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn-secondary flex items-center gap-2"
            >
              <Home size={18} />
              返回首页
            </button>
            <button onClick={exportReport} className="btn-secondary flex items-center gap-2">
              <Download size={18} />
              导出报告
            </button>
            <button onClick={handleReplay} className="btn-primary flex items-center gap-2">
              <RotateCcw size={18} />
              再玩一次
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
