import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  FileJson,
  Table,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { useSnapshotStore } from '@/store/snapshotStore';
import { handleExport, generateExportMetadata, ensureConsistency } from '@/services/exporter';
import type { ExportFormat } from '@/types';
import { formatDate, formatCurrency, getStatusLabel } from '@/utils/formatters';

export default function Export() {
  const { snapshots } = useSnapshotStore();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>(
    snapshots.map(s => s.id)
  );
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [lastExportHash, setLastExportHash] = useState<string | null>(null);

  const filteredSnapshots = snapshots.filter(s => {
    if (!dateRange.start && !dateRange.end) return true;
    const snapDate = new Date(s.createdAt);
    if (dateRange.start && snapDate < new Date(dateRange.start)) return false;
    if (dateRange.end && snapDate > new Date(dateRange.end + 'T23:59:59')) return false;
    return true;
  }).filter(s => selectedSnapshots.includes(s.id));

  const pageState = {
    format,
    dateRange,
    selectedSnapshots: [...selectedSnapshots].sort(),
    timestamp: Date.now()
  };

  const metadata = generateExportMetadata(filteredSnapshots, pageState);
  const isConsistent = lastExportHash ? ensureConsistency(
    { metadata: { ...metadata, pageStateHash: lastExportHash }, snapshots: filteredSnapshots },
    pageState
  ) : true;

  const handleExportClick = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    handleExport(filteredSnapshots, format, pageState);
    setLastExportHash(metadata.pageStateHash);
    setIsExporting(false);
  };

  const toggleSnapshot = (id: string) => {
    setSelectedSnapshots(prev =>
      prev.includes(id)
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    );
  };

  const formatOptions = [
    { key: 'csv', label: 'CSV', icon: Table, desc: '适合 Excel 打开' },
    { key: 'excel', label: 'Excel', icon: FileText, desc: '完整格式导出' },
    { key: 'json', label: 'JSON', icon: FileJson, desc: '程序可读取格式' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <motion.h1 
          className="text-3xl font-bold text-white mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          导出中心
        </motion.h1>
        <motion.p 
          className="text-slate-400"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          导出历史时间线数据，确保页面状态与文件内容一致性
        </motion.p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              时间范围筛选
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">开始日期</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">结束日期</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              选择导出版本
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-2">
              {snapshots.map((snapshot, index) => (
                <motion.div
                  key={snapshot.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedSnapshots.includes(snapshot.id)
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-slate-900/30 border-slate-700/50 hover:border-slate-600'
                  }`}
                  onClick={() => toggleSnapshot(snapshot.id)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedSnapshots.includes(snapshot.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-slate-600'
                  }`}>
                    {selectedSnapshots.includes(snapshot.id) && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-display text-white font-semibold">
                        {snapshot.version}
                      </span>
                      <span className={`badge badge-${snapshot.status} text-xs`}>
                        {getStatusLabel(snapshot.status)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono-display mt-0.5">
                      {snapshot.modelVersion}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono-display font-semibold">
                      {formatCurrency(snapshot.totalCost)}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(snapshot.createdAt)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                已选择 <span className="text-white font-semibold">{selectedSnapshots.length}</span> 个版本
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedSnapshots(snapshots.map(s => s.id))}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  全选
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setSelectedSnapshots([])}
                  className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  清空
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              导出格式
            </h3>
            <div className="space-y-2">
              {formatOptions.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setFormat(option.key as ExportFormat)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all text-left ${
                    format === option.key
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-900/30 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    format === option.key
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    <option.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${format === option.key ? 'text-white' : 'text-slate-300'}`}>
                      {option.label}
                    </p>
                    <p className="text-xs text-slate-500">{option.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-amber-400" />
              导出预览
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">导出版本数</span>
                <span className="text-white font-semibold">{filteredSnapshots.length} 个</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">时间范围</span>
                <span className="text-white font-mono-display text-xs">
                  {metadata.dateRange.start.slice(0, 10)} ~ {metadata.dateRange.end.slice(0, 10)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">导出格式</span>
                <span className="text-white uppercase">{format}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">状态校验</span>
                {isConsistent ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    一致
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    已变更
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="w-full mt-4 btn btn-outline text-sm"
            >
              {showPreview ? '隐藏详情' : '查看导出元数据'}
            </button>

            {showPreview && (
              <div className="mt-4 p-4 bg-slate-900/70 rounded-lg border border-slate-700/50">
                <p className="text-xs text-slate-400 mb-2">页面状态校验码</p>
                <code className="text-xs text-emerald-400 font-mono break-all">
                  {metadata.pageStateHash}
                </code>
                <p className="text-xs text-slate-400 mt-3 mb-2">导出时间</p>
                <p className="text-xs text-white font-mono">
                  {formatDate(metadata.exportedAt)}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-700/50">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400">
                      导出文件包含完整元数据，可校验页面状态与文件内容的一致性，防止数据篡改。
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          <motion.button
            onClick={handleExportClick}
            disabled={isExporting || filteredSnapshots.length === 0}
            className="w-full btn btn-primary py-4 text-lg disabled:opacity-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {isExporting ? (
              <>
                <Clock className="w-5 h-5 animate-spin" />
                正在导出...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                导出 {filteredSnapshots.length} 个版本
              </>
            )}
          </motion.button>

          {!isConsistent && lastExportHash && (
            <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-400 font-medium text-sm">页面状态已变更</p>
                  <p className="text-slate-400 text-xs mt-1">
                    自上次导出后，筛选条件已发生变化。当前导出的内容将与上次不同，
                    请确认是否继续。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
