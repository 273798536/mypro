import React, { useMemo } from 'react';
import { Card, Statistic, Row, Col, Tag, Tabs } from 'antd';
import {
  Database,
  AlertTriangle,
  Thermometer,
  Minus,
  AlertCircle,
  Flame,
  Activity,
  Scale,
} from 'lucide-react';
import { useAppStore } from '../store';
import { AnomalyType } from '../types';
import { COLORS, ANOMALY_TYPE_LABELS } from '../constants';
import TemperatureChart from '../components/TemperatureChart';
import DataTable from '../components/DataTable';
import ComparisonPanel from '../components/ComparisonPanel';

const Dashboard: React.FC = () => {
  const { getFilteredResults, comparisonSummary, baseRunId, currentRunId } = useAppStore();

  const filteredResults = useMemo(() => getFilteredResults(), [getFilteredResults]);

  const stats = useMemo(() => {
    const totalRecords = filteredResults.length;
    const anomalyCounts: Record<AnomalyType, number> = {
      [AnomalyType.SENSOR_DRIFT]: 0,
      [AnomalyType.EMISSIVITY_MISSING]: 0,
      [AnomalyType.BATCH_MISMATCH]: 0,
      [AnomalyType.FIELD_MISSING]: 0,
    };

    let totalAnomalies = 0;
    const temps: number[] = [];

    filteredResults.forEach((item) => {
      if (item.result.anomalyType) {
        anomalyCounts[item.result.anomalyType]++;
        totalAnomalies++;
      }
      if (!item.result.isIsolated) {
        temps.push(item.result.estimatedTemp);
      }
    });

    const avgTemp = temps.length > 0
      ? temps.reduce((a, b) => a + b, 0) / temps.length
      : 0;
    const minTemp = temps.length > 0 ? Math.min(...temps) : 0;
    const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;

    return {
      totalRecords,
      totalAnomalies,
      anomalyCounts,
      avgTemp,
      minTemp,
      maxTemp,
    };
  }, [filteredResults]);

  const anomalyTypeIcons: Record<AnomalyType, React.ReactNode> = {
    [AnomalyType.SENSOR_DRIFT]: <Activity size={18} />,
    [AnomalyType.EMISSIVITY_MISSING]: <Minus size={18} />,
    [AnomalyType.BATCH_MISMATCH]: <Scale size={18} />,
    [AnomalyType.FIELD_MISSING]: <AlertCircle size={18} />,
  };

  const anomalyTypeColors: Record<AnomalyType, string> = {
    [AnomalyType.SENSOR_DRIFT]: COLORS.danger,
    [AnomalyType.EMISSIVITY_MISSING]: '#FF7D00',
    [AnomalyType.BATCH_MISMATCH]: '#F7BA1E',
    [AnomalyType.FIELD_MISSING]: '#86909C',
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span className="flex items-center gap-2">
          <Flame size={16} />
          趋势分析
        </span>
      ),
      children: (
        <div className="space-y-4">
          <TemperatureChart data={filteredResults} />
          <DataTable data={filteredResults} />
        </div>
      ),
    },
    {
      key: 'comparison',
      label: (
        <span className="flex items-center gap-2">
          <Scale size={16} />
          对比分析
          {baseRunId && (
            <Tag color="blue" className="ml-1">
              已启用
            </Tag>
          )}
        </span>
      ),
      children: <ComparisonPanel summary={comparisonSummary} />,
    },
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="bg-slate-800 border-slate-700 h-full">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-slate-400">
                  <Database size={16} />
                  总记录数
                </span>
              }
              value={stats.totalRecords}
              valueStyle={{ color: COLORS.text }}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="bg-slate-800 border-slate-700 h-full">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-slate-400">
                  <AlertTriangle size={16} />
                  异常记录
                </span>
              }
              value={stats.totalAnomalies}
              valueStyle={{ color: '#FF7D00' }}
              suffix="条"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(stats.anomalyCounts)
                .filter(([, count]) => count > 0)
                .map(([type, count]) => (
                  <Tag
                    key={type}
                    icon={anomalyTypeIcons[type as AnomalyType]}
                    style={{
                      backgroundColor: `${anomalyTypeColors[type as AnomalyType]}15`,
                      borderColor: `${anomalyTypeColors[type as AnomalyType]}40`,
                      color: anomalyTypeColors[type as AnomalyType],
                    }}
                  >
                    {ANOMALY_TYPE_LABELS[type as AnomalyType]}: {count}
                  </Tag>
                ))}
            </div>
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="bg-slate-800 border-slate-700 h-full">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-slate-400">
                  <Thermometer size={16} />
                  平均温度
                </span>
              }
              value={stats.avgTemp}
              precision={2}
              valueStyle={{ color: '#165DFF' }}
              suffix="°C"
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="bg-slate-800 border-slate-700 h-full">
            <Statistic
              title={
                <span className="flex items-center gap-2 text-slate-400">
                  <Minus size={16} />
                  温度范围
                </span>
              }
              value={stats.maxTemp - stats.minTemp}
              precision={2}
              valueStyle={{ color: '#00B42A' }}
              suffix="°C"
            />
            <p className="text-slate-400 text-xs mt-2">
              {stats.minTemp.toFixed(2)}°C ~ {stats.maxTemp.toFixed(2)}°C
            </p>
          </Card>
        </Col>
      </Row>

      <Card
        className="bg-slate-800 border-slate-700"
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          defaultActiveKey="overview"
          items={tabItems}
          className="p-4"
          style={{
            '--ant-tabs-color': COLORS.text,
            '--ant-tabs-item-color': COLORS.textSecondary,
            '--ant-tabs-item-hover-color': COLORS.text,
            '--ant-tabs-item-active-color': COLORS.primary,
            '--ant-tabs-ink-bar-color': COLORS.primary,
            '--ant-tabs-nav-list-gap': '32px',
            '--ant-tabs-title-font-size': '14px',
          } as React.CSSProperties}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
