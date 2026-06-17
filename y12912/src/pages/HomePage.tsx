import { useState, useRef } from 'react';
import { useWorkflowStore } from '../store';
import { formatDateTime } from '../utils';
import { Upload, Database, Clock, Activity, AlertCircle, CheckCircle, X, FolderUp } from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { batches, importBatch, selectBatch } = useWorkflowStore();
  const [isDragging, setIsDragging] = useState(false);
  const [duplicateAlert, setDuplicateAlert] = useState<{ show: boolean; batchName: string }>({ show: false, batchName: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = importBatch(file.name, content);
      if (result.isDuplicate) {
        setDuplicateAlert({ show: true, batchName: result.batch.name });
        setTimeout(() => setDuplicateAlert({ show: false, batchName: '' }), 4000);
      }
      selectBatch(result.batch.id);
      onNavigate(`/batch/${result.batch.id}`);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const getBatchSummary = (batch: typeof batches[0]) => {
    const runs = useWorkflowStore.getState().getBatchRuns(batch.id);
    const latestRun = runs[0];
    const stats = latestRun ? useWorkflowStore.getState().getUnifiedStats(latestRun.id) : null;
    return { runs, latestRun, stats };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950">
      {duplicateAlert.show && (
        <div className="fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded shadow-lg">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <div className="text-amber-400 font-medium">检测到同批次数据</div>
            <div className="text-slate-300 text-xs mt-0.5">
              「{duplicateAlert.batchName}」已存在，已归入原批次。不会产生冲突结论。
            </div>
          </div>
          <button
            onClick={() => setDuplicateAlert({ show: false, batchName: '' })}
            className="text-slate-400 hover:text-slate-200 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="font-mono text-2xl font-bold text-slate-100">批次管理</h1>
          <p className="text-slate-400 text-sm mt-1">导入切分清单，系统会自动识别同一批数据，避免冲突结论。</p>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer border-2 border-dashed rounded p-10 mb-10 text-center transition-all ${
            isDragging
              ? 'border-cyan-500 bg-cyan-500/5'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.csv,.jsonl,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
          <FolderUp className={`mx-auto mb-3 ${isDragging ? 'text-cyan-500' : 'text-slate-500'}`} size={40} />
          <div className="font-medium text-slate-200 mb-1">拖拽切分清单到此处，或点击选择文件</div>
          <div className="text-xs text-slate-500">支持 JSON、CSV、JSONL、TXT 格式。同一批数据重复导入会自动识别。</div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-base text-slate-300 flex items-center gap-2">
            <Database size={16} />
            全部批次 ({batches.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map((batch) => {
            const { runs, latestRun, stats } = getBatchSummary(batch);
            return (
              <div
                key={batch.id}
                onClick={() => {
                  selectBatch(batch.id);
                  onNavigate(`/batch/${batch.id}`);
                }}
                className="bg-slate-900 border border-slate-700 rounded p-5 cursor-pointer hover:border-slate-500 hover:bg-slate-800/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-mono font-semibold text-slate-100">{batch.name}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{batch.sourceFile}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                    运行 {batch.runCount} 次
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">样本总数</div>
                    <div className="font-mono text-sm text-slate-200">{stats?.dedup.totalSamples.toLocaleString() ?? '-'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">异常总数</div>
                    <div className={`font-mono text-sm ${stats && stats.totalAnomalies > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {stats?.totalAnomalies ?? '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-1">待处理</div>
                    <div className={`font-mono text-sm ${stats && stats.pendingAnomalies > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {stats?.pendingAnomalies ?? '-'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    <span>最新运行: {latestRun ? formatDateTime(latestRun.executedAt) : '-'}</span>
                  </div>
                  {latestRun && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                      {latestRun.promptVersion}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {batches.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <Database size={40} className="mx-auto mb-3 opacity-50" />
            <div className="text-sm">暂无数据批次，请先导入切分清单</div>
          </div>
        )}
      </div>
    </div>
  );
}
