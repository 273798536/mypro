import { useState } from 'react';
import { Download, Save, Database, CheckCircle2, AlertTriangle, XCircle, AlertCircle, FileWarning, Calculator } from 'lucide-react';
import { useVerificationStore } from '@/store/useVerificationStore';
import UploadZone from '@/components/UploadZone';
import FilterPanel from '@/components/FilterPanel';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import { exportToCSV } from '@/utils/csv';
import type { RawParameterRecord, ChangeEntry } from '@/types';

export default function Workbench() {
  const {
    rawRecords,
    verificationResults,
    filterCriteria,
    filteredResults,
    statistics,
    sourceFileName,
    setRawRecords,
    setFilter,
    resetFilter,
    addTempJudgment,
    saveAsVersion,
    currentVersionId,
  } = useVerificationStore();

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [versionDesc, setVersionDesc] = useState('');
  const [operatorName, setOperatorName] = useState('阿乔');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleUpload = (records: RawParameterRecord[], fileName: string) => {
    setRawRecords(records);
  };

  const handleExportCSV = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCSV(filteredResults, `马尔可夫链边界校验_${dateStr}.csv`);
  };

  const handleSaveVersion = () => {
    if (!versionDesc.trim()) return;
    const changes: ChangeEntry[] = [
      {
        field: 'upload',
        oldValue: currentVersionId || '(新建)',
        newValue: `${rawRecords.length}条记录`,
        changeType: 'parameter',
        reason: versionDesc,
        timestamp: Date.now(),
        operatorName,
      },
    ];
    saveAsVersion(operatorName, versionDesc, changes);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSaveModal(false);
      setVersionDesc('');
    }, 1200);
  };

  const handleAddJudgment = (id: string, judgment: string) => {
    addTempJudgment(id, judgment, '阿乔');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-16 flex-shrink-0 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">校验工作台</h2>
          <p className="text-xs text-slate-500">上传参数表，执行马尔可夫链边界校验</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={rawRecords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.8} />
            保存版本
          </button>
          <button
            onClick={handleExportCSV}
            disabled={filteredResults.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.8} />
            导出 CSV
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {rawRecords.length === 0 && (
          <div className="max-w-xl mx-auto pt-8">
            <UploadZone onUpload={handleUpload} />
          </div>
        )}

        {rawRecords.length > 0 && (
          <>
            <div className="grid grid-cols-7 gap-3">
              <StatCard
                label="总记录数"
                value={statistics.total}
                total={statistics.total}
                colorClass="text-slate-200"
                bgClass="bg-slate-800/40"
                icon={<Database className="w-4 h-4" strokeWidth={1.8} />}
              />
              <StatCard
                label="正常"
                value={statistics.normalCount}
                total={statistics.total}
                colorClass="text-emerald-400"
                bgClass="bg-slate-800/40"
                icon={<CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />}
              />
              <StatCard
                label="边界"
                value={statistics.boundaryCount}
                total={statistics.total}
                colorClass="text-amber-400"
                bgClass="bg-slate-800/40"
                icon={<AlertTriangle className="w-4 h-4" strokeWidth={1.8} />}
              />
              <StatCard
                label="异常"
                value={statistics.anomalyCount}
                total={statistics.total}
                colorClass="text-rose-400"
                bgClass="bg-slate-800/40"
                icon={<XCircle className="w-4 h-4" strokeWidth={1.8} />}
              />
              <StatCard
                label="除零边界"
                value={statistics.zeroDivisionCount}
                total={statistics.total}
                colorClass="text-orange-400"
                bgClass="bg-slate-800/40"
                icon={<AlertCircle className="w-4 h-4" strokeWidth={1.8} />}
              />
              <StatCard
                label="解析错误"
                value={statistics.parseErrorCount}
                total={statistics.total}
                colorClass="text-rose-300"
                bgClass="bg-rose-500/10"
                icon={<FileWarning className="w-4 h-4" strokeWidth={1.8} />}
              />
              <StatCard
                label="计算错误"
                value={statistics.computeErrorCount}
                total={statistics.total}
                colorClass="text-orange-300"
                bgClass="bg-orange-500/10"
                icon={<Calculator className="w-4 h-4" strokeWidth={1.8} />}
              />
            </div>

            <FilterPanel
              filter={filterCriteria}
              totalCount={statistics.total}
              zeroDivisionCount={statistics.zeroDivisionCount}
              normalCount={statistics.normalCount}
              boundaryCount={statistics.boundaryCount}
              anomalyCount={statistics.anomalyCount}
              onFilterChange={setFilter}
              onReset={resetFilter}
            />

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                数据源：<span className="text-slate-400 font-mono">{sourceFileName}</span>
                <span className="mx-2 text-slate-700">|</span>
                共 <span className="text-slate-300 font-mono">{statistics.total}</span> 条，
                筛选后 <span className="text-amber-400 font-mono">{statistics.filteredTotal}</span> 条
              </div>
              <div className="text-xs text-slate-600">
                所有统计、筛选、明细、导出均来自同一结果集
              </div>
            </div>

            <DataTable records={filteredResults} onAddJudgment={handleAddJudgment} />
          </>
        )}
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-96 rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-200 mb-4">保存为新版本</h3>
            {saveSuccess ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" strokeWidth={1.8} />
                <div className="text-sm text-emerald-400">保存成功</div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">操作人</label>
                    <input
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded border border-slate-700 bg-slate-800 text-slate-200 focus:outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">变更说明</label>
                    <textarea
                      value={versionDesc}
                      onChange={(e) => setVersionDesc(e.target.value)}
                      placeholder="描述本次修改的内容和原因..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm rounded border border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 resize-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-3 py-1.5 text-xs rounded border border-slate-600 text-slate-400 hover:bg-slate-800 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveVersion}
                    disabled={!versionDesc.trim()}
                    className="px-3 py-1.5 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    保存
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
