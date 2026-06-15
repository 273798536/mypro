import { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { AlertTriangle, FileText, Download, ArrowRight, Zap, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAppStore from '@/store/useAppStore';
import { checkOverCapacity, formatCapacity } from '@/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const planTypes = ['方案A', '方案B', '方案C'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { points, openDetailDrawer } = useAppStore();
  const chartRef = useRef<ChartJS<'bar'>>(null);

  const overCapacityPoints = points.filter((p) => checkOverCapacity(p).isOver);
  const processedCount = points.filter((p) => p.status === 'processed').length;
  const pendingCount = points.filter((p) => p.status === 'pending_field').length;
  const conflictCount = points.filter((p) => p.status === 'conflict').length;

  const samplePoints = points.slice(0, 3);
  const exceptionPoints = [...overCapacityPoints, ...points.filter((p) => p.status === 'conflict')].slice(0, 8);

  const chartData = {
    labels: points.map((p) => p.name.replace(/号.*/, '号').replace('充电站', '')),
    datasets: [
      {
        label: '设计容量',
        data: points.map((p) => p.capacity),
        backgroundColor: points.map((p) =>
          checkOverCapacity(p).isOver ? '#e63946' : '#457b9d'
        ),
        borderRadius: 2,
        borderSkipped: false,
      },
      {
        label: '容量上限',
        data: points.map((p) => p.limit),
        backgroundColor: 'rgba(42, 157, 143, 0.3)',
        borderColor: '#2a9d8f',
        borderWidth: 1,
        borderRadius: 2,
        borderSkipped: false,
        type: 'bar' as const,
      },
    ],
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (_event: unknown, elements: { index: number }[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const point = points[index];
        if (point) {
          openDetailDrawer(point.id);
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'rect' as const,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(30, 58, 95, 0.95)',
        titleFont: { size: 13 },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 2,
        callbacks: {
          title: (items: { label: string }[]) => items[0].label,
          label: (item: { dataset: { label?: string }; raw: number | string }) => {
            return `${item.dataset.label || ''}: ${formatCapacity(Number(item.raw))}`;
          },
          afterLabel: (context: { dataIndex: number }) => {
            const point = points[context.dataIndex];
            if (point && checkOverCapacity(point).isOver) {
              return '⚠ 容量超限，点击查看详情';
            }
            return '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 45,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            size: 11,
          },
          callback: (value: number | string) => `${value} kW`,
        },
      },
    },
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-3 gap-4">
        <div
          className="card p-5 cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/review')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="text-sm text-gray-500">样例点位</span>
              </div>
              <p className="text-3xl font-bold text-gray-800 font-mono">
                {samplePoints.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">点击查看典型案例</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-sm flex items-center justify-center group-hover:bg-amber-100 transition-colors">
              <ArrowRight className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        <div
          className="card p-5 cursor-pointer hover:shadow-md transition-shadow group border-l-4 border-l-status-danger"
          onClick={() => navigate('/review')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-status-danger" />
                <span className="text-sm text-gray-500">异常点位</span>
              </div>
              <p className="text-3xl font-bold text-status-danger font-mono">
                {exceptionPoints.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                超限 {overCapacityPoints.length} + 冲突 {conflictCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-sm flex items-center justify-center group-hover:bg-red-100 transition-colors">
              <ArrowRight className="w-5 h-5 text-status-danger" />
            </div>
          </div>
        </div>

        <div
          className="card p-5 cursor-pointer hover:shadow-md transition-shadow group"
          onClick={() => navigate('/history')}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Download className="w-5 h-5 text-status-success" />
                <span className="text-sm text-gray-500">结果导出</span>
              </div>
              <p className="text-3xl font-bold text-gray-800 font-mono">
                {points.length}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                已处理 {processedCount} / 待现场 {pendingCount}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-sm flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <ArrowRight className="w-5 h-5 text-status-success" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">容量比选图</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              点击柱体查看原始台账与计算口径
            </p>
          </div>
          <div className="flex items-center gap-2">
            {planTypes.map((plan) => (
              <button
                key={plan}
                className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                  plan === '方案A'
                    ? 'bg-primary-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {plan}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80">
          <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-status-danger rounded-sm" />
            <span>容量超限</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-status-info rounded-sm" />
            <span>正常容量</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-status-success bg-status-success/30 rounded-sm" />
            <span>容量上限</span>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">异常点位列表</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              按严重程度排序，点击行查看详情
            </p>
          </div>
          <button
            className="btn-secondary text-xs"
            onClick={() => navigate('/review')}
          >
            查看全部
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header text-left px-5 py-3">点位名称</th>
                <th className="table-header text-left px-4 py-3">所属社区</th>
                <th className="table-header text-left px-4 py-3">设计容量</th>
                <th className="table-header text-left px-4 py-3">容量上限</th>
                <th className="table-header text-left px-4 py-3">超限值</th>
                <th className="table-header text-left px-4 py-3">状态</th>
                <th className="table-header text-left px-4 py-3">来源</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {exceptionPoints.map((point) => {
                const capacityCheck = checkOverCapacity(point);
                const isOver = capacityCheck.isOver;
                return (
                  <tr
                    key={point.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openDetailDrawer(point.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-1 h-10 rounded-sm ${
                            point.status === 'conflict'
                              ? 'bg-status-danger'
                              : isOver
                              ? 'bg-status-danger animate-pulse-slow'
                              : 'bg-gray-300'
                          }`}
                        />
                        <span className="font-medium text-gray-800 text-sm">
                          {point.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {point.community}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-800">
                      {formatCapacity(point.capacity)}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">
                      {formatCapacity(point.limit)}
                    </td>
                    <td className="px-4 py-3">
                      {isOver ? (
                        <span className="text-sm font-mono text-status-danger font-medium">
                          +{formatCapacity(capacityCheck.exceedValue)}
                          <span className="text-xs ml-1">
                            (+{capacityCheck.exceedRatio.toFixed(1)}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={point.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {point.source === 'design_institute' && '设计院'}
                      {point.source === 'site_survey' && '现场勘查'}
                      {point.source === 'power_company' && '供电所'}
                      {point.source === 'community_report' && '社区上报'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof CheckCircle; label: string; className: string }> = {
    processed: { icon: CheckCircle, label: '已处理', className: 'status-badge-success' },
    pending_field: { icon: Clock, label: '待现场看', className: 'status-badge-warning' },
    conflict: { icon: XCircle, label: '冲突记录', className: 'status-badge-danger' },
    over_capacity: { icon: AlertTriangle, label: '容量超限', className: 'status-badge-danger' },
  };

  const cfg = config[status] || config.processed;
  const Icon = cfg.icon;

  return (
    <span className={`status-badge ${cfg.className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {cfg.label}
    </span>
  );
}
