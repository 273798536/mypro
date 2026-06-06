import { BatchData } from '../useAppState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface Props {
  batchData: BatchData;
  onDownload: () => void;
}

export default function Summary({ batchData, onDownload }: Props) {
  const { batch, resolvedCount, pendingCount, failedCount, conflicts } = batchData;

  const chartData = [
    { name: '设备总数', value: batch.deviceCount, color: '#3b82f6' },
    { name: '冲突总数', value: conflicts.length, color: '#6b7280' },
    { name: '已解决', value: resolvedCount, color: '#10b981' },
    { name: '待确认', value: pendingCount, color: '#f59e0b' },
    { name: '失败', value: failedCount, color: '#ef4444' }
  ];

  const statusColor = batch.status === '通过' ? 'text-green-600' :
    batch.status === '待确认' ? 'text-yellow-600' : 'text-red-600';

  const statusBg = batch.status === '通过' ? 'bg-green-50 border-green-200' :
    batch.status === '待确认' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  return (
    <div className={`bg-white rounded-lg shadow p-6 border ${statusBg}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{batch.name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            生成时间: {new Date(batch.timestamp).toLocaleString()}
          </p>
        </div>
        <button
          onClick={onDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          下载报告
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">整体状态</p>
          <p className={`text-2xl font-bold ${statusColor}`}>
            {batch.status}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">设备数量</p>
          <p className="text-2xl font-bold text-gray-900">{batch.deviceCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">已解决</p>
          <p className="text-2xl font-bold text-green-600">{resolvedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">待确认</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-sm text-gray-500">失败</p>
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="数量">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
