import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Microscope,
  AlertTriangle,
  Clock,
  CheckCircle,
  Upload,
  FileDown,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { StatCard } from '../components/common/StatCard';
import { DataTable } from '../components/common/DataTable';
import { SeverityBadge, ColorBadge } from '../components/common/StatusBadge';
import { AnomalyPieChart } from '../components/charts/AnomalyPieChart';
import { EquipmentBarChart } from '../components/charts/EquipmentBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import type { Anomaly } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const equipment = useAppStore((state) => state.equipment);
  const anomalies = useAppStore((state) => state.anomalies);
  const processings = useAppStore((state) => state.processings);
  const conclusions = useAppStore((state) => state.conclusions);
  const getChartData = useAppStore((state) => state.getChartData);
  const getSourceImageById = useAppStore((state) => state.getSourceImageById);
  const getProcessingById = useAppStore((state) => state.getProcessingById);
  const getEquipmentById = useAppStore((state) => state.getEquipmentById);

  const chartData = useMemo(() => getChartData(), [equipment, anomalies, processings, getChartData]);

  const pendingReview = anomalies.length - conclusions.length;

  const recentAnomalies = useMemo(() => {
    return [...anomalies]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8)
      .map((anomaly) => {
        const processing = getProcessingById(anomaly.processing_id);
        const sourceImage = processing ? getSourceImageById(processing.source_image_id) : null;
        const equipment = sourceImage ? getEquipmentById(sourceImage.equipment_id) : null;
        return { anomaly, processing, sourceImage, equipment };
      });
  }, [anomalies, getProcessingById, getSourceImageById, getEquipmentById]);

  const columns = [
    {
      key: 'time',
      header: '时间',
      render: (row: any) =>
        new Date(row.anomaly.created_at).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'equipment',
      header: '设备',
      render: (row: any) => row.equipment?.name || '-',
    },
    {
      key: 'position',
      header: '位置',
      render: (row: any) =>
        `(${row.anomaly.position_x.toFixed(1)}, ${row.anomaly.position_y.toFixed(1)})`,
    },
    {
      key: 'severity',
      header: '严重程度',
      render: (row: any) => <SeverityBadge severity={row.anomaly.severity} />,
    },
    {
      key: 'color',
      header: '颜色',
      render: (row: any) => <ColorBadge color={row.anomaly.color_code} />,
    },
    {
      key: 'reason',
      header: '异常原因',
      render: (row: any) => (
        <span className="text-sm text-gray-600 max-w-xs truncate block">
          {row.anomaly.human_reason}
        </span>
      ),
    },
    {
      key: 'action',
      header: '操作',
      render: (row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/trace/${row.anomaly.id}`);
          }}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
        >
          追溯
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="设备总数"
          value={equipment.length}
          icon={Microscope}
          color="blue"
          trend={{ value: 0, isPositive: true }}
        />
        <StatCard
          title="异常记录"
          value={anomalies.length}
          icon={AlertTriangle}
          color="red"
          trend={{ value: 12, isPositive: false }}
        />
        <StatCard
          title="待复核"
          value={pendingReview}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="已复核"
          value={conclusions.length}
          icon={CheckCircle}
          color="green"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/import')}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          <Upload className="w-4 h-4" />
          导入图像
        </button>
        <button
          onClick={() => navigate('/export')}
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <FileDown className="w-4 h-4" />
          导出报告
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyPieChart data={chartData.bySeverity} />
        <EquipmentBarChart data={chartData.byEquipment} />
      </div>

      <TrendLineChart data={chartData.trend} />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 font-serif">最近异常</h3>
            <button
              onClick={() => navigate('/charts')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              查看全部
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={recentAnomalies}
            onRowClick={(row) => navigate(`/trace/${row.anomaly.id}`)}
            emptyMessage="暂无异常记录"
          />
        </div>
      </div>
    </div>
  );
}
