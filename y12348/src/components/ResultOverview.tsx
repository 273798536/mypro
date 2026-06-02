import React from 'react';
import { motion } from 'framer-motion';
import {
  Gauge,
  ArrowDown,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Droplets,
  Thermometer,
  Ruler,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { CalculationSession, PressureUnit } from '@/types';
import { FLUID_NAMES } from '@/data/fluidProperties';
import { formatNumber, cn } from '@/lib/utils';

interface ResultOverviewProps {
  session: CalculationSession;
  pressureUnit: PressureUnit;
}

export const ResultOverview: React.FC<ResultOverviewProps> = ({
  session,
  pressureUnit,
}) => {
  const { results, fluid, totalFlowRate, flowRateUnit } = session;

  if (!results) return null;

  const hasErrors = results.contradictions.some(c => c.severity === 'error');
  const hasWarnings = results.contradictions.some(c => c.severity === 'warning');

  const segmentData = Object.entries(results.segmentResults).map(([id, result]) => {
    const segment = session.mainSegments.find(s => s.id === id) ||
      session.branches.flatMap(b => b.segments).find(s => s.id === id);

    return {
      name: segment?.name || id,
      沿程阻力: result.frictionLoss.value,
      局部阻力: result.localLoss.value,
      阀门阻力: result.valveLoss.value,
    };
  });

  const lossDistribution = [
    { name: '沿程阻力', value: Object.values(results.segmentResults).reduce((sum, r) => sum + r.frictionLoss.value, 0), color: '#1E88E5' },
    { name: '局部阻力', value: Object.values(results.segmentResults).reduce((sum, r) => sum + r.localLoss.value, 0), color: '#FF8F00' },
    { name: '阀门阻力', value: Object.values(results.segmentResults).reduce((sum, r) => sum + r.valveLoss.value, 0), color: '#C62828' },
  ];

  const totalLoss = lossDistribution.reduce((sum, item) => sum + item.value, 0);

  const matchScore = calculateMatchScore(results, session);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="tech-card p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500" />
        
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-industrial-text mb-1">压降计算结果</h2>
            <p className="text-sm text-industrial-textMuted">
              {new Date().toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasErrors && (
              <div className="flex items-center gap-1 px-3 py-1 bg-danger-500/20 text-danger-400 rounded text-sm border border-danger-500/50">
                <AlertTriangle className="w-4 h-4" />
                存在错误
              </div>
            )}
            {hasWarnings && !hasErrors && (
              <div className="flex items-center gap-1 px-3 py-1 bg-warning-500/20 text-warning-400 rounded text-sm border border-warning-500/50">
                <AlertTriangle className="w-4 h-4" />
                存在警告
              </div>
            )}
            {!hasErrors && !hasWarnings && (
              <div className="flex items-center gap-1 px-3 py-1 bg-success-500/20 text-success-400 rounded text-sm border border-success-500/50">
                <CheckCircle className="w-4 h-4" />
                计算正常
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-primary-900/30 rounded border border-primary-700/30 text-center">
            <div className="flex items-center justify-center gap-2 text-industrial-textMuted text-sm mb-2">
              <ArrowDown className="w-4 h-4" />
              总压降
            </div>
            <div className="font-mono text-3xl font-bold text-primary-400">
              {formatNumber(results.totalPressureDrop)}
            </div>
            <div className="text-sm text-industrial-textMuted">{results.pressureDropUnit}</div>
          </div>

          <div className="p-4 bg-primary-900/30 rounded border border-primary-700/30 text-center">
            <div className="flex items-center justify-center gap-2 text-industrial-textMuted text-sm mb-2">
              <Droplets className="w-4 h-4" />
              总流量
            </div>
            <div className="font-mono text-3xl font-bold text-industrial-text">
              {formatNumber(totalFlowRate)}
            </div>
            <div className="text-sm text-industrial-textMuted">{flowRateUnit}</div>
          </div>

          <div className="p-4 bg-primary-900/30 rounded border border-primary-700/30 text-center">
            <div className="flex items-center justify-center gap-2 text-industrial-textMuted text-sm mb-2">
              <Thermometer className="w-4 h-4" />
              流体参数
            </div>
            <div className="font-mono text-lg font-bold text-industrial-text">
              {FLUID_NAMES[fluid.type]} @ {fluid.temperature}°C
            </div>
            <div className="text-xs text-industrial-textMuted mt-1">
              ρ={formatNumber(fluid.density)} kg/m³
            </div>
          </div>

          <div className="p-4 bg-primary-900/30 rounded border border-primary-700/30 text-center">
            <div className="flex items-center justify-center gap-2 text-industrial-textMuted text-sm mb-2">
              <Gauge className="w-4 h-4" />
              匹配度评分
            </div>
            <div className={cn(
              'font-mono text-3xl font-bold',
              matchScore >= 80 ? 'text-success-400' :
              matchScore >= 60 ? 'text-warning-400' : 'text-danger-400'
            )}>
              {matchScore}
            </div>
            <div className="text-sm text-industrial-textMuted">分</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-industrial-text mb-3 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-primary-400" />
              各段阻力分布 (m)
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2D4A73" />
                  <XAxis dataKey="name" stroke="#9FA8DA" fontSize={11} />
                  <YAxis stroke="#9FA8DA" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#243B5C',
                      border: '1px solid #2D4A73',
                      borderRadius: '4px',
                      color: '#E8EAF6',
                    }}
                    formatter={(value: number) => formatNumber(value) + ' m'}
                  />
                  <Bar dataKey="沿程阻力" stackId="a" fill="#1E88E5" />
                  <Bar dataKey="局部阻力" stackId="a" fill="#FF8F00" />
                  <Bar dataKey="阀门阻力" stackId="a" fill="#C62828" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-industrial-text mb-3 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary-400" />
              阻力类型占比
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lossDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                    labelLine={false}
                  >
                    {lossDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value) + ' m', '阻力']}
                    contentStyle={{
                      backgroundColor: '#243B5C',
                      border: '1px solid #2D4A73',
                      borderRadius: '4px',
                      color: '#E8EAF6',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-900/20 rounded border border-primary-700/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning-500" />
            <span className="text-sm font-medium text-industrial-text">计算公式摘要</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-industrial-textMuted">
            <div className="p-2 bg-primary-900/30 rounded">
              <span className="text-primary-400">雷诺数:</span> Re = v·d/ν
            </div>
            <div className="p-2 bg-primary-900/30 rounded">
              <span className="text-primary-400">沿程阻力:</span> hf = f·(L/d)·(v²/2g)
            </div>
            <div className="p-2 bg-primary-900/30 rounded">
              <span className="text-primary-400">摩擦系数:</span> 1/√f = -2log(ε/(3.7d)+2.51/(Re√f))
            </div>
            <div className="p-2 bg-primary-900/30 rounded">
              <span className="text-primary-400">总压降:</span> ΔP = ρ·g·(hf+hl+hv)
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

function calculateMatchScore(results: NonNullable<CalculationSession['results']>, session: CalculationSession): number {
  let score = 100;
  const errors = results.contradictions.filter(c => c.severity === 'error');
  const warnings = results.contradictions.filter(c => c.severity === 'warning');
  score -= errors.length * 20;
  score -= warnings.length * 10;
  score -= results.unitValidations.filter(v => v.errorType !== 'none').length * 5;
  const hasHalfOpenValve = session.mainValve.isHalfOpen || 
    session.branches.some(b => b.valveConfig.isHalfOpen);
  if (hasHalfOpenValve) score -= 5;
  const hasMissingData = session.branches.some(b => b.isMissingData);
  if (hasMissingData) score -= 15;
  return Math.max(0, Math.min(100, score));
}
