import React from 'react';
import { ArrowRight, GitCompare, AlertTriangle, Clock } from 'lucide-react';
import { getMockBoundaryRecords } from '@/utils/mockData';
import { getBoundaryTypeLabel, getBoundaryTypeColor } from '@/utils/boundaryEngine';
import { cn } from '@/lib/utils';

const ExtrapolateCompare: React.FC = () => {
  const records = getMockBoundaryRecords();
  const extrapolateRecord = records.find((r) => r.type === 'extrapolate');

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!extrapolateRecord) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
            <GitCompare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">外推越界变化对比</h3>
            <p className="text-xs text-slate-500">保留变化前后数值，便于后续重跑参照</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <div className="absolute -top-2 left-4 bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full z-10">
              变化前
            </div>
            <div className="border-2 border-red-200 bg-red-50/50 rounded-xl p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">原始外推值</span>
              </div>
              <div className="text-center py-6">
                <p className="text-5xl font-bold text-red-500 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {extrapolateRecord.valueBefore}
                </p>
                <p className="text-xs text-red-400">超出阈值范围</p>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">阈值下限</span>
                  <span className="font-medium text-slate-700">{(extrapolateRecord.threshold * 0.5).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">阈值上限</span>
                  <span className="font-medium text-slate-700">{(extrapolateRecord.threshold * 1.5).toFixed(1)}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (extrapolateRecord.threshold * 1.5) / 200 * 100)}%` }}
                  />
                </div>
                <div
                  className="relative mt-1"
                  style={{ left: `${Math.min(100, (extrapolateRecord.valueBefore || 0) / 200 * 100)}%` }}
                >
                  <div className="absolute -top-1 w-2 h-2 bg-red-500 rounded-full transform -translate-x-1/2" />
                  <span className="absolute top-1 text-[10px] text-red-500 transform -translate-x-1/2 whitespace-nowrap">
                    当前值
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="hidden md:flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg absolute -left-6 top-1/2 -translate-y-1/2 z-10">
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
            <div className="md:hidden flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full shadow-lg mx-auto my-2">
              <ArrowRight className="w-6 h-6 text-white rotate-90" />
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-2 left-4 bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5 rounded-full z-10">
              变化后
            </div>
            <div className="border-2 border-emerald-200 bg-emerald-50/50 rounded-xl p-6 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-700">裁剪后有效值</span>
              </div>
              <div className="text-center py-6">
                <p className="text-5xl font-bold text-emerald-500 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {extrapolateRecord.valueAfter}
                </p>
                <p className="text-xs text-emerald-400">已纳入阈值范围</p>
              </div>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">阈值下限</span>
                  <span className="font-medium text-slate-700">{(extrapolateRecord.threshold * 0.5).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">阈值上限</span>
                  <span className="font-medium text-slate-700">{(extrapolateRecord.threshold * 1.5).toFixed(1)}</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (extrapolateRecord.threshold * 1.5) / 200 * 100)}%` }}
                  />
                </div>
                <div
                  className="relative mt-1"
                  style={{ left: `${Math.min(100, (extrapolateRecord.valueAfter || 0) / 200 * 100)}%` }}
                >
                  <div className="absolute -top-1 w-2 h-2 bg-emerald-500 rounded-full transform -translate-x-1/2" />
                  <span className="absolute top-1 text-[10px] text-emerald-500 transform -translate-x-1/2 whitespace-nowrap">
                    当前值
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: getBoundaryTypeColor(extrapolateRecord.type) + '20' }}
            >
              <span
                className="text-sm font-bold"
                style={{ color: getBoundaryTypeColor(extrapolateRecord.type) }}
              >
                外
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: getBoundaryTypeColor(extrapolateRecord.type) + '15',
                    color: getBoundaryTypeColor(extrapolateRecord.type),
                  }}
                >
                  {getBoundaryTypeLabel(extrapolateRecord.type)}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDate(extrapolateRecord.sourceMaterial.uploadTime)}
                </span>
              </div>
              <p className="text-sm text-slate-600">{extrapolateRecord.explanation}</p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>
                  来源: <span className="text-slate-700">{extrapolateRecord.sourceMaterial.name}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtrapolateCompare;
