import React, { useEffect, useMemo, useCallback } from 'react';
import {
  LayoutDashboard,
  FileUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Database,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { useThresholdStore } from '../stores/thresholdStore';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, AbnormalLevelBadge } from '../components/ui/Badge';
import { formatDistance, formatPercent } from '../utils/helpers';
import { ABNORMAL_LEVEL_LABELS } from '../utils/constants';
import type { RecordWithDetails } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    inspectionRecords,
    abnormalDetections,
    badRows,
    brakeCalculations,
    loadDemoData,
    isLoading,
  } = useDataStore();
  const { config: thresholdConfig } = useThresholdStore();

  useEffect(() => {
    loadDemoData();
  }, [loadDemoData]);

  const stats = useMemo(() => {
    const totalRecords = inspectionRecords.length;
    const passCount = abnormalDetections.filter(d => d.overallResult === 'pass').length;
    const failCount = abnormalDetections.filter(d => d.overallResult === 'fail').length;
    const passRate = totalRecords > 0 ? (passCount / totalRecords) * 100 : 0;

    const levelCounts = {
      normal: abnormalDetections.filter(d => d.overallLevel === 'normal').length,
      warning: abnormalDetections.filter(d => d.overallLevel === 'warning').length,
      serious: abnormalDetections.filter(d => d.overallLevel === 'serious').length,
      overload: abnormalDetections.filter(d => d.overallLevel === 'overload').length,
    };

    const typeCounts = {
      speed_gap: abnormalDetections.filter(d => d.detectedTypes.includes('speed_gap')).length,
      brake_delay: abnormalDetections.filter(d => d.detectedTypes.includes('brake_delay')).length,
      overload: abnormalDetections.filter(d => d.detectedTypes.includes('overload')).length,
      brake_distance: abnormalDetections.filter(d => d.detectedTypes.includes('brake_distance')).length,
      missing_data: abnormalDetections.filter(d => d.detectedTypes.includes('missing_data')).length,
    };

    const avgBrakeDistance = brakeCalculations.length > 0
      ? brakeCalculations.reduce((sum, c) => sum + c.actualBrakeDistance, 0) / brakeCalculations.length
      : 0;

    return {
      totalRecords,
      passCount,
      failCount,
      passRate,
      levelCounts,
      typeCounts,
      avgBrakeDistance,
      badRowCount: badRows.length,
      pendingReviewCount: badRows.filter(r => !r.reviewed).length
        + abnormalDetections.filter(d => d.overallLevel !== 'normal').length,
    };
  }, [inspectionRecords, abnormalDetections, badRows, brakeCalculations]);

  const recentRecords = useMemo(() => {
    return inspectionRecords
      .slice(0, 5)
      .map(record => {
        const detection = abnormalDetections.find(d => d.recordId === record.id);
        const calculation = brakeCalculations.find(c => c.recordId === record.id);
        return { record, detection, calculation };
      });
  }, [inspectionRecords, abnormalDetections, brakeCalculations]);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'import':
        navigate('/import');
        break;
      case 'demo':
        loadDemoData();
        break;
      case 'review':
        navigate('/review');
        break;
      case 'export':
        navigate('/export');
        break;
    }
  }, [navigate, loadDemoData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900 mx-auto mb-4" />
          <p className="text-slate-600">正在加载数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-blue-900" />
            仪表盘
          </h1>
          <p className="text-slate-500 mt-1">电梯制动距离验算系统总览</p>
        </div>
        <div className="flex gap-3">
          <Button variant="primary" leftIcon={<FileUp className="w-4 h-4" />} onClick={() => handleQuickAction('import')}>
            导入数据
          </Button>
          <Button variant="outline" leftIcon={<Database className="w-4 h-4" />} onClick={() => handleQuickAction('demo')}>
            加载演示数据
          </Button>
        </div>
      </div>

      {stats.totalRecords === 0 ? (
        <Card className="text-center py-16">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Database className="w-8 h-8 text-blue-900" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无数据</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            开始使用电梯制动距离验算系统，导入检验数据或加载演示数据进行体验
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="primary" leftIcon={<FileUp className="w-4 h-4" />} onClick={() => handleQuickAction('import')}>
              导入数据
            </Button>
            <Button variant="outline" leftIcon={<Database className="w-4 h-4" />} onClick={() => handleQuickAction('demo')}>
              加载演示数据
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="检验记录总数"
              value={stats.totalRecords}
              icon={<FileUp className="w-5 h-5" />}
              iconBg="bg-blue-100"
              iconColor="text-blue-700"
              trend={stats.totalRecords > 0 ? { value: 12, isPositive: true, direction: 'up' } : undefined}
            />
            <StatCard
              title="合格率"
              value={`${stats.passRate.toFixed(1)}%`}
              icon={<CheckCircle className="w-5 h-5" />}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-700"
              trend={stats.passRate > 80 ? { value: 3.2, isPositive: true, direction: 'up' } : { value: 1.5, isPositive: false, direction: 'down' }}
            />
            <StatCard
              title="平均制动距离"
              value={formatDistance(stats.avgBrakeDistance)}
              icon={<TrendingUp className="w-5 h-5" />}
              iconBg="bg-indigo-100"
              iconColor="text-indigo-700"
            />
            <StatCard
              title="待复核"
              value={stats.pendingReviewCount}
              icon={<AlertTriangle className="w-5 h-5" />}
              iconBg="bg-amber-100"
              iconColor="text-amber-700"
              action={
                <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={() => handleQuickAction('review')}>
                  去复核
                </Button>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">异常分布概览</h2>
                <Badge variant="info">按类型统计</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { key: 'speed_gap', label: '速度缺口', count: stats.typeCounts.speed_gap, color: 'bg-orange-100 text-orange-700 border-orange-200' },
                  { key: 'brake_delay', label: '制动延迟', count: stats.typeCounts.brake_delay, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
                  { key: 'overload', label: '载荷超限', count: stats.typeCounts.overload, color: 'bg-red-100 text-red-700 border-red-200' },
                  { key: 'brake_distance', label: '制动距离', count: stats.typeCounts.brake_distance, color: 'bg-purple-100 text-purple-700 border-purple-200' },
                  { key: 'missing_data', label: '缺失数据', count: stats.typeCounts.missing_data, color: 'bg-slate-100 text-slate-700 border-slate-200' },
                ].map(item => (
                  <div key={item.key} className={`border rounded-lg p-3 text-center ${item.color}`}>
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-xs mt-1">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">等级分布</h3>
                <div className="flex items-center gap-4">
                  {(['normal', 'warning', 'serious', 'overload'] as const).map(level => (
                    <div key={level} className="flex items-center gap-2">
                      <AbnormalLevelBadge level={level} showLabel={false} />
                      <span className="text-sm text-slate-600">{ABNORMAL_LEVEL_LABELS[level]}:</span>
                      <span className="text-sm font-semibold text-slate-900">{stats.levelCounts[level]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">数据质量</h2>
                <Badge variant="warning">{stats.badRowCount} 条坏行</Badge>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">正常数据</span>
                    <span className="font-medium">{stats.totalRecords} 条</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.totalRecords / (stats.totalRecords + stats.badRowCount)) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">坏行数据</span>
                    <span className="font-medium">{stats.badRowCount} 条</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${(stats.badRowCount / (stats.totalRecords + stats.badRowCount)) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">合格率</span>
                    <span className="font-medium">{formatPercent(stats.passRate)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        stats.passRate >= 90 ? 'bg-emerald-500' :
                        stats.passRate >= 75 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stats.passRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">最近检验记录</h2>
              <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />} onClick={() => navigate('/calculation')}>
                查看全部
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">电梯编号</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">检验日期</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">检验员</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">实际载荷</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">额定速度</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">制动距离</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">等级</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">结果</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRecords.map(({ record, detection, calculation }) => (
                    <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{record.elevatorNo}</td>
                      <td className="py-3 px-4 text-slate-600">{record.inspectionDate}</td>
                      <td className="py-3 px-4 text-slate-600">{record.inspector}</td>
                      <td className="py-3 px-4 text-slate-600">{record.actualLoad} kg</td>
                      <td className="py-3 px-4 text-slate-600">{record.ratedSpeed} m/s</td>
                      <td className="py-3 px-4 font-mono text-slate-900">
                        {calculation ? formatDistance(calculation.actualBrakeDistance) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {detection ? <AbnormalLevelBadge level={detection.overallLevel} /> : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {detection ? (
                          <Badge variant={detection.overallResult === 'pass' ? 'success' : 'danger'}>
                            {detection.overallResult === 'pass' ? '合格' : '不合格'}
                          </Badge>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/trace/${record.id}`)}>
                          追溯
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
