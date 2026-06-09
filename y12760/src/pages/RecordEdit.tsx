import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Upload, AlertTriangle, Plus, Trash2, FlaskConical,
  BarChart3, RefreshCw, Calculator,
} from 'lucide-react';
import { useRecords } from '@/hooks/useRecord';
import { useRecordStore } from '@/store/useRecordStore';
import { SectionCard, StatusBadge } from '@/components/common/UIComponents';
import { PeakTable } from '@/components/record/PeakTable';
import { CalculationPanel } from '@/components/calculation/CalculationPanel';
import { validatePeaks, autoMarkStatus } from '@/utils/validation';
import { calculateBalance } from '@/utils/calculation';
import type { GCRecord, Peak, RecordStatus, ChromatogramParams } from '@/types';
import { cn } from '@/lib/utils';

function generateId() {
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}

export default function RecordEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';
  const { loaded } = useRecords();
  const getRecord = useRecordStore(s => s.getRecord);
  const addRecord = useRecordStore(s => s.addRecord);
  const updateRecord = useRecordStore(s => s.updateRecord);
  const addOperationLog = useRecordStore(s => s.addOperationLog);

  const existing = useMemo(() => (isNew ? null : id ? getRecord(id) : null), [isNew, id, getRecord, loaded]);

  const [batchNumber, setBatchNumber] = useState(existing?.batchNumber || '');
  const [sampleName, setSampleName] = useState(existing?.sampleName || '');
  const [injectionTime, setInjectionTime] = useState(existing?.injectionTime?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [instrumentModel, setInstrumentModel] = useState(existing?.instrumentModel || 'Agilent 7890B');
  const [operator, setOperator] = useState(existing?.operator || '');
  const [status, setStatus] = useState<RecordStatus>(existing?.status || 'needs_review');
  const [conclusion, setConclusion] = useState(existing?.conclusion || '');
  const [conclusionSource, setConclusionSource] = useState(existing?.conclusionSource || '');
  const [params, setParams] = useState<ChromatogramParams>(existing?.chromatogramParams || {});

  const [peaks, setPeaks] = useState<Peak[]>(existing?.peaks || []);
  const [validationInfo, setValidationInfo] = useState<{ nullCount: number; duplicateCount: number; outlierCount: number; details: string[] } | null>(null);

  const previewCalc = useMemo(() => {
    if (!peaks.length) return undefined;
    try {
      return calculateBalance(peaks);
    } catch (_) {
      return undefined;
    }
  }, [peaks]);

  const runValidation = () => {
    const { peaks: validatedPeaks, issues } = validatePeaks(peaks);
    setPeaks(validatedPeaks);
    setValidationInfo({
      nullCount: issues.nullCount,
      duplicateCount: issues.duplicateCount,
      outlierCount: issues.outlierCount,
      details: issues.details,
    });
    const suggested = autoMarkStatus(issues);
    if (suggested !== status) setStatus(suggested);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = String(ev.target?.result || '');
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const headerIdx = lines.findIndex(l => l.includes('保留时间') || l.includes('retention') || l.includes('Retention'));
        const startIdx = headerIdx >= 0 ? headerIdx + 1 : 0;
        const newPeaks: Peak[] = [];
        for (let i = startIdx; i < lines.length; i++) {
          const cells = lines[i].split(/[,\t]/).map(s => s.trim());
          if (cells.length < 2) continue;
          const parseNum = (v: string) => {
            if (!v || v === '—' || v === '-') return null;
            const n = Number(v.replace(/[^\d.-]/g, ''));
            return isNaN(n) ? null : n;
          };
          newPeaks.push({
            id: generateId(),
            recordId: '',
            peakIndex: newPeaks.length + 1,
            compoundName: cells[0] && isNaN(Number(cells[0])) ? cells[0] : `峰${newPeaks.length + 1}`,
            retentionTime: parseNum(cells[1] || ''),
            peakArea: parseNum(cells[2] || ''),
            peakHeight: parseNum(cells[3] || ''),
            theoreticalPlates: parseNum(cells[4] || ''),
            dataQuality: 'normal',
            isDuplicate: false,
            isNull: false,
          });
        }
        if (newPeaks.length) {
          setPeaks(newPeaks);
          const { peaks: vp, issues } = validatePeaks(newPeaks);
          setPeaks(vp);
          setValidationInfo({
            nullCount: issues.nullCount,
            duplicateCount: issues.duplicateCount,
            outlierCount: issues.outlierCount,
            details: issues.details,
          });
          setStatus(autoMarkStatus(issues));
        }
      } catch (err) {
        alert('文件解析失败，请检查文件格式（支持 CSV/TSV 文本）');
      }
    };
    reader.readAsText(file);
  };

  const addPeakRow = () => {
    setPeaks(prev => [...prev, {
      id: generateId(),
      recordId: '',
      peakIndex: prev.length + 1,
      retentionTime: null,
      peakArea: null,
      peakHeight: null,
      theoreticalPlates: null,
      dataQuality: 'normal',
      isDuplicate: false,
      isNull: false,
    }]);
  };

  const removePeak = (idx: number) => {
    setPeaks(prev => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, peakIndex: i + 1 })));
  };

  const save = () => {
    if (!batchNumber.trim() || !sampleName.trim()) {
      alert('请填写批号和样品名称');
      return;
    }
    const finalCalc = previewCalc;
    const recordData: Omit<GCRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      batchNumber: batchNumber.trim(),
      sampleName: sampleName.trim(),
      injectionTime: injectionTime.replace('T', ' ') + ':00',
      instrumentModel: instrumentModel.trim() || '—',
      operator: operator.trim() || '未指定',
      status,
      conclusion,
      conclusionSource,
      chromatogramParams: params,
      peaks,
      alignmentSteps: existing?.alignmentSteps || [
        { id: generateId(), recordId: '', stepOrder: 1, stepName: '导入原始数据', description: '通过文件导入或手动录入峰表数据', explanation: '原始数据是一切分析的起点，完整保留未经修改的原始峰表是质量管理的基础。', isCompleted: true },
        { id: generateId(), recordId: '', stepOrder: 2, stepName: '数据质量检测', description: validationInfo ? `检测到空值 ${validationInfo.nullCount} 处、重复 ${validationInfo.duplicateCount} 处、异常值 ${validationInfo.outlierCount} 处` : '系统自动检测空值、重复、备注混写和异常值', explanation: '数据质量检测是保护后续计算结果可靠的第一道关口。', isCompleted: !!validationInfo },
        { id: generateId(), recordId: '', stepOrder: 3, stepName: '保留时间对齐', description: '以标准样品保留时间为基准匹配组分', explanation: '保留时间是色谱定性的依据，±0.02 min 以内视为同一组分。', isCompleted: peaks.every(p => p.dataQuality !== 'outlier') },
        { id: generateId(), recordId: '', stepOrder: 4, stepName: '配平计算', description: finalCalc ? `主含量 ${finalCalc.finalResult.toFixed(2)}%，配平总和 ${finalCalc.totalPercentage.toFixed(2)}%` : '执行归一化法配平计算', explanation: '归一化法的前提是所有组分都出峰，总和越接近 100% 说明结果越可靠。', isCompleted: !!finalCalc },
        { id: generateId(), recordId: '', stepOrder: 5, stepName: '判读结论', description: conclusion || '填写判读结论并关联来源材料', explanation: '结论必须写清楚依据的标准条款和关联单据编号。', isCompleted: !!conclusion.trim() },
      ],
      calculationResult: finalCalc,
      operationLogs: existing?.operationLogs || [],
    };

    if (isNew) {
      const newRec = addRecord(recordData);
      addOperationLog(newRec.id, {
        recordId: newRec.id,
        operator: recordData.operator,
        actionType: 'create',
        reason: '新建记录',
      });
      navigate(`/records/${newRec.id}`);
    } else if (id) {
      updateRecord(id, recordData as Partial<GCRecord>);
      addOperationLog(id, {
        recordId: id,
        operator: recordData.operator,
        actionType: 'edit',
        reason: '保存编辑',
      });
      navigate(`/records/${id}`);
    }
  };

  return (
    <div className="space-y-5 opacity-0 animate-fade-in-up" style={{ animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Link to={existing ? `/records/${existing.id}` : '/'} className="btn-ghost !px-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl font-semibold text-lab-900 flex items-center gap-2">
              <FlaskConical className="w-7 h-7 text-lab-600" />
              {isNew ? '新建色谱记录' : '编辑记录'}
            </h1>
            <p className="text-sm text-zinc-500 mt-1">填写批次信息并导入/录入谱图峰数据</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <button onClick={save} className="btn-primary">
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard title="基本信息" icon={<FlaskConical className="w-5 h-5 text-lab-500" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">批号 *</label>
                <input value={batchNumber} onChange={e => setBatchNumber(e.target.value)} className="input" placeholder="如 GC-2026-0421-A" />
              </div>
              <div>
                <label className="label">样品名称 *</label>
                <input value={sampleName} onChange={e => setSampleName(e.target.value)} className="input" placeholder="如 乙酸乙酯粗产品" />
              </div>
              <div>
                <label className="label">进样时间</label>
                <input type="datetime-local" value={injectionTime} onChange={e => setInjectionTime(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">仪器型号</label>
                <input value={instrumentModel} onChange={e => setInstrumentModel(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">操作人员</label>
                <input value={operator} onChange={e => setOperator(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">数据状态</label>
                <select value={status} onChange={e => setStatus(e.target.value as RecordStatus)} className="input">
                  <option value="needs_review">需安全员复核</option>
                  <option value="ready">可直接使用</option>
                  <option value="invalid">无效/坏数据</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-lab-100">
              <div>
                <label className="label">色谱柱</label>
                <input value={params.column || ''} onChange={e => setParams(p => ({ ...p, column: e.target.value }))} className="input" placeholder="如 HP-INNOWax 30m×0.32mm×0.5μm" />
              </div>
              <div>
                <label className="label">载气</label>
                <input value={params.carrierGas || ''} onChange={e => setParams(p => ({ ...p, carrierGas: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">柱流速 (mL/min)</label>
                <input type="number" value={params.flowRate ?? ''} onChange={e => setParams(p => ({ ...p, flowRate: Number(e.target.value) }))} className="input" />
              </div>
              <div>
                <label className="label">进样量</label>
                <input value={params.injectionVolume || ''} onChange={e => setParams(p => ({ ...p, injectionVolume: e.target.value }))} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="label">柱温程序</label>
                <input value={params.temperatureProgram || ''} onChange={e => setParams(p => ({ ...p, temperatureProgram: e.target.value }))} className="input" placeholder="如 60℃保持2min，以10℃/min升至150℃" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="谱图峰数据"
            icon={<BarChart3 className="w-5 h-5 text-lab-500" />}
            extra={
              <div className="flex items-center gap-2">
                <label className="btn-secondary cursor-pointer">
                  <Upload className="w-4 h-4" />
                  导入 CSV
                  <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleFileUpload} />
                </label>
                <button onClick={runValidation} className="btn-secondary">
                  <RefreshCw className="w-4 h-4" />
                  检测质量
                </button>
                <button onClick={addPeakRow} className="btn-ghost">
                  <Plus className="w-4 h-4" />
                  新增峰
                </button>
              </div>
            }
          >
            {validationInfo && (validationInfo.nullCount || validationInfo.duplicateCount || validationInfo.outlierCount) && (
              <div className="mb-3 bg-warning-50 border border-warning-200 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-medium text-warning-800">检测到数据质量问题：</span>
                    <ul className="mt-1 text-xs text-warning-700 space-y-0.5">
                      {validationInfo.details.map((d, i) => <li key={i}>· {d}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {peaks.length === 0 ? (
              <div className="py-10 text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 text-zinc-300" />
                <p className="text-sm text-zinc-500">暂无峰数据，点击右上角「导入 CSV」或「新增峰」</p>
                <p className="text-xs text-zinc-400 mt-1">支持的格式：序号,组分名,保留时间,峰面积,峰高,理论塔板数</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                      <th className="py-2 px-2 border-b border-lab-100 font-medium">#</th>
                      <th className="py-2 px-2 border-b border-lab-100 font-medium">组分名称</th>
                      <th className="py-2 px-2 border-b border-lab-100 font-medium text-right">保留时间</th>
                      <th className="py-2 px-2 border-b border-lab-100 font-medium text-right">峰面积</th>
                      <th className="py-2 px-2 border-b border-lab-100 font-medium text-right">峰高</th>
                      <th className="py-2 px-2 border-b border-lab-100 font-medium text-right">塔板数</th>
                      <th className="py-2 px-2 border-b border-lab-100 font-medium w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {peaks.map((peak, idx) => (
                      <tr key={peak.id} className={cn(peak.dataQuality !== 'normal' && 'bg-warning-50/50')}>
                        <td className="py-1.5 px-2 border-b border-lab-50 text-zinc-400 text-xs font-mono">{idx + 1}</td>
                        <td className="py-1 px-2 border-b border-lab-50">
                          <input
                            value={peak.compoundName || ''}
                            onChange={e => setPeaks(ps => ps.map((p, i) => i === idx ? { ...p, compoundName: e.target.value } : p))}
                            className="input !py-1 text-xs"
                          />
                        </td>
                        {(['retentionTime', 'peakArea', 'peakHeight', 'theoreticalPlates'] as const).map(f => (
                          <td key={f} className="py-1 px-2 border-b border-lab-50">
                            <input
                              type="number"
                              value={peak[f] ?? ''}
                              onChange={e => setPeaks(ps => ps.map((p, i) => i === idx ? { ...p, [f]: e.target.value === '' ? null : Number(e.target.value) } : p))}
                              className="input !py-1 text-xs text-right font-mono"
                            />
                          </td>
                        ))}
                        <td className="py-1 px-2 border-b border-lab-50 text-right">
                          <button onClick={() => removePeak(idx)} className="text-zinc-400 hover:text-danger-500 p-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <CalculationPanel
            result={previewCalc}
            onRecalculate={() => {
              const { peaks: vp, issues } = validatePeaks(peaks);
              setPeaks(vp);
              if (issues.nullCount || issues.duplicateCount) {
                setValidationInfo({
                  nullCount: issues.nullCount, duplicateCount: issues.duplicateCount,
                  outlierCount: issues.outlierCount, details: issues.details,
                });
              }
            }}
          />
        </div>

        <div className="space-y-5">
          <SectionCard title="判读结论" icon={<Calculator className="w-5 h-5 text-lab-500" />}>
            <div className="space-y-3">
              <div>
                <label className="label">结论摘要</label>
                <textarea
                  value={conclusion}
                  onChange={e => setConclusion(e.target.value)}
                  rows={5}
                  className="input resize-none"
                  placeholder="填写组分含量、是否符合标准等结论..."
                />
              </div>
              <div>
                <label className="label">结论来源（关联原始材料）</label>
                <textarea
                  value={conclusionSource}
                  onChange={e => setConclusionSource(e.target.value)}
                  rows={3}
                  className="input resize-none text-xs"
                  placeholder="如：依据 GB/T 12717-2007，称量单 WL-2026-0421-003"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="快速预览" icon={<BarChart3 className="w-5 h-5 text-lab-500" />}>
            <PeakTable peaks={peaks.slice(0, 8)} />
            {peaks.length > 8 && (
              <div className="mt-2 text-center text-xs text-zinc-500">还有 {peaks.length - 8} 个峰未展示</div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
