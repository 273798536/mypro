import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Play,
  CheckCheck
} from 'lucide-react';
import { useExceptionStore } from '@/store/exceptionStore';
import type { Exception } from '@/types';
import { formatNumber } from '@/utils/formatters';

const statusConfig = {
  open: { label: '待处理', color: 'red', icon: AlertCircle },
  in_progress: { label: '处理中', color: 'amber', icon: Play },
  resolved: { label: '已解决', color: 'emerald', icon: CheckCheck },
};

const typeConfig = {
  grayscale_ratio: { label: '灰度比例异常', color: 'red' },
  parameter_out_of_bound: { label: '参数超出边界', color: 'amber' },
  formula_mismatch: { label: '公式不匹配', color: 'purple' },
};

export default function Exceptions() {
  const { exceptions, updateExceptionStatus } = useExceptionStore();
  const [expandedId, setExpandedId] = useState<string | null>(exceptions[0]?.id || null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean[]>>({});

  const handleStepToggle = (exceptionId: string, stepIndex: number) => {
    setCompletedSteps(prev => {
      const current = prev[exceptionId] || [];
      const updated = [...current];
      updated[stepIndex] = !updated[stepIndex];
      return { ...prev, [exceptionId]: updated };
    });
  };

  const handleStatusChange = (exception: Exception, newStatus: Exception['status']) => {
    updateExceptionStatus(exception.id, newStatus);
    if (newStatus === 'in_progress') {
      setCompletedSteps(prev => ({
        ...prev,
        [exception.id]: prev[exception.id] || exception.steps.map(() => false)
      }));
    }
  };

  const getProgress = (exception: Exception) => {
    const steps = completedSteps[exception.id] || [];
    const completed = steps.filter(Boolean).length;
    return { completed, total: exception.steps.length, percent: (completed / exception.steps.length) * 100 };
  };

  return (
    <div className="space-y-8">
      <div>
        <motion.h1 
          className="text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          异常处理中心
        </motion.h1>
        <motion.p 
          className="text-slate-400"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          自动检测参数异常，提供可操作的分步处理指引
        </motion.p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div
          className="card border-red-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">待处理异常</p>
              <p className="text-3xl font-bold text-white font-mono-display">
                {exceptions.filter(e => e.status === 'open').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card border-amber-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Play className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">处理中</p>
              <p className="text-3xl font-bold text-white font-mono-display">
                {exceptions.filter(e => e.status === 'in_progress').length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="card border-emerald-500/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <CheckCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">已解决</p>
              <p className="text-3xl font-bold text-white font-mono-display">
                {exceptions.filter(e => e.status === 'resolved').length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="space-y-4">
        {exceptions.map((exception, index) => {
          const StatusIcon = statusConfig[exception.status].icon;
          const progress = getProgress(exception);
          const isExpanded = expandedId === exception.id;
          const steps = completedSteps[exception.id] || [];

          return (
            <motion.div
              key={exception.id}
              className="card overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : exception.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      exception.status === 'open' ? 'bg-red-500/20' :
                      exception.status === 'in_progress' ? 'bg-amber-500/20' :
                      'bg-emerald-500/20'
                    }`}>
                      {exception.type === 'grayscale_ratio' || exception.type === 'parameter_out_of_bound' ? (
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                      ) : (
                        <StatusIcon className={`w-6 h-6 ${
                          exception.status === 'open' ? 'text-red-400' :
                          exception.status === 'in_progress' ? 'text-amber-400' :
                          'text-emerald-400'
                        }`} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white text-lg">
                          {exception.parameterName}
                        </h3>
                        <span className={`badge badge-${typeConfig[exception.type].color}`}>
                          {typeConfig[exception.type].label}
                        </span>
                        <span className={`badge badge-${statusConfig[exception.status].color}`}>
                          {statusConfig[exception.status].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>
                          当前值: <span className="text-red-400 font-mono-display">{formatNumber(exception.currentValue)}</span>
                        </span>
                        <span>
                          预期值: <span className="text-emerald-400 font-mono-display">{formatNumber(exception.expectedValue)}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {exception.status === 'in_progress' && (
                      <div className="text-right">
                        <p className="text-sm text-slate-400">处理进度</p>
                        <div className="flex items-center gap-2">
                          <div className="w-32 progress-bar">
                            <div
                              className="progress-fill bg-amber-500"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <span className="text-sm text-white font-mono-display">
                            {progress.completed}/{progress.total}
                          </span>
                        </div>
                      </div>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
              </div>

              <motion.div
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-6 mt-6 border-t border-slate-700/50 space-y-6">
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <h4 className="font-medium text-red-400 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      影响分析
                    </h4>
                    <p className="text-slate-300">{exception.impact}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        处理步骤
                      </h4>
                      <div className="flex gap-2">
                        {exception.status === 'open' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(exception, 'in_progress');
                            }}
                            className="btn btn-primary text-sm"
                          >
                            <Play className="w-4 h-4" />
                            开始处理
                          </button>
                        )}
                        {exception.status === 'in_progress' && progress.completed === progress.total && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(exception, 'resolved');
                            }}
                            className="btn btn-success text-sm"
                          >
                            <CheckCheck className="w-4 h-4" />
                            标记已解决
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {exception.steps.map((step, stepIndex) => (
                        <div
                          key={stepIndex}
                          className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                            steps[stepIndex]
                              ? 'bg-emerald-500/5 border-emerald-500/30'
                              : 'bg-slate-900/30 border-slate-700/50'
                          } ${exception.status !== 'in_progress' ? 'opacity-60' : ''}`}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (exception.status === 'in_progress') {
                                handleStepToggle(exception.id, stepIndex);
                              }
                            }}
                            disabled={exception.status !== 'in_progress'}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                              steps[stepIndex]
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-500 text-transparent hover:border-blue-400'
                            } disabled:cursor-not-allowed`}
                          >
                            {steps[stepIndex] && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-slate-500 font-mono-display">
                                步骤 {stepIndex + 1}
                              </span>
                              {steps[stepIndex] && (
                                <span className="text-xs text-emerald-400">已完成</span>
                              )}
                            </div>
                            <p className={`${steps[stepIndex] ? 'text-slate-400 line-through' : 'text-white'}`}>
                              {step}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {exception.status === 'resolved' && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="text-emerald-400 font-medium">异常已解决</p>
                        <p className="text-sm text-slate-400">
                          处理结果已记录，相关参数已同步至历史时间线
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
