import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Filter, MapPin, Truck, FileText, Calendar, Eye } from 'lucide-react';
import { useStore } from '../store/useStore';
import { StatusBadge } from '../components/StatusBadge';
import type { AnomalyType } from '../../shared/types';
import { ANOMALY_TYPE_LABELS } from '../../shared/types';
import { formatDate } from '../utils/format';

export default function Anomalies() {
  const { anomalies, fetchAnomalies, loading, error, clearError } = useStore();
  const [typeFilter, setTypeFilter] = useState<AnomalyType | 'all'>('all');

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const filteredAnomalies = typeFilter === 'all'
    ? anomalies
    : anomalies.filter(a => a.anomalyType === typeFilter);

  const typeCounts = {
    missing_material: anomalies.filter(a => a.anomalyType === 'missing_material').length,
    score_conflict: anomalies.filter(a => a.anomalyType === 'score_conflict').length,
    duplicate: anomalies.filter(a => a.anomalyType === 'duplicate').length,
  };

  const typeOptions: { key: AnomalyType | 'all'; label: string; count: number }[] = [
    { key: 'all', label: '全部异常', count: anomalies.length },
    { key: 'missing_material', label: ANOMALY_TYPE_LABELS.missing_material, count: typeCounts.missing_material },
    { key: 'score_conflict', label: ANOMALY_TYPE_LABELS.score_conflict, count: typeCounts.score_conflict },
    { key: 'duplicate', label: ANOMALY_TYPE_LABELS.duplicate, count: typeCounts.duplicate },
  ];

  const getAnomalyDescription = (type: AnomalyType) => {
    const descriptions = {
      missing_material: '草图素材缺失，请补充上传或确认来源',
      score_conflict: '同一记录存在不同评分，请复核后确认',
      duplicate: '重复导入记录，已合并为补录',
    };
    return descriptions[type];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="font-mono text-2xl font-semibold text-slate-900">异常筛选</h1>
            <p className="text-sm text-slate-500 mt-1">处理导入异常和评分冲突</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {typeOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setTypeFilter(opt.key)}
            className={`btn btn-sm whitespace-nowrap ${
              typeFilter === opt.key ? 'btn-warning' : ''
            }`}
          >
            {opt.label}
            {opt.count > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded ${
                typeFilter === opt.key ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {opt.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && filteredAnomalies.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-5 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredAnomalies.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-3 text-sm font-medium text-slate-600">批次号</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">月台</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">车牌</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">异常类型</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">来源</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">导入时间</th>
                <th className="text-left p-3 text-sm font-medium text-slate-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAnomalies.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50 transition-colors animate-fade-in"
                >
                  <td className="p-3">
                    <span className="font-mono text-sm font-medium text-industrial-700">
                      {record.batchNo}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {record.platformNo}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Truck className="w-4 h-4 text-slate-400" />
                      {record.vehicleNo}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="space-y-1">
                      <StatusBadge status={record.status} anomalyType={record.anomalyType} />
                      {record.anomalyType && (
                        <p className="text-xs text-slate-500">
                          {getAnomalyDescription(record.anomalyType)}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span className="truncate max-w-[120px]">{record.source}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {formatDate(record.importTime)}
                    </div>
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/record/${record.id}`}
                      className="btn btn-sm"
                    >
                      <Eye className="w-4 h-4" />
                      处理
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无异常</h3>
          <p className="text-slate-500">所有记录状态正常</p>
          <Link to="/" className="btn mt-4">
            返回主页
          </Link>
        </div>
      )}
    </div>
  );
}
