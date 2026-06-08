import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { parseFile } from '@/utils/parser';
import type { PocketRecord } from '@/types';

interface ImportPanelProps {
  onComplete?: () => void;
}

interface ImportResult {
  fileName: string;
  total: number;
  added: number;
  duplicates: number;
  errors: string[];
  sampleRecords: PocketRecord[];
}

export function ImportPanel({ onComplete }: ImportPanelProps) {
  const { addRecords, hasFileImported, records } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setIsLoading(true);
    setLastResult(null);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(ext || '')) {
        setError('仅支持 CSV 和 Excel (.xlsx, .xls) 格式文件');
        setIsLoading(false);
        return;
      }

      const wasImported = hasFileImported(file.name);
      const { records: parsedRecords, errors } = await parseFile(file);

      if (parsedRecords.length === 0 && errors.length > 0) {
        setError(`文件解析失败：${errors[0]}`);
        setIsLoading(false);
        return;
      }

      const { added, duplicates } = addRecords(parsedRecords);

      setLastResult({
        fileName: file.name,
        total: parsedRecords.length,
        added,
        duplicates,
        errors,
        sampleRecords: parsedRecords.slice(0, 3),
      });

      if (wasImported && duplicates > 0) {
        setError(`检测到重复导入：文件 "${file.name}" 之前已导入过，已自动跳过 ${duplicates} 条重复记录`);
      }
    } catch (e) {
      setError(`导入失败：${e}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const stats = {
    total: records.length,
    usable: records.filter((r) => r.reviewStatus === 'usable').length,
    pending: records.filter((r) => r.reviewStatus === 'pending').length,
    unusable: records.filter((r) => r.reviewStatus === 'unusable').length,
  };

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors',
          isDragging
            ? 'border-pocket-accent bg-pocket-accent/5'
            : 'border-pocket-border hover:border-pocket-accent/50 hover:bg-pocket-card',
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          {isLoading ? (
            <div className="flex items-center gap-2 text-pocket-accent">
              <Loader2 size={36} className="animate-spin" />
              <span className="text-sm">正在解析文件...</span>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-pocket-card p-4">
                <Upload size={28} className="text-pocket-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-pocket-text">
                  拖放文件到此处，或点击选择文件
                </p>
                <p className="mt-1 text-[11px] text-pocket-muted">
                  支持 CSV、XLSX、XLS 格式
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-pocket-yellow/30 bg-pocket-yellow/10 p-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-pocket-yellow" />
          <div>
            <p className="text-xs font-medium text-pocket-yellow">提示</p>
            <p className="mt-0.5 text-[11px] text-pocket-text">{error}</p>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="rounded-lg border border-pocket-border bg-pocket-card p-4 fade-in">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-pocket-green" />
              <span className="text-sm font-medium text-pocket-text">导入完成</span>
            </div>
            <span className="font-mono text-[11px] text-pocket-muted">{lastResult.fileName}</span>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-pocket-border bg-pocket-bg p-2.5 text-center">
              <div className="text-lg font-semibold text-pocket-text">{lastResult.total}</div>
              <div className="text-[10px] text-pocket-muted">解析记录</div>
            </div>
            <div className="rounded-md border border-pocket-green/30 bg-pocket-green/10 p-2.5 text-center">
              <div className="text-lg font-semibold text-pocket-green">{lastResult.added}</div>
              <div className="text-[10px] text-pocket-green/80">成功新增</div>
            </div>
            <div className="rounded-md border border-pocket-yellow/30 bg-pocket-yellow/10 p-2.5 text-center">
              <div className="text-lg font-semibold text-pocket-yellow">{lastResult.duplicates}</div>
              <div className="text-[10px] text-pocket-yellow/80">重复跳过</div>
            </div>
          </div>

          {lastResult.errors.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[11px] font-medium text-pocket-red">解析警告 ({lastResult.errors.length} 条)</p>
              <div className="max-h-24 overflow-y-auto rounded-md border border-pocket-red/20 bg-pocket-red/5 p-2">
                {lastResult.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-[10px] text-pocket-red/80">
                    {err}
                  </p>
                ))}
                {lastResult.errors.length > 5 && (
                  <p className="text-[10px] text-pocket-muted">... 还有 {lastResult.errors.length - 5} 条</p>
                )}
              </div>
            </div>
          )}

          {lastResult.sampleRecords.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-pocket-muted">数据预览（前3条）</p>
              <div className="overflow-x-auto rounded-md border border-pocket-border">
                <table className="w-full min-w-[500px]">
                  <thead className="bg-pocket-bg">
                    <tr className="text-[10px] text-pocket-muted">
                      <th className="px-2 py-1.5 text-left">行号</th>
                      <th className="px-2 py-1.5 text-left">蛋白</th>
                      <th className="px-2 py-1.5 text-left">坐标</th>
                      <th className="px-2 py-1.5 text-left">亲和力</th>
                      <th className="px-2 py-1.5 text-left">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lastResult.sampleRecords.map((r) => (
                      <tr key={r.id} className="border-t border-pocket-border/50 text-[11px]">
                        <td className="px-2 py-1.5 font-mono text-pocket-muted">#{r.originalRowNumber}</td>
                        <td className="px-2 py-1.5 text-pocket-text">{r.proteinName}</td>
                        <td className="px-2 py-1.5 font-mono text-pocket-muted">
                          ({r.pocketCoordinates.x.toFixed(1)}, {r.pocketCoordinates.y.toFixed(1)})
                        </td>
                        <td className="px-2 py-1.5 font-mono text-pocket-text">{r.affinity.toFixed(1)}</td>
                        <td className="px-2 py-1.5">
                          <span
                            className={clsx(
                              'text-[10px]',
                              r.reviewStatus === 'usable' && 'text-pocket-green',
                              r.reviewStatus === 'pending' && 'text-pocket-yellow',
                              r.reviewStatus === 'unusable' && 'text-pocket-red',
                            )}
                          >
                            {r.reviewStatus === 'usable' ? '可用' : r.reviewStatus === 'pending' ? '待复核' : '不可用'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {onComplete && (
            <button
              onClick={onComplete}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-pocket-accent/40 bg-pocket-accent/10 py-2 text-xs font-medium text-pocket-accent hover:bg-pocket-accent/20"
            >
              <RefreshCw size={12} />
              继续导入其他文件
            </button>
          )}
        </div>
      )}

      <div className="rounded-lg border border-pocket-border bg-pocket-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <FileSpreadsheet size={14} className="text-pocket-accent" />
          <span className="text-sm font-medium text-pocket-text">当前数据统计</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-md border border-pocket-border bg-pocket-bg p-2.5 text-center">
            <div className="text-xl font-semibold text-pocket-text">{stats.total}</div>
            <div className="text-[10px] text-pocket-muted">总记录</div>
          </div>
          <div className="rounded-md border border-pocket-green/30 bg-pocket-green/10 p-2.5 text-center">
            <div className="text-xl font-semibold text-pocket-green">{stats.usable}</div>
            <div className="text-[10px] text-pocket-green/80">可直接使用</div>
          </div>
          <div className="rounded-md border border-pocket-yellow/30 bg-pocket-yellow/10 p-2.5 text-center">
            <div className="text-xl font-semibold text-pocket-yellow">{stats.pending}</div>
            <div className="text-[10px] text-pocket-yellow/80">待复核</div>
          </div>
          <div className="rounded-md border border-pocket-red/30 bg-pocket-red/10 p-2.5 text-center">
            <div className="text-xl font-semibold text-pocket-red">{stats.unusable}</div>
            <div className="text-[10px] text-pocket-red/80">不可用</div>
          </div>
        </div>
      </div>
    </div>
  );
}
