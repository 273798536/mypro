import { Link } from 'react-router-dom';
import { useBatchStore } from '@/store/useBatchStore';
import { useAnomalyStore } from '@/store/useAnomalyStore';
import { useCalculationStore } from '@/store/useCalculationStore';
import { formatDateTime } from '@/utils/export/fileNaming';
import {
  Database,
  LineChart,
  AlertTriangle,
  FileText,
  FlaskConical,
  Layers,
  ChevronRight,
  Plus,
  TrendingUp,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  calculating: { label: '计算中', color: 'text-blue-600', bg: 'bg-blue-100' },
  completed: { label: '已完成', color: 'text-teal-600', bg: 'bg-teal-100' },
  has_anomaly: { label: '存在异常', color: 'text-red-600', bg: 'bg-red-100' },
};

export default function Home() {
  const { batches } = useBatchStore();
  const { anomalies } = useAnomalyStore();
  const { results } = useCalculationStore();

  const totalReagents = batches.reduce((sum, b) => sum + b.reagents.length, 0);

  const stats = [
    {
      label: '批次数',
      value: batches.length,
      icon: Layers,
      color: 'bg-[#1e3a5f]',
      lightColor: 'bg-blue-50',
    },
    {
      label: '试剂总数',
      value: totalReagents,
      icon: FlaskConical,
      color: 'bg-[#0d9488]',
      lightColor: 'bg-teal-50',
    },
    {
      label: '异常数',
      value: anomalies.length,
      icon: AlertTriangle,
      color: 'bg-red-500',
      lightColor: 'bg-red-50',
    },
    {
      label: '计算结果数',
      value: results.length,
      icon: TrendingUp,
      color: 'bg-amber-500',
      lightColor: 'bg-amber-50',
    },
  ];

  const quickActions = [
    {
      label: '数据录入',
      description: '录入批次信息和试剂数据',
      path: '/data-input',
      icon: Database,
      color: 'bg-[#1e3a5f] hover:bg-[#2d4f7a]',
    },
    {
      label: '曲线展示',
      description: '查看溶解度曲线与计算结果',
      path: '/curve-view',
      icon: LineChart,
      color: 'bg-[#0d9488] hover:bg-[#0f766e]',
    },
    {
      label: '异常追溯',
      description: '追溯异常数据来源链路',
      path: '/anomaly-trace',
      icon: AlertTriangle,
      color: 'bg-amber-600 hover:bg-amber-700',
    },
  ];

  const sortedBatches = [...batches].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="space-y-6">
      <div className="text-center py-8 bg-gradient-to-r from-[#1e3a5f] to-[#0d9488] rounded-2xl text-white">
        <h1 className="text-3xl font-bold mb-2">溶解度曲线教学器</h1>
        <p className="text-blue-100 text-lg">化学计算可视化与数据追溯平台</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, lightColor }) => (
          <div key={label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">{label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
              </div>
              <div className={`${lightColor} p-3 rounded-xl`}>
                <div className={`${color} p-2 rounded-lg text-white`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 text-lg">最近批次</h2>
            <Link
              to="/data-input"
              className="text-[#0d9488] text-sm font-medium hover:text-[#0f766e] flex items-center gap-1"
            >
              <Plus size={16} />
              新建批次
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-600">
                  <th className="px-5 py-3 font-medium">批次名称</th>
                  <th className="px-5 py-3 font-medium">操作人</th>
                  <th className="px-5 py-3 font-medium">试剂数</th>
                  <th className="px-5 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 font-medium">更新时间</th>
                  <th className="px-5 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      暂无批次数据
                    </td>
                  </tr>
                ) : (
                  sortedBatches.map((batch) => {
                    const status = statusConfig[batch.status];
                    return (
                      <tr key={batch.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <span className="font-medium text-gray-800">{batch.name}</span>
                        </td>
                        <td className="px-5 py-4 text-gray-600">{batch.operator}</td>
                        <td className="px-5 py-4 text-gray-600">{batch.reagents.length} 个</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${status.bg} ${status.color} font-medium`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 text-sm">
                          {formatDateTime(batch.updatedAt)}
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            to="/result-report"
                            className="text-[#0d9488] hover:text-[#0f766e] text-sm font-medium flex items-center gap-0.5"
                          >
                            查看
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-semibold text-gray-800 text-lg">快速操作</h2>
          <div className="space-y-3">
            {quickActions.map(({ label, description, path, icon: Icon, color }) => (
              <Link
                key={path}
                to={path}
                className="block bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className={`${color} p-3 rounded-xl text-white transition-colors`}>
                    <Icon size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{label}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{description}</p>
                  </div>
                  <ChevronRight className="text-gray-300" size={20} />
                </div>
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <FileText size={18} className="text-[#1e3a5f]" />
              数据总览
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">已完成批次</span>
                <span className="font-medium text-gray-800">
                  {batches.filter((b) => b.status === 'completed').length}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">存在异常批次</span>
                <span className="font-medium text-red-600">
                  {batches.filter((b) => b.status === 'has_anomaly').length}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">安全备注</span>
                <span className="font-medium text-gray-800">
                  {batches.reduce((sum, b) => sum + b.safetyNotes.length, 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
