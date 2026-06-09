import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, FileText, Edit3, Clipboard } from 'lucide-react';
import ErrorAlert from '@/components/ErrorAlert';
import { useStore } from '@/store';
import { cleanRawRecord } from '@/utils/dataCleaner';
import { computeSourceHash } from '@/utils/hash';
import { findDuplicateBatch, mergeBatchPatch } from '@/utils/dedupEngine';
import { runImpurityCheck } from '@/utils/impurityCheck';
import type { ExperimentBatch, ImpurityRecord, ProcessError } from '@/types';

type TabType = 'manual' | 'paste' | 'file';

const SAMPLE_TEXT = `批次：20250601-A
样品名：阿莫西林胶囊
日期：2025-06-01
温度：25°C
pH：7.0
时间：30min
杂质A,0.12,0.5,药典2025
杂质B,0.03,0.1,药典2025`;

interface ImpurityRow {
  id: string;
  name: string;
  measuredValue: string;
  limitValue: string;
  standard: string;
}

export default function Records() {
  const navigate = useNavigate();
  const batches = useStore((s) => s.batches);
  const errors = useStore((s) => s.errors);
  const addError = useStore((s) => s.addError);
  const clearErrors = useStore((s) => s.clearErrors);
  const addBatch = useStore((s) => s.addBatch);
  const updateBatch = useStore((s) => s.updateBatch);
  const addCheckResult = useStore((s) => s.addCheckResult);
  const setCurrentBatch = useStore((s) => s.setCurrentBatch);

  const [activeTab, setActiveTab] = useState<TabType>('paste');
  const [pasteText, setPasteText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [dismissedErrors, setDismissedErrors] = useState<Set<number>>(new Set());

  const [batchId, setBatchId] = useState('');
  const [sampleName, setSampleName] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [ph, setPh] = useState('');
  const [time, setTime] = useState('');
  const [impurityRows, setImpurityRows] = useState<ImpurityRow[]>([
    { id: 'row_0', name: '', measuredValue: '', limitValue: '', standard: '' },
  ]);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    setPasteText(SAMPLE_TEXT);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleDismissError = (index: number) => {
    setDismissedErrors((prev) => new Set(prev).add(index));
  };

  const handleClearAllErrors = () => {
    clearErrors();
    setDismissedErrors(new Set());
  };

  const addImpurityRow = () => {
    setImpurityRows((prev) => [
      ...prev,
      { id: `row_${Date.now()}`, name: '', measuredValue: '', limitValue: '', standard: '' },
    ]);
  };

  const removeImpurityRow = (id: string) => {
    setImpurityRows((prev) => prev.filter((row) => row.id !== id));
  };

  const updateImpurityRow = (id: string, field: keyof ImpurityRow, value: string) => {
    setImpurityRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const loadSampleData = () => {
    setPasteText(SAMPLE_TEXT);
    setActiveTab('paste');
    showToast('示例数据已载入');
  };

  const processText = (text: string) => {
    const { batches: partialBatches, errors: cleanErrors } = cleanRawRecord(text);
    cleanErrors.forEach((err) => addError(err));
    return partialBatches;
  };

  const collectManualFormData = (): { batches: Partial<ExperimentBatch>[]; errors: ProcessError[] } => {
    const errors: ProcessError[] = [];
    const impurities: ImpurityRecord[] = [];

    impurityRows.forEach((row, idx) => {
      if (!row.name && !row.measuredValue && !row.limitValue) return;
      const measured = parseFloat(row.measuredValue);
      const limit = parseFloat(row.limitValue);
      if (!row.name) {
        errors.push({
          code: 'MISSING_FIELD',
          userMessage: `第${idx + 1}行缺少杂质名称`,
          suggestion: '请补充杂质名称',
          missingFields: ['name'],
        });
        return;
      }
      if (isNaN(measured)) {
        errors.push({
          code: 'MISSING_FIELD',
          userMessage: `第${idx + 1}行缺少实测值`,
          suggestion: '请补充数值格式的实测值',
          missingFields: ['measuredValue'],
        });
        return;
      }
      if (isNaN(limit)) {
        errors.push({
          code: 'MISSING_FIELD',
          userMessage: `第${idx + 1}行缺少限度值`,
          suggestion: '请补充数值格式的限度值',
          missingFields: ['limitValue'],
        });
        return;
      }
      impurities.push({
        id: `imp_${Date.now()}_${idx}`,
        name: row.name,
        measuredValue: measured,
        limitValue: limit,
        standard: row.standard || '',
      });
    });

    if (!batchId) {
      errors.push({
        code: 'MISSING_FIELD',
        userMessage: '缺少批次号',
        suggestion: '请补充批次号',
        missingFields: ['batchId'],
      });
    }
    if (impurities.length === 0) {
      errors.push({
        code: 'NO_IMPURITIES',
        userMessage: '缺少杂质检测数据',
        suggestion: '请补充至少一条杂质数据',
        missingFields: ['impurities'],
      });
    }

    const batch: Partial<ExperimentBatch> = {
      batchId: batchId || undefined,
      sampleName: sampleName || undefined,
      recordDate: recordDate || undefined,
      reactionConditions: {
        temperature: temperature ? parseFloat(temperature) : undefined,
        ph: ph ? parseFloat(ph) : undefined,
        time: time ? parseFloat(time) : undefined,
      },
      impurities,
    };

    return { batches: [batch], errors };
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    await handleFiles(files);
  };

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;
    const file = files[0];
    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'txt' && ext !== 'csv') {
      addError({
        code: 'INVALID_FILE',
        userMessage: '不支持的文件格式',
        suggestion: '请上传 .txt 或 .csv 格式的文件',
      });
      return;
    }
    try {
      const text = await readFileAsText(file);
      setPasteText(text);
      setActiveTab('paste');
      showToast('文件读取成功');
    } catch {
      addError({
        code: 'FILE_READ_ERROR',
        userMessage: '文件读取失败',
        suggestion: '请检查文件是否损坏，或尝试粘贴文本方式导入',
      });
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const handleStartCheck = async () => {
    setDismissedErrors(new Set());
    clearErrors();

    let partialBatches: Partial<ExperimentBatch>[] = [];

    if (activeTab === 'paste' || activeTab === 'file') {
      if (!pasteText.trim()) {
        addError({
          code: 'EMPTY_INPUT',
          userMessage: '未检测到输入内容',
          suggestion: '请粘贴实验记录文本或上传文件',
        });
        return;
      }
      partialBatches = processText(pasteText);
    } else {
      const { batches, errors: formErrors } = collectManualFormData();
      formErrors.forEach((err) => addError(err));
      if (formErrors.length > 0) return;
      partialBatches = batches;
    }

    if (errors.length > 0 || partialBatches.length === 0) {
      return;
    }

    const finalBatches: ExperimentBatch[] = [];

    for (const partial of partialBatches) {
      const hashData = {
        batchId: partial.batchId,
        sampleName: partial.sampleName,
        recordDate: partial.recordDate,
        reactionConditions: partial.reactionConditions,
        impurities: (partial.impurities || []).map((i) => ({
          name: i.name,
          measuredValue: i.measuredValue,
          limitValue: i.limitValue,
          standard: i.standard,
        })),
      };
      const sourceHash = await computeSourceHash(hashData);
      partial.sourceHash = sourceHash;

      const dup = findDuplicateBatch(partial, batches);

      if (dup.exists && dup.isExact) {
        showToast(`批次 ${partial.batchId} 数据已存在，使用已有结论`);
        if (dup.batch) {
          finalBatches.push(dup.batch);
        }
        continue;
      }

      if (dup.exists && dup.isSameBatchId && !dup.isExact && dup.batch) {
        showToast(`检测到批次 ${partial.batchId} 补录数据，系统将合并后重新计算`);
        const merged = await mergeBatchPatch(dup.batch, partial);
        updateBatch(dup.batch.batchId, merged);
        finalBatches.push(merged);
        continue;
      }

      const fullBatch: ExperimentBatch = {
        batchId: partial.batchId!,
        sampleName: partial.sampleName || '',
        recordDate: partial.recordDate || '',
        reactionConditions: partial.reactionConditions || {},
        impurities: partial.impurities || [],
        sourceHash,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      addBatch(fullBatch);
      finalBatches.push(fullBatch);
    }

    if (finalBatches.length === 0) {
      return;
    }

    for (const batch of finalBatches) {
      const result = runImpurityCheck(batch);
      addCheckResult(result);
    }

    setCurrentBatch(finalBatches[0].batchId);
    navigate('/results');
  };

  const visibleErrors = errors.filter((_, i) => !dismissedErrors.has(i));

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'manual', label: '手动输入', icon: <Edit3 className="w-4 h-4" /> },
    { key: 'paste', label: '粘贴文本', icon: <Clipboard className="w-4 h-4" /> },
    { key: 'file', label: '文件上传', icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-ink mb-4">实验记录处理</h1>

      {toast && (
        <div className="mb-4 bg-primary/10 text-primary border border-primary/30 rounded-lg px-4 py-2 fade-in">
          {toast}
        </div>
      )}

      {visibleErrors.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-fail">共 {visibleErrors.length} 条错误</span>
            <button
              onClick={handleClearAllErrors}
              className="text-sm text-ink-muted hover:text-fail transition-colors"
            >
              全部清除
            </button>
          </div>
          {errors.map((error, index) =>
            dismissedErrors.has(index) ? null : (
              <ErrorAlert
                key={index}
                error={error}
                onDismiss={() => handleDismissError(index)}
              />
            )
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-ink-light p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'font-bold underline underline-offset-4 text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={loadSampleData}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary-600 transition-colors"
          >
            <FileText className="w-4 h-4" />
            载入示例
          </button>
        </div>

        {activeTab === 'manual' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">批次号 *</label>
                <input
                  type="text"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  placeholder="如 20250601-A"
                  className="w-full px-3 py-2 border border-ink-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">样品名称</label>
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="如 阿莫西林胶囊"
                  className="w-full px-3 py-2 border border-ink-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">记录日期</label>
                <input
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                  className="w-full px-3 py-2 border border-ink-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">温度 (°C)</label>
                <input
                  type="text"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                  placeholder="如 25"
                  className="w-full px-3 py-2 border border-ink-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">pH</label>
                <input
                  type="text"
                  value={ph}
                  onChange={(e) => setPh(e.target.value)}
                  placeholder="如 7.0"
                  className="w-full px-3 py-2 border border-ink-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink mb-1.5">时间 (min)</label>
                <input
                  type="text"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="如 30"
                  className="w-full px-3 py-2 border border-ink-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-ink">杂质列表 *</label>
                <button
                  onClick={addImpurityRow}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  添加一行
                </button>
              </div>
              <div className="border border-ink-light rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-ink-light/30">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-ink-muted">杂质名称</th>
                      <th className="text-left px-3 py-2 font-medium text-ink-muted">实测值 (%)</th>
                      <th className="text-left px-3 py-2 font-medium text-ink-muted">限度值 (%)</th>
                      <th className="text-left px-3 py-2 font-medium text-ink-muted">标准依据</th>
                      <th className="w-10 px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {impurityRows.map((row) => (
                      <tr key={row.id} className="border-t border-ink-light">
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => updateImpurityRow(row.id, 'name', e.target.value)}
                            placeholder="杂质A"
                            className="w-full px-2 py-1 border border-transparent hover:border-ink-light focus:outline-none focus:border-primary rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.measuredValue}
                            onChange={(e) => updateImpurityRow(row.id, 'measuredValue', e.target.value)}
                            placeholder="0.12"
                            className="w-full px-2 py-1 border border-transparent hover:border-ink-light focus:outline-none focus:border-primary rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.limitValue}
                            onChange={(e) => updateImpurityRow(row.id, 'limitValue', e.target.value)}
                            placeholder="0.5"
                            className="w-full px-2 py-1 border border-transparent hover:border-ink-light focus:outline-none focus:border-primary rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={row.standard}
                            onChange={(e) => updateImpurityRow(row.id, 'standard', e.target.value)}
                            placeholder="药典2025"
                            className="w-full px-2 py-1 border border-transparent hover:border-ink-light focus:outline-none focus:border-primary rounded"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeImpurityRow(row.id)}
                            className="p-1 text-ink-muted hover:text-fail transition-colors rounded hover:bg-fail/10"
                            disabled={impurityRows.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'paste' && (
          <div>
            <label className="block text-sm font-medium text-ink mb-2">粘贴实验记录文本</label>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              rows={12}
              placeholder={`批次：20250601-A
样品名：阿莫西林胶囊
日期：2025-06-01
温度：25°C
pH：7.0
时间：30min
杂质A,0.12,0.5,药典2025
杂质B,0.03,0.1,药典2025`}
              className="w-full px-4 py-3 border border-ink-light rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
            />
          </div>
        )}

        {activeTab === 'file' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-ink-light hover:border-primary/50 hover:bg-ink-light/20'
              }`}
            >
              <Upload className="w-10 h-10 text-ink-muted mx-auto mb-3" />
              <p className="text-sm font-medium text-ink mb-1">拖拽文件到此处，或点击选择</p>
              <p className="text-xs text-ink-muted">支持 .txt / .csv 格式</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleStartCheck}
          className="bg-primary text-white rounded-lg px-6 py-2.5 hover:bg-primary-600 transition font-medium"
        >
          开始检查
        </button>
      </div>
    </div>
  );
}
