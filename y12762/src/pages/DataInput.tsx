import { useState, useMemo, useEffect } from 'react';
import { useBatchStore } from '@/store/useBatchStore';
import { useAnomalyStore } from '@/store/useAnomalyStore';
import AnomalyBadge from '@/components/AnomalyBadge';
import { checkPhValue } from '@/utils/calculator/phCheck';
import type { ConcentrationUnit, Reagent } from '@/types';
import { formatDateTime } from '@/utils/export/fileNaming';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Upload,
  FileText,
  ChevronDown,
  FlaskConical,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const unitOptions: { value: ConcentrationUnit; label: string }[] = [
  { value: 'mol/L', label: '摩尔浓度 (mol/L)' },
  { value: 'g/L', label: '质量浓度 (g/L)' },
  { value: 'mass_fraction', label: '质量分数 (%)' },
];

interface ReagentForm {
  name: string;
  formula: string;
  concentration: string;
  concentrationUnit: ConcentrationUnit;
  molarMass: string;
  temperature: string;
  phValue: string;
  weighingRecordId: string;
}

const emptyForm: ReagentForm = {
  name: '',
  formula: '',
  concentration: '',
  concentrationUnit: 'mol/L',
  molarMass: '',
  temperature: '25',
  phValue: '',
  weighingRecordId: '',
};

