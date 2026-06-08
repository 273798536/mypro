import { useEffect, useState } from 'react';
import { useExerciseStore } from '@/store/useExerciseStore';
import { Download, Trash2, FileJson, FileSpreadsheet, Package, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import type { ExportJob } from '../../shared/types';

const formatConfig: Record<string, { label: string; icon: typeof FileJson; className: string }> = {
  json: { label: 'JSON', icon: FileJson, className: 'bg-deep-space-600 text-white' },
  csv: { label: 'CSV', icon: FileSpreadsheet, className: 'bg-green-pass/20 text-green-pass' },
  zip: { label: 'ZIP (含截图)', icon: Package, className: 'bg-amber-warn/20 text-amber-warn' },
};

const statusConfig: Record<ExportJob['status'], { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: '等待中', icon: Clock, className: 'text-deep-space-300' },
  processing: { label: '处理中', icon: Loader, className: 'text-ice-blue' },
  completed: { label: '已完成', icon: CheckCircle, className: 'text-green-pass' },
  failed: { label: '失败', icon: XCircle, className: 'text-red-reject' },
};

export default function ExportPage() {
  const { exportJobs, loading, error, fetchExportJobs, createExportJob } = useExerciseStore();

  const [format, setFormat] = useState('zip');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exerciseStatus, setExerciseStatus] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchExportJobs();
  }, [fetchExportJobs]);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + 10;
      });
    }, 300);

    try {
      const filter: Record<string, unknown> = {};
      if (startDate) filter.startDate = startDate;
      if (endDate) filter.endDate = endDate;
      if (exerciseStatus) filter.exerciseStatus = exerciseStatus;
      if (reviewStatus) filter.reviewStatus = reviewStatus;

      await createExportJob(format, Object.keys(filter).length > 0 ? filter : null);
      setProgress(100);
      await fetchExportJobs();
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setIsExporting(false);
        setProgress(0);
      }, 500);
    }
  };

  const handleDownload = (job: ExportJob) => {
    window.open(`/api/export/${job.id}/download`, '_blank');
  };

  const formatFileName = (job: ExportJob): string => {
    const ext = job.format === 'json' ? 'json' : job.format === 'csv' ? 'csv' : 'zip';
    return `export_${job.id.slice(0, 8)}.${ext}`;
  };

  return (
    <div className="min-h-screen bg-deep-space-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ice-blue">数据导出</h1>
          <p className="text-deep-space-300 mt-2">配置筛选条件，导出练习记录数据</p>
        </div>

        <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-6">导出配置</h2>

          <div className="mb-6">
            <label className="block text-sm text-deep-space-300 mb-3">导出格式</label>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(formatConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                const isSelected = format === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      isSelected
                        ? 'border-ice-blue bg-ice-blue/10 shadow-glow-ice'
                        : 'border-deep-space-600 bg-deep-space-700 hover:border-deep-space-500'
                    }`}
                  >
                    <Icon size={28} className={isSelected ? 'text-ice-blue' : 'text-deep-space-300'} />
                    <span className={isSelected ? 'text-ice-blue font-medium' : 'text-white'}>
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-deep-space-300 mb-2">起始时间</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 bg-deep-space-700 border border-deep-space-600 rounded-lg focus:outline-none focus:border-ice-blue text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-deep-space-300 mb-2">结束时间</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 bg-deep-space-700 border border-deep-space-600 rounded-lg focus:outline-none focus:border-ice-blue text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm text-deep-space-300 mb-2">练习状态</label>
              <select
                value={exerciseStatus}
                onChange={(e) => setExerciseStatus(e.target.value)}
                className="w-full px-4 py-2 bg-deep-space-700 border border-deep-space-600 rounded-lg focus:outline-none focus:border-ice-blue text-white"
              >
                <option value="">全部状态</option>
                <option value="draft">草稿</option>
                <option value="reviewing">审核中</option>
                <option value="confirmed">已确认</option>
                <option value="archived">已归档</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-deep-space-300 mb-2">审核状态</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
                className="w-full px-4 py-2 bg-deep-space-700 border border-deep-space-600 rounded-lg focus:outline-none focus:border-ice-blue text-white"
              >
                <option value="">全部审核状态</option>
                <option value="approved">已通过</option>
                <option value="pending">待审核</option>
                <option value="rejected">已拒绝</option>
              </select>
            </div>
          </div>

          {isExporting && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-deep-space-300">导出进度</span>
                <span className="text-sm text-ice-blue">{progress}%</span>
              </div>
              <div className="w-full h-3 bg-deep-space-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-ice-blue to-ice-blue-hover transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              onClick={handleExport}
              disabled={isExporting || loading}
              className="flex items-center gap-2 px-6 py-2 bg-ice-blue text-deep-space-900 rounded-lg hover:bg-ice-blue-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              {isExporting ? '导出中...' : '开始导出'}
            </button>
          </div>
        </div>

        <div className="bg-deep-space-800 border border-deep-space-600 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-deep-space-700">
            <h2 className="text-lg font-semibold">导出历史</h2>
          </div>

          {error && (
            <div className="m-6 p-4 bg-red-reject/20 border border-red-reject/50 rounded-lg text-red-reject">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-deep-space-300">加载中...</div>
          ) : exportJobs.length === 0 ? (
            <div className="p-12 text-center text-deep-space-300">暂无导出记录</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-deep-space-700/50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-deep-space-200">文件名</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-deep-space-200">格式</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-deep-space-200">状态</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-deep-space-200">创建时间</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-deep-space-200">操作</th>
                </tr>
              </thead>
              <tbody>
                {exportJobs.map((job) => {
                  const fmtCfg = formatConfig[job.format] || formatConfig.zip;
                  const stCfg = statusConfig[job.status];
                  const FormatIcon = fmtCfg.icon;
                  const StatusIcon = stCfg.icon;
                  return (
                    <tr key={job.id} className="border-t border-deep-space-700 hover:bg-deep-space-700/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fmtCfg.className}`}>
                            <FormatIcon size={16} />
                          </div>
                          <span className="text-white font-medium">{formatFileName(job)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white">{fmtCfg.label}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <StatusIcon size={16} className={stCfg.className} />
                          <span className={stCfg.className}>{stCfg.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-deep-space-300 text-sm">
                        {new Date(job.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(job)}
                            disabled={job.status !== 'completed'}
                            className="p-2 rounded-lg hover:bg-deep-space-700 text-deep-space-200 hover:text-ice-blue disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="下载"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            className="p-2 rounded-lg hover:bg-deep-space-700 text-deep-space-200 hover:text-red-reject transition-colors"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
