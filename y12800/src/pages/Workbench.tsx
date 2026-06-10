import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  Search,
  Filter,
  AlertTriangle,
  ChevronRight,
  Loader2,
  FileUp,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useQcStore } from '../store/qcStore';
import StatusBadge from '../components/StatusBadge';
import DuplicateBanner from '../components/DuplicateBanner';
import type { Sample, SampleStatus } from '../../shared/types';
import { SAMPLE_STATUS_LABELS } from '../../shared/types';

const statusFilters: { value: SampleStatus | ''; label: string }[] = [
  { value: '', label: '全部' },
  { value: 'pending_qc', label: '待质控' },
  { value: 'pending_review', label: '待复核' },
  { value: 'completed', label: '已完成' },
  { value: 'review_needed', label: '需复核' },
  { value: 'rejected', label: '不可用' },
];

const statusFlow: Record<SampleStatus, SampleStatus[]> = {
  pending_import: ['pending_qc'],
  pending_qc: ['pending_review', 'rejected'],
  pending_review: ['completed', 'review_needed', 'rejected'],
  completed: [],
  review_needed: ['pending_qc', 'rejected'],
  rejected: ['pending_qc'],
};

export default function Workbench() {
  const store = useQcStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const [activeStatus, setActiveStatus] = useState<SampleStatus | ''>('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedSample, setExpandedSample] = useState<string | null>(null);

  useEffect(() => {
    store.fetchSamples();
  }, []);

  const handleSearch = () => {
    store.setSamplesFilter({ search: searchText || undefined, status: activeStatus || undefined });
  };

  const handleStatusFilter = (status: SampleStatus | '') => {
    setActiveStatus(status);
    store.setSamplesFilter({ status: status || undefined, search: searchText || undefined });
  };

  const handleImport = async (file: File) => {
    try {
      await store.importFile(file);
      setShowImportModal(false);
    } catch {}
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImport(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImport(file);
  };

  const handleStatusChange = async (sampleId: string, newStatus: SampleStatus, note?: string) => {
    await store.updateSampleStatus(sampleId, newStatus, note);
  };

  const renderSampleRow = (sample: Sample) => {
    const isExpanded = expandedSample === sample.id;
    const nextStatuses = statusFlow[sample.status] || [];

    return (
      <tr key={sample.id} className={`table-row ${sample.isDuplicate ? 'duplicate-row' : ''}`}>
        <td className="px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2">
            {sample.isDuplicate && (
              <AlertTriangle size={14} className="text-qc-amber shrink-0" />
            )}
            <span className={sample.isDuplicate ? 'font-semibold text-amber-800' : 'font-mono'}>
              {sample.barcode}
            </span>
          </div>
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500">{sample.originalRowNumber}</td>
        <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[120px] truncate">
          {sample.imageFileName || '-'}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[150px] truncate">
          {sample.sourceRemark || '-'}
        </td>
        <td className="px-3 py-2.5 text-sm">{sample.cellCount ?? '-'}</td>
        <td className="px-3 py-2.5">
          <StatusBadge status={sample.status} />
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1">
            {sample.status === 'pending_qc' && (
              <Link
                to={`/annotation/${sample.id}`}
                className="btn-primary btn-sm"
              >
                标注
              </Link>
            )}
            {nextStatuses.length > 0 && sample.status !== 'pending_qc' && (
              <div className="flex gap-1">
                {nextStatuses.map((ns) => (
                  <button
                    key={ns}
                    onClick={() => handleStatusChange(sample.id, ns)}
                    className={`btn-sm rounded px-2 py-1 text-xs font-medium transition-colors ${
                      ns === 'completed'
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : ns === 'rejected'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {SAMPLE_STATUS_LABELS[ns]}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setExpandedSample(isExpanded ? null : sample.id)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <ChevronRight
                size={14}
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-800">质控工作台</h2>
          <p className="text-xs text-slate-400 mt-0.5">样本导入 · 条码检测 · 状态推进</p>
        </div>
        <button className="btn-primary" onClick={() => setShowImportModal(true)}>
          <Upload size={16} />
          导入样本
        </button>
      </div>

      <div className="card">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilter(f.value)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  activeStatus === f.value
                    ? 'bg-qc-teal text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索条码/备注..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field pl-8 w-48"
              />
            </div>
            <button className="btn-secondary btn-sm" onClick={handleSearch}>
              <Filter size={14} />
              筛选
            </button>
          </div>
        </div>

        {store.samplesLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-qc-teal" />
            <span className="ml-2 text-sm text-slate-500">加载中...</span>
          </div>
        ) : store.samples.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FileUp size={40} className="mb-3" />
            <p className="text-sm">暂无样本数据</p>
            <p className="text-xs mt-1">点击"导入样本"上传 CSV 文件</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="table-header">
                  <th className="px-3 py-2.5">条码</th>
                  <th className="px-3 py-2.5">行号</th>
                  <th className="px-3 py-2.5">图片名</th>
                  <th className="px-3 py-2.5">来源备注</th>
                  <th className="px-3 py-2.5">计数</th>
                  <th className="px-3 py-2.5">状态</th>
                  <th className="px-3 py-2.5">操作</th>
                </tr>
              </thead>
              <tbody>
                {store.samples.map((sample) => (
                  <tr key={sample.id}>
                    <td colSpan={7} className="p-0">
                      <table className="w-full">
                        <tbody>{renderSampleRow(sample)}</tbody>
                      </table>
                      {expandedSample === sample.id && (
                        <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 space-y-2">
                          <DuplicateBanner sample={sample} />
                          {sample.qcConclusion && (
                            <p className="text-xs text-slate-600">
                              <span className="font-medium">质控结论:</span> {sample.qcConclusion}
                            </p>
                          )}
                          {sample.reviewNote && (
                            <p className="text-xs text-slate-600">
                              <span className="font-medium">复核备注:</span> {sample.reviewNote}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400">
                            创建: {new Date(sample.createdAt).toLocaleString()} · 更新: {new Date(sample.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {store.samplesTotal > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>共 {store.samplesTotal} 条记录</span>
            <span>
              条码重复: {store.samples.filter((s) => s.isDuplicate).length} 条
            </span>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold">导入样本清单</h3>
              <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X size={18} />
              </button>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-qc-teal bg-qc-teal/5' : 'border-slate-300'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <FileUp size={32} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm text-slate-600">拖拽 CSV 文件到此处</p>
              <p className="text-xs text-slate-400 mt-1">或点击下方按钮选择文件</p>
              <button
                className="btn-primary mt-4"
                onClick={() => fileInputRef.current?.click()}
                disabled={store.importLoading}
              >
                {store.importLoading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {store.importLoading ? '导入中...' : '选择文件'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {store.importError && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded">
                {store.importError}
              </div>
            )}

            {store.importResult && (
              <div className="text-xs bg-emerald-50 text-emerald-700 p-3 rounded space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 size={14} />
                  导入成功
                </div>
                <p>总记录: {store.importResult.samples.length} 条</p>
                <p>重复条码: {store.importResult.duplicates.length} 组</p>
                {store.importResult.duplicates.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {store.importResult.duplicates.map((group, i) => (
                      <p key={i} className="text-amber-700">
                        ⚠ 条码 {group[0].barcode} 重复 {group.length} 条 —
                        行号: {group.map(s => s.originalRowNumber).join(', ')}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-slate-400">
              <p className="font-medium mb-1">CSV 格式要求:</p>
              <p>支持列名: barcode / 条码, imageFileName / 图片名, sourceRemark / 备注</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
