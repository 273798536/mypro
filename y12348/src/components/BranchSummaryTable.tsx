import React from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Droplets,
  Settings,
  Clock,
} from 'lucide-react';
import type { CalculationSession, PressureUnit, Branch } from '@/types';
import { VALVE_NAMES } from '@/data/valveCoefficients';
import { FLUID_NAMES } from '@/data/fluidProperties';
import { formatNumber, cn } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BranchSummaryTableProps {
  session: CalculationSession;
  pressureUnit: PressureUnit;
}

export const BranchSummaryTable: React.FC<BranchSummaryTableProps> = ({
  session,
  pressureUnit,
}) => {
  const { branches, results, totalFlowRate, flowRateUnit } = session;

  if (!results) return null;

  const branchSummaryData = branches.map(branch => {
    const branchFlowRate = totalFlowRate * branch.flowRateRatio;
    let totalHeadLoss = 0;
    let totalFrictionLoss = 0;
    let totalLocalLoss = 0;
    let totalValveLoss = 0;

    branch.segments.forEach(segment => {
      const segResult = results.segmentResults[segment.id];
      if (segResult) {
        totalFrictionLoss += segResult.frictionLoss.value;
        totalLocalLoss += segResult.localLoss.value;
        totalValveLoss += segResult.valveLoss.value;
        totalHeadLoss += segResult.totalLoss.value;
      }
    });

    return {
      id: branch.id,
      name: branch.name,
      flowRateRatio: branch.flowRateRatio,
      flowRate: branchFlowRate,
      segmentCount: branch.segments.length,
      frictionLoss: totalFrictionLoss,
      localLoss: totalLocalLoss,
      valveLoss: totalValveLoss,
      totalHeadLoss,
      valveType: branch.valveConfig.valveType,
      valveOpening: branch.valveConfig.openingPercentage,
      isHalfOpen: branch.valveConfig.isHalfOpen,
      isMissingData: branch.isMissingData,
      missingFields: branch.missingFields,
    };
  });

  const chartData = branchSummaryData.map(b => ({
    name: b.name,
    沿程阻力: b.frictionLoss,
    局部阻力: b.localLoss,
    阀门阻力: b.valveLoss,
  }));

  const totalRatio = branches.reduce((sum, b) => sum + b.flowRateRatio, 0);
  const isRatioValid = Math.abs(totalRatio - 1) < 0.01;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="tech-card p-5"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary-800 rounded">
            <Table className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h3 className="font-semibold text-industrial-text">支路汇总表</h3>
            <p className="text-xs text-industrial-textMuted">
              共 {branches.length} 条支路 | 口径: {flowRateUnit}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-industrial-textMuted">流量分配总和:</span>
          <span className={cn(
            'text-xs font-mono',
            isRatioValid ? 'text-success-400' : 'text-danger-400'
          )}>
            {(totalRatio * 100).toFixed(1)}%
          </span>
          {isRatioValid ? (
            <CheckCircle className="w-4 h-4 text-success-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-danger-500" />
          )}
        </div>
      </div>

      {branchSummaryData.length > 0 ? (
        <>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-industrial-border">
                  <th className="text-left py-3 px-3 text-industrial-textMuted font-medium">支路</th>
                  <th className="text-right py-3 px-3 text-industrial-textMuted font-medium">流量分配</th>
                  <th className="text-right py-3 px-3 text-industrial-textMuted font-medium">流量 ({flowRateUnit})</th>
                  <th className="text-right py-3 px-3 text-industrial-textMuted font-medium">沿程 (m)</th>
                  <th className="text-right py-3 px-3 text-industrial-textMuted font-medium">局部 (m)</th>
                  <th className="text-right py-3 px-3 text-industrial-textMuted font-medium">阀门 (m)</th>
                  <th className="text-right py-3 px-3 text-industrial-textMuted font-medium">总阻力 (m)</th>
                  <th className="text-center py-3 px-3 text-industrial-textMuted font-medium">阀门</th>
                  <th className="text-center py-3 px-3 text-industrial-textMuted font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {branchSummaryData.map((branch, index) => (
                  <motion.tr
                    key={branch.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      'border-b border-industrial-border/50 hover:bg-primary-900/20 transition-colors',
                      branch.isMissingData && 'bg-danger-500/5'
                    )}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <GitBranch className="w-4 h-4 text-primary-400" />
                        <span className="font-medium text-industrial-text">{branch.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-industrial-text">
                      {(branch.flowRateRatio * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-industrial-text">
                      {formatNumber(branch.flowRate)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-400">
                      {formatNumber(branch.frictionLoss)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-orange-400">
                      {formatNumber(branch.localLoss)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-red-400">
                      {formatNumber(branch.valveLoss)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-primary-400">
                      {formatNumber(branch.totalHeadLoss)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs text-industrial-textMuted">
                          {VALVE_NAMES[branch.valveType]}
                        </span>
                        <span className={cn(
                          'text-xs font-mono',
                          branch.isHalfOpen ? 'text-warning-400' : 'text-success-400'
                        )}>
                          {branch.valveOpening}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {branch.isMissingData ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <XCircle className="w-4 h-4 text-danger-500" />
                          <span className="text-xs text-danger-400">
                            {branch.missingFields.length}项缺失
                          </span>
                        </div>
                      ) : (
                        <CheckCircle className="w-4 h-4 text-success-500 mx-auto" />
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-industrial-border bg-primary-900/20">
                  <td className="py-3 px-3 font-semibold text-industrial-text">合计</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-industrial-text">
                    {(totalRatio * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-industrial-text">
                    {formatNumber(totalFlowRate)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-blue-400">
                    {formatNumber(branchSummaryData.reduce((s, b) => s + b.frictionLoss, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-orange-400">
                    {formatNumber(branchSummaryData.reduce((s, b) => s + b.localLoss, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-red-400">
                    {formatNumber(branchSummaryData.reduce((s, b) => s + b.valveLoss, 0))}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-primary-400">
                    {formatNumber(branchSummaryData.reduce((s, b) => s + b.totalHeadLoss, 0))}
                  </td>
                  <td className="py-3 px-3" />
                  <td className="py-3 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          {chartData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-industrial-text mb-3">
                支路阻力对比 (m)
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <GitBranch className="w-12 h-12 text-industrial-textMuted mx-auto mb-3" />
          <p className="text-industrial-textMuted">暂无支路数据</p>
          <p className="text-xs text-industrial-textMuted/70 mt-1">
            请在输入页面添加支路后重新计算
          </p>
        </div>
      )}
    </motion.div>
  );
};
