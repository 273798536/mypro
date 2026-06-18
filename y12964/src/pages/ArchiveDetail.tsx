import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useArchiveStore } from '@/store/useArchiveStore';
import { StatusBadge, AnomalyBadge } from '@/components/StatusBadge';
import { BackupGapChart } from '@/components/BackupGapChart';
import { SourceTimeline } from '@/components/SourceTimeline';
import { ProcessingNotes } from '@/components/ProcessingNotes';
import { SlowQueryForm } from '@/components/SlowQueryForm';
import { AuditLogTimeline } from '@/components/AuditLogTimeline';
import { cn } from '@/lib/utils';
import { formatDateTime, formatNumber, getMissingCount } from '@/data/mockData';
import {
  ArrowLeft,
  Database,
  FileDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { ExportFormat } from '@/types';

export default function ArchiveDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { records, loadRecords, loadRecordById, currentRecord, addSlowQueryLog, addProcessingNote, exportReport, recalculateStatus } = useArchiveStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [operator, setOperator] = useState('DBA-CurrentUser');

  useEffect(() => {
    if (records.length === 0) {
      loadRecords();
    }
  }, [records.length, loadRecords]);

  useEffect(() => {
    if (id && records.length > 0) {
      loadRecordById(id);
    }
  }, [id, records, loadRecordById]);

  if (!currentRecord) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">加载中...</p>
        </div>
      </div>
    );
  }

  const missing = getMissingCount(currentRecord);
  const isBlocked = currentRecord.status === 'error' && currentRecord.anomalyType === 'backup_gap';

  const handleExport = (format: ExportFormat) => {
    exportReport(currentRecord.id, format, operator);
    setShowExportMenu(false);
  };

  const handleAddSlowQuery = (log: {
    queryId: string;
    executionTime: number;
    startTime: string;
    sqlContent: string;
    operator: string;
  }) => {
    addSlowQueryLog(currentRecord.id, log);
  };

  const handleAddNote = (content: string, source: string) => {
    addProcessingNote(currentRecord.id, content, source);
  };

  const handleRecalculate = () => {
    recalculateStatus(currentRecord.id);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="p-2 bg-slate-900 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">归档详情</h1>
                <p className="text-xs text-slate-500">{currentRecord.batchNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRecalculate}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                  'border border-slate-200 rounded-md text-slate-700',
                  'hover:bg-slate-50 transition-colors'
                )}
              >
                <RefreshCw className="w-4 h-4" />
                重新计算状态
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className={cn(
                    'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium',
                    'bg-slate-900 text-white rounded-md',
                    'hover:bg-slate-800 transition-colors'
                  )}
                >
                  <FileDown className="w-4 h-4" />
                  导出报告
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden">
                    <div className="p-3 border-b border-slate-200">
                      <label className="block text-xs text-slate-500 mb-1.5">操作人</label>
                      <input
                        type="text"
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className={cn(
                          'w-full px-3 py-2 text-sm border border-slate-200 rounded-md',
                          'bg-white focus:outline-none focus:ring-2 focus:ring-slate-200'
                        )}
                      />
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => handleExport('csv')}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md',
                          'hover:bg-slate-50 transition-colors text-left'
                        )}
                      >
                        <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center text-xs font-bold">
                          CSV
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">导出为 CSV</p>
                          <p className="text-xs text-slate-500">适合 Excel 查看审计</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleExport('json')}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md',
                          'hover:bg-slate-50 transition-colors text-left'
                        )}
                      >
                        <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded flex items-center justify-center text-xs font-bold">
                          JSON
                        </span>
                        <div>
                          <p className="font-medium text-slate-700">导出为 JSON</p>
                          <p className="text-xs text-slate-500">适合程序处理</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {isBlocked && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">
                此记录因备份缺口已被系统拦截，禁止迁移。请处理缺口后再导出报告。
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold font-mono text-slate-900">
                    {currentRecord.tableName}
                  </h2>
                  <StatusBadge status={currentRecord.status} className="text-sm" />
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>运行批次：<span className="font-mono text-slate-700">{currentRecord.batchNumber}</span></span>
                  <span>运行时间：{formatDateTime(currentRecord.runTimestamp)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AnomalyBadge type={currentRecord.anomalyType} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">预期记录数</p>
                <p className="text-2xl font-bold font-mono text-slate-800">
                  {formatNumber(currentRecord.expectedCount)}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-xs text-slate-500 mb-1">实际记录数</p>
                <p className="text-2xl font-bold font-mono text-slate-800">
                  {formatNumber(currentRecord.actualCount)}
                </p>
              </div>
              <div className={cn(
                'border rounded-lg p-4',
                missing > 0
                  ? 'bg-red-50 border-red-200'
                  : 'bg-emerald-50 border-emerald-200'
              )}>
                <p className="text-xs text-slate-500 mb-1">缺失记录数</p>
                <p className={cn(
                  'text-2xl font-bold font-mono',
                  missing > 0 ? 'text-red-600' : 'text-emerald-600'
                )}>
                  {missing > 0 ? `-${formatNumber(missing)}` : '0'}
                </p>
              </div>
              <div className={cn(
                'border rounded-lg p-4',
                currentRecord.pageSequenceValid
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-amber-50 border-amber-200'
              )}>
                <p className="text-xs text-slate-500 mb-1">分页序列</p>
                <div className="flex items-center gap-2">
                  {currentRecord.pageSequenceValid ? (
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="font-mono text-sm text-slate-700">
                    [{currentRecord.pageSequence.join(', ')}]
                  </span>
                </div>
              </div>
            </div>
          </div>

          {currentRecord.backupGaps.length > 0 &&
            currentRecord.backupGaps.map((gap) => (
              <BackupGapChart key={gap.id} gap={gap} />
            ))}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SourceTimeline
              sources={currentRecord.source}
              pageSequence={currentRecord.pageSequence}
              pageSequenceValid={currentRecord.pageSequenceValid}
            />
            <div className="space-y-6">
              <ProcessingNotes
                notes={currentRecord.processingNotes}
                onAddNote={handleAddNote}
              />
            </div>
          </div>

          <SlowQueryForm
            logs={currentRecord.slowQueryLogs}
            onAddLog={handleAddSlowQuery}
          />

          <AuditLogTimeline
            logs={currentRecord.auditLogs}
            exportBatches={currentRecord.exportBatches}
          />
        </div>
      </main>

      {showExportMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}
