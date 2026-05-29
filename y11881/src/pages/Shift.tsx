import { motion } from 'framer-motion';
import { CalendarClock, User, Clock, Play, Square, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function Shift() {
  const { shifts, transactions, currentShift, setCurrentShift } = useStore();

  const getShiftStats = (shiftId: string) => {
    const shiftTxs = transactions.filter((t) => t.shiftId === shiftId);
    return {
      txCount: shiftTxs.length,
      totalChange: shiftTxs.reduce((sum, t) => sum + t.changeAmount, 0),
      warningCount: shiftTxs.filter((t) => t.status === 'warning').length,
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-800">班次管理</h1>
          <p className="text-gray-500 mt-1">管理交接班、查看班次历史记录</p>
        </div>
      </motion.div>

      {currentShift && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
            <Card.Body className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                    <CalendarClock className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold">{currentShift.name}</h2>
                      <Badge variant="success" pulse>
                        进行中
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-slate-300 text-sm mt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>{currentShift.operator}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>开始于 {currentShift.startTime.toLocaleTimeString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-300">本班次找零总额</div>
                  <div className="text-3xl font-bold">
                    ¥{getShiftStats(currentShift.id).totalChange.toFixed(2)}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <Card.Header>
            <h2 className="text-lg font-semibold text-slate-800">班次列表</h2>
          </Card.Header>
          <Card.Body>
            <div className="space-y-3">
              {shifts.map((shift, index) => {
                const stats = getShiftStats(shift.id);
                const isActive = shift.status === 'active';
                return (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                  >
                    <div
                      className={`p-4 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              isActive
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {isActive ? (
                              <Play className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800">{shift.name}</span>
                              {isActive && (
                                <Badge variant="info">当前</Badge>
                              )}
                              {shift.status === 'completed' && (
                                <Badge variant="neutral">已完成</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                              <span>{shift.operator}</span>
                              <span>·</span>
                              <span>
                                {shift.startTime.toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-800">
                              {stats.txCount}
                            </div>
                            <div className="text-xs text-gray-500">交易笔数</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-800">
                              ¥{stats.totalChange.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">找零总额</div>
                          </div>
                          {stats.warningCount > 0 && (
                            <div className="text-center">
                              <div className="text-xl font-bold text-amber-600">
                                {stats.warningCount}
                              </div>
                              <div className="text-xs text-gray-500">警告</div>
                            </div>
                          )}
                          {!isActive && (
                            <button
                              onClick={() => setCurrentShift(shift.id)}
                              className="p-2 text-gray-400 hover:text-slate-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card.Body>
        </Card>
      </motion.div>
    </div>
  );
}
