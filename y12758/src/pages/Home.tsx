import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Scale,
  FileUp,
  ClipboardCheck,
  RefreshCw,
  Download,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '@/store';

export default function Home() {
  const navigate = useNavigate();
  const {
    batches,
    balanceInput,
    balanceOutput,
    setBalanceInput,
    setBalanceOutput,
    setCurrentBatch,
  } = useStore();

  useEffect(() => {
    if (batches.length === 0) {
      setBalanceInput({
        sampleWeight: 100,
        purity: 99.5,
        impurityWeight: 0.15,
      });
    }
  }, [batches.length, setBalanceInput]);

  useEffect(() => {
    const { sampleWeight, purity, impurityWeight } = balanceInput;
    if (
      sampleWeight !== undefined &&
      purity !== undefined &&
      impurityWeight !== undefined &&
      sampleWeight > 0
    ) {
      const theoreticalImpurityRatio = (impurityWeight / sampleWeight) * 100;
      const dilutionFactor =
        theoreticalImpurityRatio > 0 ? purity / theoreticalImpurityRatio : undefined;
      setBalanceOutput({
        theoreticalImpurityRatio,
        dilutionFactor,
      });
    } else {
      setBalanceOutput({
        theoreticalImpurityRatio: undefined,
        dilutionFactor: undefined,
      });
    }
  }, [balanceInput, setBalanceOutput]);

  const handleInputChange = (field: keyof typeof balanceInput, value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    setBalanceInput({ [field]: numValue } as Partial<typeof balanceInput>);
  };

  const handleBatchClick = (batchId: string) => {
    setCurrentBatch(batchId);
    navigate('/results');
  };

  const recentBatches = [...batches]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  return (
    <div>
      <h2 className="font-serif text-2xl text-ink mb-6">配平计算</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-ink-light p-6">
            <div className="flex items-center gap-2 mb-5">
              <Scale className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-ink">配平计算器</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">
                  样品重量 (mg)
                </label>
                <input
                  type="number"
                  value={balanceInput.sampleWeight ?? ''}
                  onChange={(e) => handleInputChange('sampleWeight', e.target.value)}
                  className="rounded-lg border border-ink-light px-3 py-2 w-full focus:border-primary outline-none"
                  placeholder="输入样品重量"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">
                  纯度 (%)
                </label>
                <input
                  type="number"
                  value={balanceInput.purity ?? ''}
                  onChange={(e) => handleInputChange('purity', e.target.value)}
                  className="rounded-lg border border-ink-light px-3 py-2 w-full focus:border-primary outline-none"
                  placeholder="输入纯度"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-1.5">
                  杂质称样量 (mg)
                </label>
                <input
                  type="number"
                  value={balanceInput.impurityWeight ?? ''}
                  onChange={(e) => handleInputChange('impurityWeight', e.target.value)}
                  className="rounded-lg border border-ink-light px-3 py-2 w-full focus:border-primary outline-none"
                  placeholder="输入杂质称样量"
                  step="0.001"
                />
              </div>
            </div>

            <div className="bg-ink-light/30 rounded-lg p-5 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-sm text-ink-muted mb-1">理论杂质比例</div>
                  <div className="text-4xl font-bold text-primary">
                    {balanceOutput.theoreticalImpurityRatio !== undefined
                      ? balanceOutput.theoreticalImpurityRatio.toFixed(4)
                      : '—'}
                    <span className="text-lg font-normal ml-1">%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-ink-muted mb-1">稀释因子</div>
                  <div className="text-4xl font-bold text-ink">
                    {balanceOutput.dilutionFactor !== undefined
                      ? balanceOutput.dilutionFactor.toFixed(2)
                      : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/records"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                导入此批次实验记录
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-ink-light p-6">
            <h3 className="font-semibold text-ink mb-5">快捷导航</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/records"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-ink-light hover:shadow-md hover:-translate-y-0.5 transition bg-white"
              >
                <FileUp className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-ink">实验记录处理</span>
              </Link>
              <Link
                to="/results"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-ink-light hover:shadow-md hover:-translate-y-0.5 transition bg-white"
              >
                <ClipboardCheck className="w-6 h-6 text-pass" />
                <span className="text-sm font-medium text-ink">检查结果</span>
              </Link>
              <Link
                to="/retest"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-ink-light hover:shadow-md hover:-translate-y-0.5 transition bg-white"
              >
                <RefreshCw className="w-6 h-6 text-warn" />
                <span className="text-sm font-medium text-ink">复测建议</span>
              </Link>
              <Link
                to="/history"
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-ink-light hover:shadow-md hover:-translate-y-0.5 transition bg-white"
              >
                <Download className="w-6 h-6 text-ink-muted" />
                <span className="text-sm font-medium text-ink">历史与导出</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {recentBatches.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-ink-light p-6">
          <h3 className="font-semibold text-ink mb-4">最近处理的批次</h3>
          <div className="space-y-2">
            {recentBatches.map((batch) => (
              <button
                key={batch.batchId}
                onClick={() => handleBatchClick(batch.batchId)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-ink-light/30 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <div className="text-sm font-medium text-ink">
                      {batch.batchId} — {batch.sampleName}
                    </div>
                    <div className="text-xs text-ink-muted">{batch.recordDate}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-muted" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
