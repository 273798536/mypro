import { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ResultCard } from '@/components/ResultCard';
import { Banner } from '@/components/Banner';
import { FlaskConical, Calculator, RotateCcw, Download, AlertCircle, FileText } from 'lucide-react';
import { historicalBlankControls } from '@/data/mockData';
import { buildExportSummary, exportToPDF, exportToCSV, downloadCSV } from '@/utils/export';
import { CALCULATION_CONFIG } from '@/utils/calculator';

interface FormState {
  sampleNo: string;
  batchId: string;
  reagentId: string;
  sampleMass: string;
  dryMass: string;
  blankControl: string;
  parallelCount: number;
  parallelResultsStr: string;
}

const initialForm: FormState = {
  sampleNo: '',
  batchId: '',
  reagentId: '',
  sampleMass: '',
  dryMass: '',
  blankControl: '',
  parallelCount: 1,
  parallelResultsStr: '',
};

function CalculatorPage() {
  const {
    reagents,
    batches,
    initializeWithMock,
    addExperiment,
    runCalculation,
    getResultById,
    getReagentById,
    getBatchById,
    getExperimentById,
    results,
  } = useAppStore();

  const [form, setForm] = useState<FormState>(initialForm);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    initializeWithMock();
  }, [initializeWithMock]);

  const currentResult = useMemo(
    () => (currentResultId ? getResultById(currentResultId) : null),
    [currentResultId, getResultById]
  );

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors([]);
    setWarnings([]);
  };

  const handleCalculate = () => {
    if (!form.sampleMass || !form.dryMass) {
      setErrors(['样品质量和干燥后质量为必填项']);
      return;
    }

    const expId = addExperiment({
      sampleNo: form.sampleNo || `S-${Date.now()}`,
      batchId: form.batchId,
      reagentId: form.reagentId,
      sampleMass: parseFloat(form.sampleMass),
      dryMass: parseFloat(form.dryMass),
      blankControl: form.blankControl ? parseFloat(form.blankControl) : null,
      parallelCount: form.parallelCount,
      parallelResults: form.parallelResultsStr
        ? form.parallelResultsStr.split(/[,，\s]+/).map((s) => parseFloat(s)).filter((n) => !isNaN(n))
        : undefined,
    });

    const reagent = form.reagentId ? getReagentById(form.reagentId) : undefined;
    const batch = form.batchId ? getBatchById(form.batchId) : undefined;
    const experiment = getExperimentById(expId);

    const out = runCalculation(expId, {
      sampleMass: parseFloat(form.sampleMass),
      dryMass: parseFloat(form.dryMass),
      blankControl: form.blankControl ? parseFloat(form.blankControl) : null,
      historicalBlanks: historicalBlankControls,
      parallelResults: experiment?.parallelResults,
      reagentName: reagent?.name,
      sampleNo: experiment?.sampleNo,
      batchNo: batch?.batchNo,
    });

    setErrors(out.errors);
    setWarnings(out.warnings);
    if (out.resultId) {
      setCurrentResultId(out.resultId);
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setCurrentResultId(null);
    setErrors([]);
    setWarnings([]);
  };

  const handleExportPDF = async () => {
    if (!currentResult) return;
    try {
      await exportToPDF('result-card', `晶体水含量报告_${new Date().toLocaleDateString()}.pdf`);
    } catch (e) {
      console.error(e);
      alert('PDF导出失败');
    }
  };

  const handleExportCSV = () => {
    if (!currentResult) return;
    const experiment = currentResult ? getExperimentById(currentResult.experimentId) : undefined;
    const reagent = experiment?.reagentId ? getReagentById(experiment.reagentId) : undefined;
    const batch = experiment?.batchId ? getBatchById(experiment.batchId) : undefined;
    const summary = buildExportSummary(currentResult, experiment, reagent, batch);
    const csv = exportToCSV([summary]);
    downloadCSV(`晶体水含量_${new Date().toLocaleDateString()}.csv`, csv);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <div className="xl:col-span-2 space-y-5">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
              <Calculator className="w-4.5 h-4.5 text-primary-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 font-serif">实验参数录入</h3>
              <p className="text-xs text-slate-400">填写样品与对照数据，系统将自动计算</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">样品编号</label>
                <input
                  className="input-field"
                  value={form.sampleNo}
                  onChange={(e) => handleChange('sampleNo', e.target.value)}
                  placeholder="例：S-1108-01"
                />
              </div>
              <div>
                <label className="label-text">关联批次</label>
                <select
                  className="input-field"
                  value={form.batchId}
                  onChange={(e) => handleChange('batchId', e.target.value)}
                >
                  <option value="">选择批次...</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.batchNo}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label-text">
                <FlaskConical className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5 text-primary-600" />
                选用试剂
              </label>
              <select
                className="input-field"
                value={form.reagentId}
                onChange={(e) => handleChange('reagentId', e.target.value)}
              >
                <option value="">选择试剂...</option>
                {reagents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}（批号：{r.batchNo || '未登记'}）
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">
                  样品质量 m₁
                  <span className="text-slate-400 font-normal ml-1">(g)</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="input-field font-mono"
                  value={form.sampleMass}
                  onChange={(e) => handleChange('sampleMass', e.target.value)}
                  placeholder="例：2.5032"
                />
              </div>
              <div>
                <label className="label-text">
                  干燥后质量 m₂
                  <span className="text-slate-400 font-normal ml-1">(g)</span>
                </label>
                <input
                  type="number"
                  step="0.0001"
                  className="input-field font-mono"
                  value={form.dryMass}
                  onChange={(e) => handleChange('dryMass', e.target.value)}
                  placeholder="例：1.6015"
                />
              </div>
            </div>

            <div>
              <label className="label-text">
                空白对照 B
                <span className="text-slate-400 font-normal ml-1">(g)</span>
                <span className="text-status-review ml-1 text-[11px]">（缺失时将自动使用历史均值）</span>
              </label>
              <input
                type="number"
                step="0.0001"
                className="input-field font-mono"
                value={form.blankControl}
                onChange={(e) => handleChange('blankControl', e.target.value)}
                placeholder="留空则使用历史均值降级计算"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label-text">平行样数量</label>
                <select
                  className="input-field"
                  value={form.parallelCount}
                  onChange={(e) => handleChange('parallelCount', parseInt(e.target.value) || 1)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n} 份</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label-text">平行样结果（逗号分隔，%）</label>
                <input
                  className="input-field font-mono text-xs"
                  value={form.parallelResultsStr}
                  onChange={(e) => handleChange('parallelResultsStr', e.target.value)}
                  placeholder="例：35.94, 36.02"
                />
              </div>
            </div>

            <Banner
              type="info"
              title="计算公式说明"
              message={CALCULATION_CONFIG.FORMULA_STANDARD}
              details={`适用范围：${CALCULATION_CONFIG.APPLICABLE_RANGE}\n单位：%（质量百分比）\n平行样偏差阈值：${CALCULATION_CONFIG.PARALLEL_DEVIATION_THRESHOLD}%\n\n降级公式（空白对照缺失）：${CALCULATION_CONFIG.FORMULA_FALLBACK}\n其中 B̄ 为同试剂近${CALCULATION_CONFIG.DEFAULT_BLANK_HISTORY_DAYS}天空白对照均值`}
              expandable
            />

            {errors.length > 0 && (
              <Banner
                type="error"
                title="输入数据存在问题"
                message={errors.join('；')}
              />
            )}
            {warnings.length > 0 && (
              <Banner
                type="warning"
                title="注意事项"
                message={warnings.join('；')}
                expandable
              />
            )}

            <div className="flex gap-3 pt-2">
              <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
              <button className="btn-primary flex-[2] flex items-center justify-center gap-2" onClick={handleCalculate}>
                <Calculator className="w-4 h-4" />
                开始计算
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="xl:col-span-3 space-y-5">
        {currentResult ? (
          <>
            <ResultCard
              status={currentResult.status}
              waterContent={currentResult.waterContent}
              unit={currentResult.unit}
              formula={currentResult.formula}
              formulaDetail={currentResult.formulaDetail}
              sourceTrace={currentResult.sourceTrace}
              safetyTip={currentResult.safetyTip}
              failureReason={currentResult.failureReason}
              retestAdvice={currentResult.retestAdvice}
              blankFallback={currentResult.blankFallback}
              blankFallbackValue={currentResult.blankFallbackValue}
              applicableRange={currentResult.applicableRange}
              calculatedAt={currentResult.calculatedAt}
              parallelDeviation={currentResult.parallelDeviation}
              onExport={handleExportPDF}
            />

            <div className="card p-5 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">导出数据（与界面摘要完全一致）</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  报告文件中包含状态、公式、来源追溯、复测建议等所有界面显示信息
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex items-center gap-1.5 text-sm py-2" onClick={handleExportCSV}>
                  <Download className="w-4 h-4" />
                  CSV
                </button>
                <button className="btn-primary flex items-center gap-1.5 text-sm py-2" onClick={handleExportPDF}>
                  <Download className="w-4 h-4" />
                  PDF
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="card p-16 flex flex-col items-center justify-center text-center min-h-[500px]">
            <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
              <Calculator className="w-10 h-10 text-primary-400" />
            </div>
            <h3 className="font-serif text-xl font-semibold text-slate-700 mb-2">
              等待开始计算
            </h3>
            <p className="text-sm text-slate-400 max-w-sm">
              请在左侧填写实验参数，点击"开始计算"后将在此显示完整的计算结果、公式推导与安全提示
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="card p-5">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">最近计算记录</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">样品</th>
                    <th className="table-th">水含量</th>
                    <th className="table-th">状态</th>
                    <th className="table-th">时间</th>
                    <th className="table-th">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(-5).reverse().map((r) => {
                    const exp = getExperimentById(r.experimentId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="table-td font-medium">{exp?.sampleNo || '—'}</td>
                        <td className="table-td font-mono">{r.waterContent.toFixed(4)}%</td>
                        <td className="table-td">
                          <span className={`w-2 h-2 inline-block rounded-full mr-2 ${
                            r.status === 'PASS' ? 'bg-status-pass' :
                            r.status === 'REVIEW' ? 'bg-status-review' : 'bg-status-fail'
                          }`} />
                          {r.status}
                        </td>
                        <td className="table-td text-xs text-slate-400">
                          {new Date(r.calculatedAt).toLocaleString('zh-CN')}
                        </td>
                        <td className="table-td">
                          <button
                            className="text-primary-600 hover:text-primary-800 text-xs font-medium"
                            onClick={() => setCurrentResultId(r.id)}
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CalculatorPage;
