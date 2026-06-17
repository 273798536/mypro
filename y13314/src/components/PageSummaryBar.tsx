import { useAppStore } from '@/store/useAppStore';
import { SEGMENTS, MODEL_VERSIONS } from '@/types';
import { Clock, Filter, CheckCircle, AlertTriangle, XCircle, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { doExportPDF, doExportExcel } from '@/store/useAppStore';
import { useState } from 'react';

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getModelVersionName = (version: string): string => {
  if (version === 'all') return '全部模型';
  const mv = MODEL_VERSIONS.find(m => m.id === version);
  return mv?.name.split('(')[0].trim() || version;
};

const getSegmentNames = (segmentIds: string[]): string => {
  if (segmentIds.length === 0) return '全部分层';
  return segmentIds.map(id => {
    const seg = SEGMENTS.find(s => s.id === id);
    return seg?.name || id;
  }).join('、');
};

const getStatusName = (status: string): string => {
  const map: Record<string, string> = {
    all: '全部状态',
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝',
    suspended: '已挂起',
  };
  return map[status] || status;
};

export const PageSummaryBar = () => {
  const { pageSummary, filters, exportState } = useAppStore();
  const [exportingType, setExportingType] = useState<'pdf' | 'excel' | null>(null);

  if (!pageSummary) return null;

  const integrityConfig = {
    complete: { icon: CheckCircle, color: 'text-moss-500', bg: 'bg-moss-50', border: 'border-moss-300', label: '数据完整' },
    partial: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-300', label: '部分缺失' },
    suspended: { icon: XCircle, color: 'text-rust-500', bg: 'bg-rust-50', border: 'border-rust-300', label: '存在挂起' },
  };

  const integrity = integrityConfig[pageSummary.dataIntegrityStatus];
  const IntegrityIcon = integrity.icon;

  const handleExportPDF = async () => {
    setExportingType('pdf');
    try {
      await doExportPDF('dashboard-content');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportExcel = () => {
    setExportingType('excel');
    try {
      doExportExcel();
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="sticky top-0 z-40 glass-panel border-b border-navy-200 shadow-sm">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-4 h-4 text-navy-500" />
              <span className="text-xs font-semibold text-navy-600 uppercase tracking-wide">
                当前筛选口径
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-navy-600">
                <span className="text-navy-400 font-mono">时间：</span>
                {formatDate(filters.startDate)} ~ {formatDate(filters.endDate)}
              </span>
              {filters.minScore !== null || filters.maxScore !== null ? (
                <span className="text-navy-600">
                  <span className="text-navy-400 font-mono">评分：</span>
                  {filters.minScore ?? '不限'} ~ {filters.maxScore ?? '不限'}分
                </span>
              ) : null}
              <span className="text-navy-600">
                <span className="text-navy-400 font-mono">模型：</span>
                {getModelVersionName(filters.modelVersion)}
              </span>
              <span className="text-navy-600">
                <span className="text-navy-400 font-mono">分层：</span>
                {getSegmentNames(filters.segments)}
              </span>
              <span className="text-navy-600">
                <span className="text-navy-400 font-mono">状态：</span>
                {getStatusName(filters.status)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-l border-navy-200 pl-6">
            <div className="text-right">
              <div className="flex items-center gap-1 text-2xl font-bold font-mono text-navy-800">
                <span>{pageSummary.totalSamples}</span>
                <span className="text-sm font-normal text-navy-500">样本</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-navy-500">
                <span>通过率 <span className="font-mono font-semibold text-moss-600">{(pageSummary.passRate * 100).toFixed(1)}%</span></span>
                <span>均分 <span className="font-mono font-semibold text-navy-700">{pageSummary.avgScore.toFixed(0)}</span></span>
                {pageSummary.suspendedCount > 0 && (
                  <span className="text-rust-500">
                    挂起 <span className="font-mono font-semibold">{pageSummary.suspendedCount}</span>
                  </span>
                )}
              </div>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1.5 border ${integrity.bg} ${integrity.border}`}>
              <IntegrityIcon className={`w-4 h-4 ${integrity.color}`} />
              <span className={`text-xs font-medium ${integrity.color}`}>
                {integrity.label}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-navy-200 pl-4">
              <button
                onClick={handleExportPDF}
                disabled={exportingType === 'pdf' || exportState.isExporting}
                className="btn btn-secondary flex items-center gap-1.5 text-sm"
              >
                <FileText className="w-4 h-4" />
                {exportingType === 'pdf' ? '导出中...' : '导出PDF'}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={exportingType === 'excel' || exportState.isExporting}
                className="btn flex items-center gap-1.5 text-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                {exportingType === 'excel' ? '导出中...' : '导出Excel'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-navy-200">
          <div className="flex items-center gap-1.5 text-xs text-navy-400">
            <Clock className="w-3.5 h-3.5" />
            <span>数据截止：{formatDate(pageSummary.dataAsOf)}</span>
            <span className="text-navy-300">|</span>
            <span>最后更新：{new Date(pageSummary.lastUpdated).toLocaleString('zh-CN')}</span>
          </div>
          <div className="text-xs text-amber-600 font-medium">
            导出文件将包含以上完整筛选口径说明，与页面显示完全一致
          </div>
        </div>
      </div>
    </div>
  );
};
