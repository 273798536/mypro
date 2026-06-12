import { useState } from 'react';
import {
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  User,
  FileText,
  ArrowRight,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import { formatDateTime, getRelativeTime } from '@/utils/formatters';
import { CORRECTION_STATUS_LABELS } from '@/types';

export default function CorrectionsPage() {
  const { correctionRecords, buoyData, approveCorrection, rejectCorrection, isFirstVisit } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getBuoyData = (buoyDataId: string) => {
    return buoyData.find((b) => b.id === buoyDataId);
  };

  const filteredRecords = correctionRecords.filter((record) => {
    return statusFilter === 'all' || record.status === statusFilter;
  });

  const pendingCount = correctionRecords.filter((r) => r.status === 'pending').length;
  const approvedCount = correctionRecords.filter((r) => r.status === 'approved').length;

  if (isFirstVisit) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display mb-1">修正记录</h1>
          <p className="text-gray-400 text-sm">人工修正留痕，前后变化可追溯</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div
          className="p-4 rounded-xl border border-white/10 bg-white/5"
          style={{ opacity: 0, animation: 'fadeInUp 0.4s ease-out 0ms forwards' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5">
              <Edit3 size={20} className="text-ocean-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-white">{correctionRecords.length}</p>
              <p className="text-xs text-gray-500">总修正记录</p>
            </div>
          </div>
        </div>
        <div
          className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5"
          style={{ opacity: 0, animation: 'fadeInUp 0.4s ease-out 50ms forwards' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-amber-400">{pendingCount}</p>
              <p className="text-xs text-gray-500">待确认</p>
            </div>
          </div>
        </div>
        <div
          className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5"
          style={{ opacity: 0, animation: 'fadeInUp 0.4s ease-out 100ms forwards' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display text-emerald-400">{approvedCount}</p>
              <p className="text-xs text-gray-500">已通过</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Filter size={18} className="text-gray-500" />
        <div className="flex gap-2">
          {[
            { value: 'all', label: '全部' },
            { value: 'pending', label: '待确认' },
            { value: 'approved', label: '已通过' },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                statusFilter === filter.value
                  ? 'bg-ocean-500/20 text-ocean-300 border border-ocean-500/30'
                  : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center">
            <Edit3 size={48} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500">暂无修正记录</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => {
            const buoy = getBuoyData(record.buoyDataId);
            const isExpanded = expandedId === record.id;
            const changePercent = record.oldValue !== 0
              ? ((record.newValue - record.oldValue) / Math.abs(record.oldValue) * 100).toFixed(1)
              : '0';
            const isIncrease = record.newValue > record.oldValue;

            return (
              <div
                key={record.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-300"
                style={{
                  opacity: 0,
                  animation: `fadeInUp 0.4s ease-out ${index * 50}ms forwards`,
                }}
              >
                <div
                  className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : record.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${
                        record.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        <Edit3 size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-white font-medium">{record.fieldLabel}修正</h3>
                          <StatusBadge type="correction" status={record.status} size="sm" />
                        </div>
                        <p className="text-sm text-gray-400">
                          {buoy?.stationName || '未知站点'}
                          <span className="text-gray-600 mx-2">·</span>
                          {getRelativeTime(record.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 mb-0.5">修正前</p>
                          <p className="text-sm text-gray-400 line-through">
                            {record.oldValue} {record.unit}
                          </p>
                        </div>
                        <ArrowRight size={18} className="text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">修正后</p>
                          <p className={`text-sm font-medium ${
                            record.status === 'approved' ? 'text-emerald-400' : 'text-ocean-400'
                          }`}>
                            {record.newValue} {record.unit}
                          </p>
                        </div>
                        <div className={`text-sm font-medium ${
                          isIncrease ? 'text-red-400' : 'text-emerald-400'
                        }`}>
                          {isIncrease ? '+' : ''}{changePercent}%
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(isExpanded ? null : record.id);
                        }}
                        className="p-2 rounded-lg text-gray-500 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/5 pt-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <FileText size={16} className="text-ocean-400" />
                          修正详情
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">字段</p>
                            <p className="text-sm text-white">{record.fieldLabel}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">单位</p>
                            <p className="text-sm text-white">{record.unit}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">原始值</p>
                            <p className="text-sm text-gray-400 line-through">
                              {record.oldValue} {record.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">修正值</p>
                            <p className="text-sm text-emerald-400 font-medium">
                              {record.newValue} {record.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">变化量</p>
                            <p className={`text-sm font-medium ${
                              isIncrease ? 'text-red-400' : 'text-emerald-400'
                            }`}>
                              {isIncrease ? '+' : ''}{(record.newValue - record.oldValue).toFixed(2)} {record.unit}
                              <span className="text-gray-500 ml-1">({isIncrease ? '+' : ''}{changePercent}%)</span>
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">提交时间</p>
                            <p className="text-sm text-white">{formatDateTime(record.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                          <User size={16} className="text-ocean-400" />
                          操作信息
                        </h4>
                        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ocean-400 to-ocean-600 flex items-center justify-center">
                              <User size={18} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{record.operator}</p>
                              <p className="text-xs text-gray-500">科研助理</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">修正原因</p>
                            <p className="text-sm text-gray-300">{record.reason}</p>
                          </div>
                        </div>

                        {record.status === 'approved' && record.confirmedAt && (
                          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                            <div className="flex items-center gap-2">
                              <CheckCircle size={16} className="text-emerald-400" />
                              <span className="text-sm text-emerald-300">
                                已于 {formatDateTime(record.confirmedAt)} 确认通过
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {record.status === 'pending' && (
                      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
                        <button
                          onClick={() => {
                            if (confirm('确定驳回此修正申请吗？')) {
                              rejectCorrection(record.id);
                            }
                          }}
                          className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-sm
                                   hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                        >
                          <XCircle size={16} />
                          驳回
                        </button>
                        <button
                          onClick={() => approveCorrection(record.id)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium
                                   hover:from-emerald-400 hover:to-emerald-500 transition-all flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          通过确认
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
