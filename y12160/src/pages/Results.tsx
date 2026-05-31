import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import { FileBarChart, ChevronRight, Search } from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getSprayQualityLabel, getSprayQualityColor } from '../services/calculation';
import { useState } from 'react';

export function Results() {
  const { calculationResults, nozzles, pressureRecords } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const nozzleMap = new Map(nozzles.map(n => [n.id, n]));
  const pressureMap = new Map(pressureRecords.map(p => [p.id, p]));

  const filteredResults = calculationResults.filter(result => {
    const nozzle = nozzleMap.get(result.nozzleId);
    const matchesSearch = !searchTerm || 
      nozzle?.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getBadgeType = (result: any) => {
    if (result.status === 'pending') return 'pending';
    if (result.status === 'blocked') return 'error';
    if (result.validationResult?.viscosityMissing) return 'warning';
    return 'success';
  };

  const getStatusText = (result: any) => {
    if (result.status === 'pending') return '待确认';
    if (result.status === 'blocked') return '堵塞预警';
    if (result.validationResult?.viscosityMissing) return '黏度待补';
    return '正常';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">试算结果</h1>
          <p className="text-slate-500 mt-1">查看所有雾化试算结果和详细数据</p>
        </div>
        <Link
          to="/calculation"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          新建试算
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="搜索喷嘴型号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">全部状态</option>
          <option value="normal">正常</option>
          <option value="pending">待确认</option>
          <option value="blocked">堵塞预警</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">喷嘴型号</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">压力(bar)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">雾滴(μm)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">覆盖(m)</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">喷雾质量</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">计算时间</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((result) => {
                const nozzle = nozzleMap.get(result.nozzleId);
                const pressure = pressureMap.get(result.pressureRecordId);
                
                return (
                  <tr key={result.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{nozzle?.model || '未知喷嘴'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {pressure?.pressure.toFixed(1) || '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {result.dropletSize.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {result.coverageWidth.toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      <span style={{ color: getSprayQualityColor(result.sprayQuality) }} className="font-medium">
                        {getSprayQualityLabel(result.sprayQuality)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge type={getBadgeType(result)}>
                        {getStatusText(result)}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {new Date(result.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Link
                          to={`/results/${result.id}`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          查看详情
                          <ChevronRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <FileBarChart className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-500">暂无试算结果</p>
                    <Link
                      to="/calculation"
                      className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      开始第一次试算 →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
