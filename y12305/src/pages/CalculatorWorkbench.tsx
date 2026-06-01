import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { WarningList } from '../components/WarningBadge';
import { Calculator, ChevronDown, ChevronUp, Zap, DollarSign, Gauge, GitBranch, ArrowRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TierCalculation } from '../../shared/types';

export function CalculatorWorkbench() {
  const tariffs = useAppStore((state) => state.tariffs);
  const usageRecords = useAppStore((state) => state.usageRecords);
  const currentVersion = useAppStore((state) => state.currentVersion);
  const selectedTariffId = useAppStore((state) => state.selectedTariffId);
  const selectedUsageId = useAppStore((state) => state.selectedUsageId);
  const loading = useAppStore((state) => state.loading);
  const loadTariffs = useAppStore((state) => state.loadTariffs);
  const loadUsageRecords = useAppStore((state) => state.loadUsageRecords);
  const setSelectedTariffId = useAppStore((state) => state.setSelectedTariffId);
  const setSelectedUsageId = useAppStore((state) => state.setSelectedUsageId);
  const calculate = useAppStore((state) => state.calculate);
  const loadVersionDetail = useAppStore((state) => state.loadVersionDetail);

  const [versionName, setVersionName] = useState('');
  const [note, setNote] = useState('');
  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  useEffect(() => {
    loadTariffs();
    loadUsageRecords();
  }, []);

  const selectedTariff = tariffs.find((t) => t.id === selectedTariffId);
  const selectedUsage = usageRecords.find((r) => r.id === selectedUsageId);

  const handleCalculate = async () => {
    if (!selectedTariffId || !selectedUsageId) return;

    const name = versionName || `核算版本 ${new Date().toLocaleDateString('zh-CN')}`;
    const version = await calculate(selectedTariffId, selectedUsageId, name, note);

    if (version) {
      setVersionName('');
      setNote('');
    }
  };

  const hasErrors = currentVersion?.warnings.some((w) => w.severity === 'error');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-brand" />
            核算工作台
          </h2>
          <p className="text-slate-500 mt-1">选择电价表和用电记录，执行逆向核算</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">共 {tariffs.length} 个电价表 | {usageRecords.length} 条记录</span>
          <Link to="/import" className="btn-secondary text-sm">
            管理数据
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" />
              选择核算对象
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">电价表</label>
                <select
                  className="input"
                  value={selectedTariffId || ''}
                  onChange={(e) => setSelectedTariffId(e.target.value || null)}
                >
                  <option value="">请选择电价表</option>
                  {tariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name} {tariff.isExpired ? '(已过期)' : ''}
                    </option>
                  ))}
                </select>
                {selectedTariff && (
                  <div className="mt-2 text-xs text-slate-500">
                    <span className={selectedTariff.isExpired ? 'text-red-600' : 'text-emerald-600'}>
                      有效期: {selectedTariff.effectiveFrom} 至 {selectedTariff.effectiveTo}
                    </span>
                    <div className="flex gap-1 mt-1">
                      {selectedTariff.tiers.map((tier, idx) => (
                        <span key={idx} className="badge-info">
                          {tier.tierName}: {tier.pricePerKwh}元/kWh
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="label">用电记录</label>
                <select
                  className="input"
                  value={selectedUsageId || ''}
                  onChange={(e) => setSelectedUsageId(e.target.value || null)}
                >
                  <option value="">请选择用电记录</option>
                  {usageRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.recordDate} - {record.totalBill}元
                    </option>
                  ))}
                </select>
                {selectedUsage && (
                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    <div>账单日期: {selectedUsage.recordDate}</div>
                    <div className="font-mono">
                      总电费: {selectedUsage.totalBill.toFixed(2)}元
                      {selectedUsage.totalUsage && ` | 总用量: ${selectedUsage.totalUsage}kWh`}
                    </div>
                    {selectedUsage.customerNote && (
                      <div className="text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        备注: {selectedUsage.customerNote}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">版本名称</label>
                <input
                  type="text"
                  className="input"
                  placeholder="留空则自动生成"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">备注说明</label>
                <input
                  type="text"
                  className="input"
                  placeholder="可选，记录本次核算的特殊说明"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <button
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2"
              disabled={!selectedTariffId || !selectedUsageId || loading}
              onClick={handleCalculate}
            >
              <Calculator className="w-4 h-4" />
              {loading ? '计算中...' : '执行逆向核算'}
            </button>
          </div>

          {currentVersion && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-brand" />
                  核算结果
                  <span className="badge-info font-normal">{currentVersion.name}</span>
                </h3>
                <Link
                  to={`/trace/${currentVersion.id}`}
                  className="text-sm text-brand hover:underline flex items-center gap-1"
                >
                  查看溯源 <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <DollarSign className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-500">实际总电费</div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    ¥{currentVersion.totalBill.toFixed(2)}
                  </div>
                </div>
                <div className={`rounded-lg p-4 text-center ${
                  Math.abs(currentVersion.discrepancy) < 0.01 ? 'bg-emerald-50' : 'bg-amber-50'
                }`}>
                  <Calculator className={`w-5 h-5 mx-auto mb-1 ${
                    Math.abs(currentVersion.discrepancy) < 0.01 ? 'text-emerald-400' : 'text-amber-400'
                  }`} />
                  <div className="text-xs text-slate-500">计算总电费</div>
                  <div className={`text-xl font-bold font-mono ${
                    Math.abs(currentVersion.discrepancy) < 0.01 ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    ¥{currentVersion.calculatedTotal.toFixed(2)}
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 text-center">
                  <Zap className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <div className="text-xs text-slate-500">计算总用量</div>
                  <div className="text-xl font-bold text-slate-800 font-mono">
                    {currentVersion.totalCalculatedKwh.toFixed(2)}kWh
                  </div>
                </div>
              </div>

              {Math.abs(currentVersion.discrepancy) > 0.01 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
                  <div className="text-sm text-amber-700">
                    <span className="font-medium">差异:</span> 计算值与实际值相差 ¥{Math.abs(currentVersion.discrepancy).toFixed(2)}
                    {currentVersion.discrepancy > 0 ? ' (计算值偏低)' : ' (计算值偏高)'}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  档位计算明细
                </h4>
                <div className="space-y-3">
                  {currentVersion.tierResults.map((tier, index) => (
                    <TierResultRow
                      key={tier.tierId}
                      tier={tier}
                      index={index}
                      isExpanded={expandedTier === tier.tierId}
                      onToggle={() => setExpandedTier(expandedTier === tier.tierId ? null : tier.tierId)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {currentVersion && (
            <div className="card p-6">
              <WarningList
                warnings={currentVersion.warnings}
                versionId={currentVersion.id}
                showTrace={true}
              />
            </div>
          )}

          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-4">样例说明</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="p-3 bg-emerald-50 rounded-md border-l-4 border-emerald-500">
                <div className="font-medium text-emerald-800">样例1: 正常记录</div>
                <p>2024-06-15 账单，用电280度，落在第二档，无异常</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-500">
                <div className="font-medium text-amber-800">样例2: 电价表过期</div>
                <p>2024-01-20 账单，建议用2023版电价表复核</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-500">
                <div className="font-medium text-blue-800">样例3: 边界档位</div>
                <p>2024-03-10 账单，恰好200度到达一档上限</p>
              </div>
              <div className="p-3 bg-red-50 rounded-md border-l-4 border-red-500">
                <div className="font-medium text-red-800">样例4: 用量为负</div>
                <p>2024-04-05 账单，峰时段出现-15度异常值</p>
              </div>
            </div>
          </div>

          {hasErrors && (
            <div className="card p-6 bg-red-50 border-red-200">
              <h3 className="font-semibold text-red-800 mb-2">注意事项</h3>
              <p className="text-sm text-red-700">
                本次核算包含错误级别的异常，建议先检查并修正原始数据后再使用核算结果。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TierResultRowProps {
  tier: TierCalculation;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

function TierResultRow({ tier, index, isExpanded, onToggle }: TierResultRowProps) {
  const colors = [
    'bg-emerald-100 text-emerald-700',
    'bg-blue-100 text-blue-700',
    'bg-amber-100 text-amber-700',
    'bg-red-100 text-red-700',
  ];

  const colorClass = colors[index % colors.length];

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${colorClass}`}>
            {index + 1}
          </span>
          <div>
            <div className="font-medium text-slate-800">{tier.tierName}</div>
            <div className="text-xs text-slate-500">{tier.tierRange} · {tier.pricePerKwh}元/kWh</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="font-mono font-semibold text-slate-800">{tier.billedKwh.toFixed(2)} kWh</div>
            <div className="text-xs text-slate-500">结算电量</div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-brand">¥{tier.billedAmount.toFixed(2)}</div>
            <div className="text-xs text-slate-500">电费</div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-100 bg-slate-50">
          <div className="pt-3">
            <div className="text-xs text-slate-500 mb-1">计算公式</div>
            <div className="font-mono text-sm bg-white p-3 rounded border border-slate-200 text-slate-700 whitespace-pre-wrap break-all">
              {tier.formula}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
