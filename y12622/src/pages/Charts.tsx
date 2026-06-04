import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { AnomalyPieChart } from '../components/charts/AnomalyPieChart';
import { EquipmentBarChart } from '../components/charts/EquipmentBarChart';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { DataTable } from '../components/common/DataTable';
import { SeverityBadge, ColorBadge } from '../components/common/StatusBadge';
import type { Anomaly } from '../types';

export default function Charts() {
  const navigate = useNavigate();
  const getChartData = useAppStore((state) => state.getChartData);
  const anomalies = useAppStore((state) => state.anomalies);
  const getProcessingById = useAppStore((state) => state.getProcessingById);
  const getSourceImageById = useAppStore((state) => state.getSourceImageById);
  const getEquipmentById = useAppStore((state) => state.getEquipmentById);

  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');

  const chartData = useMemo(() => getChartData(), [getChartData]);
  const equipment = useAppStore((state) => state.equipment);

  const filteredAnomalies = useMemo(() => {
    return [...anomalies]
      .filter((a) => severityFilter === 'all' || a.severity === severityFilter)
      .filter((a) => {
        if (equipmentFilter === 'all') return true;
        const processing = getProcessingById(a.processing_id);
        const image = processing ? getSourceImageById(processing.source_image_id) : null;
        return image?.equipment_id === equipmentFilter;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [anomalies, severityFilter, equipmentFilter, getProcessingById, getSourceImageById]);

  const columns = [
    {
      key: 'time',
      header: '时间',
      render: (row: Anomaly) =>
        new Date(row.created_at).toLocaleString('zh-CN', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'equipment',
      header: '设备',
      render: (row: Anomaly) => {
        const processing = getProcessingById(row.processing_id);
        const image = processing ? getSourceImageById(processing.source_image_id) : null;
        const eq = image ? getEquipmentById(image.equipment_id) : null;
        return eq?.name || '-';
      },
    },
    {
      key: 'position',
      header: '位置',
      render: (row: Anomaly) =>
        `(${row.position_x.toFixed(1)}, ${row.position_y.toFixed(1)})`,
    },
    {
      key: 'severity',
      header: '严重程度',
      render: (row: Anomaly) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'color',
      header: '颜色',
      render: (row: Anomaly) => <ColorBadge color={row.color_code} />,
    },
    {
      key: 'reason',
      header: '异常原因',
      render: (row: Anomaly) => (
        <span className="text-sm text-gray-600">{row.human_reason}</span>
      ),
    },
    {
      key: 'action',
      header: '操作',
      render: (row: Anomaly) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/trace/${row.id}`);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-serif">统计分析</h2>
          <p className="text-sm text-gray-500">
            图表与明细数据来自同一批处理记录，确保数据一致
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部设备</option>
            {equipment.map((eq) => (
              <option key={eq.id} value={eq.id}>
                {eq.name}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">全部严重程度</option>
            <option value="low">轻微</option>
            <option value="medium">中等</option>
            <option value="high">严重</option>
            <option value="critical">危急</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnomalyPieChart data={chartData.bySeverity} />
        <EquipmentBarChart data={chartData.byEquipment} />
      </div>

      <TrendLineChart data={chartData.trend} />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 font-serif">
              异常明细
            </h3>
            <span className="text-sm text-gray-500">
              共 {filteredAnomalies.length} 条记录
            </span>
          </div>
        </div>
        <div className="p-4">
          <DataTable
            columns={columns}
            data={filteredAnomalies}
            onRowClick={(row) => navigate(`/trace/${row.id}`)}
            emptyMessage="暂无符合条件的异常记录"
          />
        </div>
      </div>
    </div>
  );
}
