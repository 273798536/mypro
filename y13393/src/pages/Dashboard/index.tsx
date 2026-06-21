import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  Server, 
  Clock, 
  Radio, 
  RefreshCw,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSnapshotStore } from '@/store/snapshotStore';
import { useExceptionStore } from '@/store/exceptionStore';
import StatCard from '@/components/cards/StatCard';
import ParameterCard from '@/components/cards/ParameterCard';
import FormulaCard from '@/components/cards/FormulaCard';
import { formatCurrency, formatNumber, getStatusColor, getStatusLabel } from '@/utils/formatters';
import { getCostBreakdown } from '@/services/costCalculator';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#3B82F6', '#10B981'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentSnapshotId, snapshots, setCurrentSnapshot, recalculateCost } = useSnapshotStore();
  const { getOpenExceptions, getExceptionsForSnapshot } = useExceptionStore();
  const [editableParams, setEditableParams] = useState<Record<string, number>>({});

  const currentSnapshot = snapshots.find(s => s.id === currentSnapshotId);
  const openExceptions = getOpenExceptions();
  const snapshotExceptions = currentSnapshot ? getExceptionsForSnapshot(currentSnapshot.id) : [];

  const handleParamChange = (name: string, value: number) => {
    setEditableParams(prev => ({ ...prev, [name]: value }));
  };

  const handleRecalculate = () => {
    if (currentSnapshotId && Object.keys(editableParams).length > 0) {
      recalculateCost(currentSnapshotId, editableParams);
      setEditableParams({});
    }
  };

  if (!currentSnapshot) {
    return <div className="text-slate-400">加载中...</div>;
  }

  const costBreakdown = getCostBreakdown(currentSnapshot);
  const hasErrors = currentSnapshot.status === 'error';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <motion.h1 
            className="text-3xl font-bold text-white mb-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            联邦客户端成本看板
          </motion.h1>
          <motion.p 
            className="text-slate-400"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            实时监控联邦学习客户端训练成本，追溯参数变更历史
          </motion.p>
        </div>

        <div className="flex items-center gap-4">
          <select
            value={currentSnapshotId || ''}
            onChange={(e) => setCurrentSnapshot(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {snapshots.map(snap => (
              <option key={snap.id} value={snap.id}>
                {snap.version} - {snap.modelVersion}
              </option>
            ))}
          </select>

          <button
            onClick={handleRecalculate}
            disabled={Object.keys(editableParams).length === 0}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            重新计算
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">当前状态:</span>
          <span className={`badge ${hasErrors ? 'badge-error animate-breathe' : 'badge-normal'}`}>
            {getStatusLabel(currentSnapshot.status)}
          </span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="text-sm text-slate-400">
          版本: <span className="text-white font-mono-display">{currentSnapshot.version}</span>
        </div>
        <div className="text-sm text-slate-400">
          模型: <span className="text-white font-mono-display">{currentSnapshot.modelVersion}</span>
        </div>
        <div className="text-sm text-slate-400">
          操作人: <span className="text-white">{currentSnapshot.operator}</span>
        </div>
        {snapshotExceptions.length > 0 && (
          <button
            onClick={() => navigate('/exceptions')}
            className="ml-auto flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{snapshotExceptions.length} 个异常待处理</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="总成本"
          value={formatCurrency(currentSnapshot.totalCost).replace('¥', '')}
          unit="元"
          icon={DollarSign}
          trend={48.9}
          trendLabel="较基线"
          color={hasErrors ? 'red' : 'blue'}
          delay={0.1}
        />
        <StatCard
          title="客户端数量"
          value={formatNumber(currentSnapshot.parameters.find(p => p.name === '客户端数量')?.value || 0, 0)}
          unit="台"
          icon={Server}
          delay={0.2}
        />
        <StatCard
          title="单轮训练时长"
          value={formatNumber(currentSnapshot.parameters.find(p => p.name === '单轮训练时长')?.value || 0, 1)}
          unit="小时"
          icon={Clock}
          delay={0.3}
        />
        <StatCard
          title="灰度比例"
          value={formatNumber(currentSnapshot.parameters.find(p => p.name === '灰度比例')?.value || 0, 0)}
          unit="%"
          icon={Radio}
          color={currentSnapshot.parameters.find(p => p.name === '灰度比例')?.value || 0 > 50 ? 'red' : 'emerald'}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <FormulaCard 
            parameters={currentSnapshot.parameters} 
            totalCost={currentSnapshot.totalCost}
          />

          <div className="grid grid-cols-2 gap-6">
            {currentSnapshot.parameters.map((param, index) => (
              <ParameterCard
                key={param.id}
                parameter={param}
                delay={0.5 + index * 0.1}
                editable
                onValueChange={handleParamChange}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4">成本构成</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {costBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), '']}
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {costBreakdown.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-slate-400">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-mono-display">{formatCurrency(item.value)}</span>
                    <span className="text-slate-500 ml-2">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {openExceptions.length > 0 && (
            <motion.div
              className="card border-amber-500/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">待处理异常</h3>
                  <p className="text-sm text-slate-400">{openExceptions.length} 个异常需要处理</p>
                </div>
              </div>
              <div className="space-y-3">
                {openExceptions.slice(0, 2).map(ex => (
                  <div
                    key={ex.id}
                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white">{ex.parameterName}</span>
                      <span className="badge badge-error">异常</span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{ex.impact}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/exceptions')}
                className="w-full mt-4 btn btn-outline text-sm"
              >
                前往异常处理中心
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
