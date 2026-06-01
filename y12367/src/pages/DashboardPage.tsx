import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Gauge,
  Thermometer,
  Zap,
  Clock,
  TrendingUp,
  Edit3,
  Database,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { DataCard } from '@/components/ui/DataCard';
import { Badge, AnomalyBadge, SeverityBadge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { LineChart } from '@/components/charts/LineChart';
import { BarChart } from '@/components/charts/BarChart';
import { Button } from '@/components/ui/Button';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const {
    initialize,
    testBenches,
    materials,
    anomalies,
    efficiencyReports,
    isLoading,
  } = useAnalysisStore();

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  const stats = React.useMemo(() => {
    const onlineBenches = testBenches.filter((tb) => tb.status === 'online').length;
    const speedMissing = anomalies.filter((a) => a.type === 'speed_missing' && !a.resolved).length;
    const tempOverlimit = anomalies.filter((a) => a.type === 'temp_overlimit' && !a.resolved).length;
    const powerReverse = anomalies.filter((a) => a.type === 'power_reverse' && !a.resolved).length;
    const avgEfficiency =
      efficiencyReports.length > 0
        ? efficiencyReports.reduce((sum, r) => sum + r.efficiency, 0) / efficiencyReports.length
        : 0;
    const correctedReports = efficiencyReports.filter((r) => r.isCorrected).length;

    return {
      totalBenches: testBenches.length,
      onlineBenches,
      offlineBenches: testBenches.length - onlineBenches,
      speedMissing,
      tempOverlimit,
      powerReverse,
      totalAnomalies: speedMissing + tempOverlimit + powerReverse,
      avgEfficiency,
      correctedReports,
      totalReports: efficiencyReports.length,
    };
  }, [testBenches, anomalies, efficiencyReports]);

  const recentAnomalies = React.useMemo(() => {
    return [...anomalies]
      .filter((a) => !a.resolved)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);
  }, [anomalies]);

  const efficiencyTrendData = React.useMemo(() => {
    if (efficiencyReports.length === 0) return [];
    const sortedReports = [...efficiencyReports].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    return sortedReports.slice(-50).map((r) => ({
      timestamp: new Date(r.startTime).getTime(),
      value: r.efficiency,
      segmentId: r.segmentId,
    }));
  }, [efficiencyReports]);

  const anomalyTypeData = React.useMemo(() => {
    return [
      {
        name: '转速缺采',
        data: [
          { name: '今日', value: stats.speedMissing, color: '#3B82F6' },
          { name: '昨日', value: Math.max(0, stats.speedMissing - 2), color: '#3B82F6' },
        ],
        color: '#3B82F6',
      },
      {
        name: '温升超限',
        data: [
          { name: '今日', value: stats.tempOverlimit, color: '#F59E0B' },
          { name: '昨日', value: Math.max(0, stats.tempOverlimit - 1), color: '#F59E0B' },
        ],
        color: '#F59E0B',
      },
      {
        name: '功率反号',
        data: [
          { name: '今日', value: stats.powerReverse, color: '#EF4444' },
          { name: '昨日', value: Math.max(0, stats.powerReverse - 1), color: '#EF4444' },
        ],
        color: '#EF4444',
      },
    ];
  }, [stats]);

  const testBenchStatus = React.useMemo(() => {
    return testBenches.map((tb) => ({
      name: tb.code,
      value: tb.status === 'online' ? 1 : tb.status === 'maintenance' ? 0.5 : 0,
      color: tb.status === 'online' ? '#10B981' : tb.status === 'maintenance' ? '#F59E0B' : '#64748B',
    }));
  }, [testBenches]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-industrial-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-text">电机效率测试台 - 数据概览</h1>
          <p className="text-industrial-text-muted mt-1">实时监控测试台运行状态和异常情况</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="green">
            <span className="status-dot online mr-2" />
            系统运行正常
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <DataCard
            title="在线测试台"
            value={stats.onlineBenches}
            unit={`/ ${stats.totalBenches}`}
            icon={<Activity className="w-6 h-6" />}
            color="green"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <DataCard
            title="待处理异常"
            value={stats.totalAnomalies}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="orange"
            trend={stats.totalAnomalies > 10 ? 'up' : 'down'}
            trendValue={stats.totalAnomalies > 10 ? '较昨日增加' : '较昨日减少'}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <DataCard
            title="平均效率"
            value={stats.avgEfficiency}
            unit="%"
            precision={2}
            icon={<Gauge className="w-6 h-6" />}
            color="blue"
            trend="up"
            trendValue="+0.5% 较上周"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <DataCard
            title="已修正报告"
            value={stats.correctedReports}
            unit={`/ ${stats.totalReports}`}
            icon={<Edit3 className="w-6 h-6" />}
            color="default"
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                效率趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart
                series={[
                  {
                    name: '效率',
                    data: efficiencyTrendData,
                    color: '#3B82F6',
                    type: 'smooth',
                  },
                ]}
                xAxisLabel="时间"
                yAxisLabel="效率 (%)"
                height={280}
                threshold={{ value: 85, label: '目标效率 85%' }}
              />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                异常分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                series={anomalyTypeData}
                xAxisData={['今日', '昨日']}
                horizontal
                showLegend
                height={280}
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                测试台状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testBenches.map((tb) => (
                  <div key={tb.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`status-dot ${tb.status}`} />
                      <span className="text-industrial-text">{tb.code}</span>
                    </div>
                    <Badge
                      variant={
                        tb.status === 'online'
                          ? 'green'
                          : tb.status === 'maintenance'
                          ? 'orange'
                          : 'default'
                      }
                    >
                      {tb.status === 'online' ? '在线' : tb.status === 'maintenance' ? '维护' : '离线'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                最近异常
                <Link to="/analysis" className="ml-auto">
                  <Button variant="ghost" size="sm">
                    查看全部
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>严重度</TableHead>
                    <TableHead>测试台</TableHead>
                    <TableHead>材料</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAnomalies.map((anomaly) => {
                    const tb = testBenches.find((t) => t.id === anomaly.testBenchId);
                    const material = materials.find((m) => m.id === anomaly.materialId);
                    return (
                      <TableRow key={anomaly.id} anomalyType={anomaly.type}>
                        <TableCell>
                          <AnomalyBadge type={anomaly.type} />
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={anomaly.severity} />
                        </TableCell>
                        <TableCell>{tb?.code || '-'}</TableCell>
                        <TableCell>{material?.code || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-industrial-text-muted" />
                            {format(new Date(anomaly.timestamp), 'MM-dd HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-industrial-text-muted">
                          {anomaly.message}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="hover:border-blue-500/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-industrial-text">数据分析</h4>
                <p className="text-xs text-industrial-text-muted">筛选条件、图表联动</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          <Card className="hover:border-orange-500/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-industrial-text">手动修正</h4>
                <p className="text-xs text-industrial-text-muted">转速扭矩修正、对比</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
          <Card className="hover:border-green-500/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10 text-green-400">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-medium text-industrial-text">数据导入</h4>
                <p className="text-xs text-industrial-text-muted">电压电流、温度序列</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
