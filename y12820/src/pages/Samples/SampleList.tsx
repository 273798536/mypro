import React, { useState, useMemo } from 'react';
import { Search, Filter, Upload, AlertTriangle, ChevronDown, ChevronUp, Clock, Edit3, FileText } from 'lucide-react';
import { useSampleStore } from '@/store/sampleStore';
import { useUIStore } from '@/store/uiStore';
import { Sample, SampleStatus, QualityLevel, SampleVersion, ManualCorrection, BarcodeConflict, ConflictResolution } from '@/types';
import StatusBadge from '@/components/common/StatusBadge';
import ConflictResolutionModal from '@/components/common/ConflictResolutionModal';
import { cn } from '@/lib/utils';

const qualityLevelColors: Record<QualityLevel, string> = {
  [QualityLevel.A]: 'bg-green-100 text-green-700 border-green-300',
  [QualityLevel.B]: 'bg-blue-100 text-blue-700 border-blue-300',
  [QualityLevel.C]: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  [QualityLevel.D]: 'bg-red-100 text-red-700 border-red-300',
};

interface ExpandedRowProps { sample: Sample; versions: SampleVersion[]; corrections: ManualCorrection[]; }

function ExpandedRow({ sample, versions, corrections }: ExpandedRowProps) {
  return (
    <div className="bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><Clock className="h-4 w-4" />版本历史</h4>
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">v{v.version} - {v.changeReason}</span>
                  <span className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">操作人：{v.operator}</p>
              </div>
            ))}
            {versions.length === 0 && <p className="text-sm text-gray-500">暂无版本记录</p>}
          </div>
        </div>
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><Edit3 className="h-4 w-4" />修正记录</h4>
          <div className="space-y-2">
            {corrections.map((c) => (
              <div key={c.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{c.fieldName}: {c.oldValue} → {c.newValue}</span>
                  <span className="text-xs text-gray-500">{new Date(c.correctedAt).toLocaleString('zh-CN')}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{c.reason} · {c.corrector}{c.isRollback && <span className="ml-2 text-yellow-600">(回滚)</span>}</p>
              </div>
            ))}
            {corrections.length === 0 && <p className="text-sm text-gray-500">暂无修正记录</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SampleList() {
  const { samples, barcodeConflicts, getVersionsForSample, getCorrectionsForSample, importSamples, resolveConflict, currentUser } = useSampleStore();
  const { showNotification, openConflictModal, showBarcodeConflictModal, closeConflictModal, conflictModalData } = useUIStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SampleStatus | 'all'>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const filteredSamples = useMemo(() => samples.filter((sample) => {
    const matchesSearch = sample.name.toLowerCase().includes(searchQuery.toLowerCase()) || sample.barcode.toLowerCase().includes(searchQuery.toLowerCase()) || sample.material.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sample.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [samples, searchQuery, statusFilter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = importSamples([{ barcode: 'BC999', name: '测试导入样本-01', material: '拟南芥叶片', collector: '测试用户', collectionTime: new Date(), status: SampleStatus.AVAILABLE, qualityLevel: QualityLevel.B, createdBy: currentUser, updatedBy: currentUser }]);
    if (result.conflicts.length > 0) openConflictModal(result.conflicts[0]);
    else showNotification('success', `成功导入 ${result.imported.length} 个样本`);
    setShowImportModal(false);
  };

  const toggleRow = (sampleId: string) => setExpandedRow(expandedRow === sampleId ? null : sampleId);

  const handleResolveConflict = (resolution: ConflictResolution) => {
    if (conflictModalData) {
      resolveConflict(conflictModalData as BarcodeConflict, resolution);
      closeConflictModal();
      showNotification('success', '冲突已解决');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">样本管理</h1><p className="mt-1 text-sm text-gray-500">管理所有实验样本及其版本历史</p></div>
        <button onClick={() => setShowImportModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          <Upload className="h-4 w-4" />批量导入 (CSV/Excel)
        </button>
      </div>

      {barcodeConflicts.length > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-yellow-900">条码冲突警告</h3>
              <p className="mt-1 text-sm text-yellow-700">检测到 {barcodeConflicts.length} 个条码冲突，需要立即处理</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {barcodeConflicts.map((conflict) => (
                  <button key={conflict.barcode} onClick={() => openConflictModal(conflict)} className="rounded-md bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800 hover:bg-yellow-200 transition-colors">
                    {conflict.barcode} ({conflict.samples.length}个重复)
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="搜索条码、名称、材料..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-gray-200 pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SampleStatus | 'all')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="all">全部状态</option>
            <option value={SampleStatus.AVAILABLE}>可用</option>
            <option value={SampleStatus.REVIEWING}>审核中</option>
            <option value={SampleStatus.INVALID}>无效</option>
          </select>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-10"></th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">条码</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">材料</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">采集人</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">采集时间</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">质量等级</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSamples.map((sample) => {
                const isExpanded = expandedRow === sample.id;
                const versions = getVersionsForSample(sample.id);
                const corrections = getCorrectionsForSample(sample.id);
                return (
                  <React.Fragment key={sample.id}>
                    <tr onClick={() => toggleRow(sample.id)} className={cn('cursor-pointer transition-colors', isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50')}>
                      <td className="py-3 px-4">{isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}</td>
                      <td className="py-3 px-4"><code className="text-sm font-mono text-gray-900">{sample.barcode}</code></td>
                      <td className="py-3 px-4 text-sm text-gray-900">{sample.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{sample.material}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{sample.collector}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{new Date(sample.collectionTime).toLocaleDateString('zh-CN')}</td>
                      <td className="py-3 px-4"><StatusBadge status={sample.status} /></td>
                      <td className="py-3 px-4"><span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', qualityLevelColors[sample.qualityLevel])}>{sample.qualityLevel}级</span></td>
                    </tr>
                    {isExpanded && <tr><td colSpan={8}><ExpandedRow sample={sample} versions={versions} corrections={corrections} /></td></tr>}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredSamples.length === 0 && (
          <div className="py-12 text-center"><FileText className="mx-auto h-12 w-12 text-gray-300" /><p className="mt-4 text-sm text-gray-500">没有找到匹配的样本</p></div>
        )}
      </div>

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-xl bg-white p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">批量导入样本</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">拖拽文件到此处，或点击选择</p>
              <p className="text-xs text-gray-400 mb-4">支持 CSV 和 Excel 格式</p>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowImportModal(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">取消</button>
            </div>
          </div>
        </div>
      )}

      {showBarcodeConflictModal && conflictModalData && (
        <ConflictResolutionModal
          conflict={conflictModalData as BarcodeConflict}
          onResolve={handleResolveConflict}
          onClose={closeConflictModal}
        />
      )}
    </div>
  );
}
