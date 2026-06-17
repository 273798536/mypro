import { useState } from 'react';
import { X, Plus, Trash2, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import type { EvidenceSource } from '../../shared/types.js';
import { SOURCE_LABELS } from '../../shared/types.js';
import { useTicketStore } from '@/store/useTicketStore.js';
import { cn } from '@/lib/utils.js';

interface EvidenceInput {
  id: string;
  content: string;
  source: EvidenceSource;
  isSampleLeak: boolean;
  importBatch: string;
}

interface ImportModalProps {
  ticketId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'import' | 'supplement';
}

export default function ImportModal({ ticketId, isOpen, onClose, onSuccess, mode = 'import' }: ImportModalProps) {
  const { createVersion, loading } = useTicketStore();
  const initialBatch = `BATCH-${Date.now()}`;
  const [evidences, setEvidences] = useState<EvidenceInput[]>([
    { id: '1', content: '', source: mode === 'supplement' ? 'supplement' : 'import', isSampleLeak: false, importBatch: initialBatch }
  ]);
  const [changeNote, setChangeNote] = useState('');
  const [allSampleLeak, setAllSampleLeak] = useState(false);
  const [batchNo, setBatchNo] = useState(initialBatch);

  if (!isOpen) return null;

  const addEvidence = () => {
    setEvidences([
      ...evidences,
      { id: String(Date.now()), content: '', source: mode === 'supplement' ? 'supplement' : 'import', isSampleLeak: allSampleLeak, importBatch: batchNo }
    ]);
  };

  const removeEvidence = (id: string) => {
    if (evidences.length > 1) {
      setEvidences(evidences.filter(e => e.id !== id));
    }
  };

  const updateEvidence = (id: string, field: keyof EvidenceInput, value: string | boolean) => {
    setEvidences(evidences.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const handleAllSampleLeakChange = (checked: boolean) => {
    setAllSampleLeak(checked);
    setEvidences(evidences.map(e => ({ ...e, isSampleLeak: checked })));
  };

  const handleBatchNoChange = (value: string) => {
    setBatchNo(value);
    setEvidences(evidences.map(e => ({ ...e, importBatch: value })));
  };

  const handleSubmit = async () => {
    const validEvidences = evidences.filter(e => e.content.trim());
    if (validEvidences.length === 0) {
      return;
    }

    const success = await createVersion(ticketId, {
      evidences: validEvidences.map(e => ({
        content: e.content,
        source: e.source,
        isSampleLeak: e.isSampleLeak,
        importBatch: e.importBatch
      })),
      changeNote
    });

    if (success) {
      onSuccess();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              {mode === 'supplement' ? '补充证据材料' : '导入材料'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {mode === 'supplement' ? '添加补充证据创建新版本' : '导入新材料创建新版本'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">批次号</label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => handleBatchNoChange(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSampleLeak}
                    onChange={(e) => handleAllSampleLeakChange(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-slate-700 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    全部标记为样本泄漏
                  </span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">证据列表</label>
                <button
                  onClick={addEvidence}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  添加证据
                </button>
              </div>
              <div className="space-y-3">
                {evidences.map((evidence, index) => (
                  <div key={evidence.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-slate-500 font-mono">#{index + 1}</span>
                          <select
                            value={evidence.source}
                            onChange={(e) => updateEvidence(evidence.id, 'source', e.target.value as EvidenceSource)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={evidence.isSampleLeak}
                              onChange={(e) => updateEvidence(evidence.id, 'isSampleLeak', e.target.checked)}
                              className="w-3 h-3 rounded border-slate-300 text-red-600 focus:ring-red-500"
                            />
                            样本泄漏
                          </label>
                        </div>
                        <textarea
                          value={evidence.content}
                          onChange={(e) => updateEvidence(evidence.id, 'content', e.target.value)}
                          placeholder="请输入证据内容..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={2}
                        />
                      </div>
                      <button
                        onClick={() => removeEvidence(evidence.id)}
                        className={cn(
                          'p-1.5 rounded transition-colors',
                          evidences.length > 1
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            : 'text-slate-300 cursor-not-allowed'
                        )}
                        disabled={evidences.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">变更说明 *</label>
              <textarea
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="请输入本次变更的说明..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0">
          <div className="text-sm text-slate-500">
            共 {evidences.filter(e => e.content.trim()).length} 条有效证据
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !changeNote.trim() || evidences.filter(e => e.content.trim()).length === 0}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors',
                loading || !changeNote.trim() || evidences.filter(e => e.content.trim()).length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  提交创建新版本
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
