import { useState } from 'react';
import { useAuditStore } from '@/store/useAuditStore';
import Modal from '@/components/common/Modal';
import { RefreshCw, Plus, CheckCircle } from 'lucide-react';

interface ActionPanelProps {
  batchId: string;
  sampleId?: string;
}

export default function ActionPanel({ batchId, sampleId }: ActionPanelProps) {
  const {
    selectedSampleIds,
    reRunSample,
    reRunSelected,
    addSupplementarySample,
    manuallyConfirm,
    getSampleById,
  } = useAuditStore();

  const [supplementModalOpen, setSupplementModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [supplementForm, setSupplementForm] = useState({
    name: '',
    sourceMaterial: '',
    species: 'Homo sapiens',
  });
  const [confirmNote, setConfirmNote] = useState('');
  const [confirmType, setConfirmType] = useState<'confirm' | 'reject'>('confirm');

  const handleReRun = () => {
    if (sampleId) {
      reRunSample(sampleId);
    } else if (selectedSampleIds.length > 0) {
      reRunSelected();
    }
  };

  const handleSupplementSubmit = () => {
    if (!supplementForm.name || !supplementForm.sourceMaterial) return;

    const metrics = {
      proteinConcentration: 1.2 + Math.random() * 2.5,
      purity: 70 + Math.random() * 28,
      integrity: 60 + Math.random() * 35,
      backgroundNoise: 10 + Math.random() * 35,
      particleCount: Math.round(800 + Math.random() * 2000),
    };

    const isContaminated = Math.random() > 0.6;

    addSupplementarySample({
      batchId,
      name: supplementForm.name,
      sourceMaterial: supplementForm.sourceMaterial,
      collectedAt: new Date().toISOString(),
      micrographUrl: `https://placehold.co/400x300/0d4f4f/e2e8f0?text=${encodeURIComponent(supplementForm.name)}`,
      species: supplementForm.species,
      speciesCanonical: supplementForm.species,
      hasSpeciesSynonymIssue: false,
      qualityMetrics: metrics,
      contamination: {
        detected: isContaminated,
        type: isContaminated ? 'unknown' : 'unknown',
        confidence: isContaminated ? 0.5 + Math.random() * 0.4 : 0.1 + Math.random() * 0.3,
        suspectedSource: isContaminated ? '补录样本待进一步检测' : '',
      },
      status: isContaminated ? 'warning' : 'normal',
      manualNote: undefined,
    });

    setSupplementModalOpen(false);
    setSupplementForm({ name: '', sourceMaterial: '', species: 'Homo sapiens' });
  };

  const handleManualConfirm = () => {
    if (!sampleId) return;
    manuallyConfirm(sampleId, confirmNote, confirmType === 'confirm');
    setConfirmModalOpen(false);
    setConfirmNote('');
  };

  const targetSample = sampleId ? getSampleById(sampleId) : null;
  const canReRun = sampleId ? true : selectedSampleIds.length > 0;
  const canConfirm = !!sampleId && targetSample?.status !== 'normal' && targetSample?.status !== 'manually_confirmed';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <h4 className="text-sm font-medium text-slate-300 mb-3">操作面板</h4>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleReRun}
          disabled={!canReRun}
          className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          重复运行
          {selectedSampleIds.length > 0 && !sampleId && (
            <span className="bg-teal-900 px-1.5 py-0.5 rounded text-xs">
              {selectedSampleIds.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setSupplementModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          补录样本
        </button>

        <button
          onClick={() => {
            setConfirmType('confirm');
            setConfirmModalOpen(true);
          }}
          disabled={!canConfirm}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm font-medium transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          人工确认
        </button>
      </div>

      <Modal
        isOpen={supplementModalOpen}
        onClose={() => setSupplementModalOpen(false)}
        title="补录样本"
        subtitle="添加补充样本到当前审计批次"
        footer={
          <>
            <button
              onClick={() => setSupplementModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSupplementSubmit}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded text-sm font-medium"
            >
              确认补录
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">样本名称</label>
            <input
              type="text"
              value={supplementForm.name}
              onChange={e => setSupplementForm(s => ({ ...s, name: e.target.value }))}
              placeholder="例如：HEK293-PPI-SUPP-01"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">来源材料</label>
            <input
              type="text"
              value={supplementForm.sourceMaterial}
              onChange={e => setSupplementForm(s => ({ ...s, sourceMaterial: e.target.value }))}
              placeholder="例如：材料编号：M-2026-075"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">物种</label>
            <select
              value={supplementForm.species}
              onChange={e => setSupplementForm(s => ({ ...s, species: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="Homo sapiens">Homo sapiens (人类)</option>
              <option value="Mus musculus">Mus musculus (小鼠)</option>
              <option value="Rattus norvegicus">Rattus norvegicus (大鼠)</option>
              <option value="Cricetulus griseus">Cricetulus griseus (中国仓鼠)</option>
            </select>
          </div>
          <p className="text-xs text-slate-500">
            注：补录样本的质控指标将随机生成，用于模拟真实补录场景。
          </p>
        </div>
      </Modal>

      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="人工确认"
        subtitle={targetSample ? `样本：${targetSample.name}` : ''}
        footer={
          <>
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm"
            >
              取消
            </button>
            <button
              onClick={handleManualConfirm}
              className={`px-4 py-2 text-white rounded text-sm font-medium ${
                confirmType === 'confirm' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {confirmType === 'confirm' ? '确认通过' : '确认污染'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmType('confirm')}
              className={`flex-1 py-3 rounded border text-sm font-medium transition-colors ${
                confirmType === 'confirm'
                  ? 'border-teal-500 bg-teal-900/30 text-teal-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              确认通过
              <p className="text-xs font-normal mt-1 opacity-70">判定为正常样本</p>
            </button>
            <button
              onClick={() => setConfirmType('reject')}
              className={`flex-1 py-3 rounded border text-sm font-medium transition-colors ${
                confirmType === 'reject'
                  ? 'border-red-500 bg-red-900/30 text-red-300'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
              }`}
            >
              确认污染
              <p className="text-xs font-normal mt-1 opacity-70">维持污染判定</p>
            </button>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">确认备注</label>
            <textarea
              value={confirmNote}
              onChange={e => setConfirmNote(e.target.value)}
              placeholder="请输入人工确认的理由和依据..."
              rows={4}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