export default function DataInput() {
  const {
    batches,
    currentBatchId,
    currentBatch,
    setCurrentBatch,
    addReagent,
    updateReagent,
    removeReagent,
    addSafetyNote,
    importSafetyNotes,
  } = useBatchStore();
  const { checkReagentPh } = useAnomalyStore();

  const [form, setForm] = useState<ReagentForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);

  const phAnomaly = useMemo(() => {
    if (!form.phValue) return null;
    const ph = parseFloat(form.phValue);
    if (isNaN(ph)) return null;
    const tempReagent: Reagent = {
      id: 'temp',
      name: form.name || '临时试剂',
      concentration: parseFloat(form.concentration) || 0,
      concentrationUnit: form.concentrationUnit,
      temperature: parseFloat(form.temperature) || 25,
      phValue: ph,
    };
    return checkReagentPh(tempReagent);
  }, [form.phValue, form.name, form.concentration, form.concentrationUnit, form.temperature, checkReagentPh]);

  const phCheckResult = useMemo(() => {
    if (!form.phValue) return null;
    const ph = parseFloat(form.phValue);
    if (isNaN(ph)) return null;
    return checkPhValue(ph);
  }, [form.phValue]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleFormChange = (field: keyof ReagentForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = () => {
    if (!currentBatchId) {
      setMessage({ type: 'error', text: '请先选择批次' });
      return;
    }
    if (!form.name.trim()) {
      setMessage({ type: 'error', text: '请输入试剂名称' });
      return;
    }
    if (!form.concentration || isNaN(parseFloat(form.concentration))) {
      setMessage({ type: 'error', text: '请输入有效的浓度值' });
      return;
    }
    if (!form.phValue || isNaN(parseFloat(form.phValue))) {
      setMessage({ type: 'error', text: '请输入有效的pH值' });
      return;
    }

    const reagentData = {
      name: form.name.trim(),
      formula: form.formula.trim() || undefined,
      concentration: parseFloat(form.concentration),
      concentrationUnit: form.concentrationUnit,
      molarMass: form.molarMass ? parseFloat(form.molarMass) : undefined,
      temperature: parseFloat(form.temperature) || 25,
      phValue: parseFloat(form.phValue),
      weighingRecordId: form.weighingRecordId.trim() || undefined,
    };

    if (editingId) {
      updateReagent(currentBatchId, editingId, reagentData);
      setMessage({ type: 'success', text: '试剂已更新' });
    } else {
      addReagent(currentBatchId, reagentData);
      setMessage({ type: 'success', text: '试剂已添加' });
    }
    resetForm();
  };

  const handleEdit = (reagent: Reagent) => {
    setEditingId(reagent.id);
    setForm({
      name: reagent.name,
      formula: reagent.formula || '',
      concentration: reagent.concentration.toString(),
      concentrationUnit: reagent.concentrationUnit,
      molarMass: reagent.molarMass?.toString() || '',
      temperature: reagent.temperature.toString(),
      phValue: reagent.phValue.toString(),
      weighingRecordId: reagent.weighingRecordId || '',
    });
  };

  const handleDelete = (reagentId: string) => {
    if (!currentBatchId) return;
    if (confirm('确定删除该试剂？')) {
      removeReagent(currentBatchId, reagentId);
      setMessage({ type: 'success', text: '试剂已删除' });
      if (editingId === reagentId) {
        resetForm();
      }
    }
  };

  const handleAddNote = () => {
    if (!currentBatchId) {
      setMessage({ type: 'error', text: '请先选择批次' });
      return;
    }
    if (!noteContent.trim()) {
      setMessage({ type: 'error', text: '请输入备注内容' });
      return;
    }
    if (!noteAuthor.trim()) {
      setMessage({ type: 'error', text: '请输入记录人' });
      return;
    }
    const result = addSafetyNote(currentBatchId, {
      content: noteContent.trim(),
      author: noteAuthor.trim(),
    });
    setMessage({ type: result.success ? 'success' : 'info', text: result.message });
    if (result.success) {
      setNoteContent('');
      setNoteAuthor('');
    }
  };

  const handleImportNotes = () => {
    if (!currentBatchId) {
      setMessage({ type: 'error', text: '请先选择批次' });
      return;
    }
    const lines = importText.split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      setMessage({ type: 'error', text: '请输入要导入的备注' });
      return;
    }
    const notes = lines.map((line) => {
      const parts = line.split('|');
      return {
        content: parts[0]?.trim() || line.trim(),
        author: parts[1]?.trim() || '导入用户',
      };
    });
    const result = importSafetyNotes(currentBatchId, notes);
    setMessage({
      type: result.imported > 0 ? 'success' : 'info',
      text: `导入完成：成功${result.imported}条，跳过${result.skipped}条`,
    });
    if (result.imported > 0) {
      setImportText('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">数据录入</h1>
          <p className="text-gray-500 mt-1">管理批次、录入试剂数据和安全备注</p>
        </div>
        {message && (
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              message.type === 'success' && 'bg-green-50 text-green-700 border border-green-200',
              message.type === 'error' && 'bg-red-50 text-red-700 border border-red-200',
              message.type === 'info' && 'bg-blue-50 text-blue-700 border border-blue-200'
            )}
          >
            {message.type === 'success' && <CheckCircle size={16} />}
            {message.type === 'error' && <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择批次</label>
        <div className="relative">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 border border-gray-200 rounded-lg hover:border-gray-300 bg-white"
            onClick={() => setBatchDropdownOpen(!batchDropdownOpen)}
          >
            <span className="text-gray-800">
              {currentBatch ? currentBatch.name : '请选择批次'}
            </span>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
          {batchDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  className={cn(
                    'w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors',
                    currentBatchId === batch.id && 'bg-teal-50 text-[#0d9488]'
                  )}
                  onClick={() => {
                    setCurrentBatch(batch.id);
                    setBatchDropdownOpen(false);
                  }}
                >
                  <div className="font-medium">{batch.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    操作人：{batch.operator} | 试剂数：{batch.reagents.length}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <FlaskConical size={18} className="text-[#1e3a5f]" />
              {editingId ? '编辑试剂' : '录入试剂'}
            </h2>
            {editingId && (
              <button
                className="text-gray-400 hover:text-gray-600"
                onClick={resetForm}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  试剂名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="例如：氯化钠"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">化学式</label>
                <input
                  type="text"
                  value={form.formula}
                  onChange={(e) => handleFormChange('formula', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="例如：NaCl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  浓度值 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.concentration}
                  onChange={(e) => handleFormChange('concentration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="例如：0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">浓度单位</label>
                <select
                  value={form.concentrationUnit}
                  onChange={(e) => handleFormChange('concentrationUnit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none bg-white"
                >
                  {unitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">摩尔质量 (g/mol)</label>
                <input
                  type="number"
                  step="any"
                  value={form.molarMass}
                  onChange={(e) => handleFormChange('molarMass', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="例如：58.44"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">温度 (°C)</label>
                <input
                  type="number"
                  step="any"
                  value={form.temperature}
                  onChange={(e) => handleFormChange('temperature', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="25"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  pH值 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.phValue}
                  onChange={(e) => handleFormChange('phValue', e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-transparent outline-none',
                    phCheckResult && !phCheckResult.isNormal
                      ? 'border-red-300 focus:ring-red-200'
                      : phCheckResult && !phCheckResult.isInCommonRange
                        ? 'border-amber-300 focus:ring-amber-200'
                        : 'border-gray-200 focus:ring-[#0d9488]'
                  )}
                  placeholder="0-14"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">称量单号</label>
              <input
                type="text"
                value={form.weighingRecordId}
                onChange={(e) => handleFormChange('weighingRecordId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                placeholder="例如：WL-2026-0601-001"
              />
            </div>

            {phAnomaly && <AnomalyBadge anomaly={phAnomaly} showDetail />}

            <div className="flex gap-3 pt-2">
              <button
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0d9488] text-white rounded-lg hover:bg-[#0f766e] transition-colors font-medium"
                onClick={handleSubmit}
              >
                {editingId ? <Save size={18} /> : <Plus size={18} />}
                {editingId ? '保存修改' : '添加试剂'}
              </button>
              {editingId && (
                <button
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  onClick={resetForm}
                >
                  取消
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">已录入试剂</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              当前批次共 {currentBatch?.reagents.length || 0} 个试剂
            </p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {!currentBatch || currentBatch.reagents.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <FlaskConical size={40} className="mx-auto mb-3 text-gray-300" />
                <p>暂无试剂数据</p>
              </div>
            ) : (
              currentBatch.reagents.map((reagent) => (
                <div key={reagent.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {reagent.name}
                        {reagent.formula && (
                          <span className="text-gray-500 ml-2">({reagent.formula})</span>
                        )}
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-500">
                        <span>
                          浓度：{reagent.concentration} {reagent.concentrationUnit}
                        </span>
                        <span>温度：{reagent.temperature}°C</span>
                        <span>pH值：{reagent.phValue}</span>
                        {reagent.molarMass && <span>摩尔质量：{reagent.molarMass}</span>}
                        {reagent.weighingRecordId && (
                          <span className="col-span-2">称量单：{reagent.weighingRecordId}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <button
                        className="p-2 text-gray-400 hover:text-[#0d9488] hover:bg-teal-50 rounded-lg transition-colors"
                        onClick={() => handleEdit(reagent)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => handleDelete(reagent.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText size={18} className="text-[#1e3a5f]" />
          <h2 className="font-semibold text-gray-800">安全备注</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <Plus size={16} className="text-[#0d9488]" />
                添加备注
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">备注内容</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none resize-none"
                  placeholder="请输入安全备注内容..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">记录人</label>
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={(e) => setNoteAuthor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none"
                  placeholder="请输入记录人姓名"
                />
              </div>
              <button
                className="w-full px-4 py-2.5 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2d4f7a] transition-colors font-medium flex items-center justify-center gap-2"
                onClick={handleAddNote}
              >
                <Plus size={16} />
                添加备注
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 flex items-center gap-2">
                <Upload size={16} className="text-[#0d9488]" />
                批量导入
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  导入内容（每行一条，格式：内容|记录人）
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0d9488] focus:border-transparent outline-none resize-none font-mono text-sm"
                  placeholder="本批次实验在标准大气压下进行&#10;试剂已提前烘干处理|张三"
                />
              </div>
              <button
                className="w-full px-4 py-2.5 border border-[#1e3a5f] text-[#1e3a5f] rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
                onClick={handleImportNotes}
              >
                <Upload size={16} />
                导入备注（自动去重）
              </button>
            </div>
          </div>

          {currentBatch && currentBatch.safetyNotes.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="font-medium text-gray-700 mb-3">
                已有备注（{currentBatch.safetyNotes.length}条）
              </h3>
              <div className="space-y-2">
                {currentBatch.safetyNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <p className="text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-1.5">
                      记录人：{note.author} | 时间：{formatDateTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
