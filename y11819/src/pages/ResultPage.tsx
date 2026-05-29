import { useState, useEffect } from 'react';
import { Calculator, ChevronDown, ChevronRight, AlertTriangle, CloudRain, Pause, FileWarning, CheckCircle2, Clock, ArrowRight, Eye } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { CalculationResult, CalculationSegment, CalculationFlag, ExemptionDetail, AuditTrailStep } from '../../shared/types';

const FLAG_CONFIG: Record<CalculationFlag, { label: string; color: string; icon: typeof AlertTriangle }> = {
  rate_missing: { label: '费率缺失', color: 'badge-error', icon: FileWarning },
  weather_cross_period: { label: '跨时段豁免', color: 'badge-warning animate-pulse-subtle', icon: CloudRain },
  handling_pause: { label: '装卸暂停', color: 'badge-info', icon: Pause },
  rate_step_review: { label: '阶梯复核', color: 'badge-warning', icon: AlertTriangle },
};

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function SegmentTimeline({ segments }: { segments: CalculationSegment[] }) {
  return (
    <div className="space-y-0">
      {segments.map((seg, i) => (
        <div key={seg.id} className="flex items-stretch group">
          <div className="flex flex-col items-center w-8 shrink-0">
            <div className={`w-3 h-3 rounded-full border-2 mt-3 ${
              seg.type === 'free' ? 'bg-emerald-400 border-emerald-500' : 'bg-port-400 border-port-500'
            }`} />
            {i < segments.length - 1 && <div className="w-0.5 flex-1 bg-steel-200" />}
          </div>
          <div className="flex-1 pb-4 pt-1">
            <div className={`card p-3 ${seg.needsReview ? 'ring-1 ring-amber-300' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`badge ${seg.type === 'free' ? 'bg-emerald-50 text-emerald-700' : 'bg-port-50 text-port-700'}`}>
                    {seg.type === 'free' ? '免费期' : '计费期'}
                  </span>
                  {seg.rateTier && <span className="text-xs text-steel-500">{seg.rateTier}</span>}
                  {seg.needsReview && <span className="badge-warning text-[10px]">需复核</span>}
                </div>
                {seg.type === 'chargeable' && (
                  <span className="font-mono font-semibold text-navy-900 text-sm">
                    {seg.amount.toLocaleString()} <span className="text-steel-400 text-xs">USD</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-steel-500">
                <span className="font-mono">{formatDateTime(seg.startTime)}</span>
                <ArrowRight className="w-3 h-3" />
                <span className="font-mono">{formatDateTime(seg.endTime)}</span>
                <span className="font-mono text-navy-700">{seg.hours}h</span>
                {seg.rate > 0 && <span className="font-mono">@{seg.rate}/h</span>}
              </div>
              {seg.reviewReason && (
                <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 px-2 py-1 rounded">
                  ⚠️ {seg.reviewReason}
                </p>
              )}
              {seg.exemptions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {seg.exemptions.map((ex, ei) => (
                    <ExemptionBadge key={ei} exemption={ex} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExemptionBadge({ exemption }: { exemption: ExemptionDetail }) {
  return (
    <div className={`text-xs px-2 py-1.5 rounded-lg ${
      exemption.crossPeriodBoundary ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'
    }`}>
      <div className="flex items-center gap-1.5">
        <CloudRain className="w-3 h-3 text-blue-500" />
        <span className="font-medium text-navy-700">{exemption.type === 'weather' ? '天气豁免' : '其他豁免'}</span>
        <span className="font-mono text-steel-500">{exemption.hours}h</span>
        {exemption.crossPeriodBoundary && (
          <span className="badge-warning text-[10px] ml-1 animate-pulse-subtle">跨时段</span>
        )}
      </div>
      <p className="text-steel-500 mt-0.5">{exemption.detail}</p>
      {exemption.stuckAt && (
        <p className="text-amber-600 mt-0.5 font-medium">🔴 卡点：{exemption.stuckAt}</p>
      )}
    </div>
  );
}

function AuditTrail({ trail }: { trail: AuditTrailStep[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {trail.map((step, i) => (
        <div key={i} className="border border-steel-200 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-steel-50 transition-colors"
            onClick={() => setExpanded(expanded === i ? null : i)}
          >
            <div className="w-6 h-6 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center text-xs font-semibold">
              {i + 1}
            </div>
            <span className="text-sm font-medium text-navy-800 flex-1">{step.step}</span>
            <span className="text-xs text-steel-400">{step.description}</span>
            {expanded === i ? <ChevronDown className="w-4 h-4 text-steel-400" /> : <ChevronRight className="w-4 h-4 text-steel-400" />}
          </button>
          {expanded === i && (
            <div className="px-4 pb-3 pt-1 border-t border-steel-100 bg-steel-50/50 animate-slide-down">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold text-navy-700 mb-1">输入参数</p>
                  <pre className="bg-white rounded p-2 text-steel-600 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(step.input, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="font-semibold text-navy-700 mb-1">输出结果</p>
                  <pre className="bg-white rounded p-2 text-steel-600 font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CalculationCard({ calc, onExpand, isExpanded }: { calc: CalculationResult; onExpand: () => void; isExpanded: boolean }) {
  return (
    <div className={`card overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-port-300' : ''}`}>
      <div
        className="px-5 py-4 cursor-pointer hover:bg-steel-50/50 transition-colors"
        onClick={onExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-navy-50 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h4 className="font-semibold text-navy-900">{calc.vesselName}</h4>
              <p className="text-xs text-steel-500 flex items-center gap-2 mt-0.5">
                <span>{calc.port}</span>
                <span>·</span>
                <Clock className="w-3 h-3" />
                <span className="font-mono">{formatDateTime(calc.berthTime)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-steel-400">滞期费合计</p>
              <p className="text-xl font-mono font-bold text-navy-900">
                {calc.totalDemurrage.toLocaleString()}
                <span className="text-xs text-steel-400 font-normal ml-1">{calc.currency}</span>
              </p>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1 text-xs text-steel-500">
                <span>免费 {calc.freePeriodHours}h</span>
                <span>·</span>
                <span>计费 {calc.chargeableHours}h</span>
                <span>·</span>
                <span>豁免 {calc.exemptedHours}h</span>
              </div>
              {calc.flags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {calc.flags.map((f) => {
                    const cfg = FLAG_CONFIG[f];
                    const Icon = cfg.icon;
                    return (
                      <span key={f} className={cfg.color}>
                        <Icon className="w-3 h-3 mr-0.5" />
                        {cfg.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            {isExpanded ? <ChevronDown className="w-5 h-5 text-steel-400" /> : <ChevronRight className="w-5 h-5 text-steel-400" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-steel-200 animate-slide-down">
          <div className="p-5 grid grid-cols-[1fr_1fr] gap-6">
            <div>
              <h5 className="text-sm font-semibold text-navy-800 mb-3">时段追溯</h5>
              <SegmentTimeline segments={calc.segments} />
            </div>
            <div>
              <h5 className="text-sm font-semibold text-navy-800 mb-3">计算流水</h5>
              <AuditTrail trail={calc.auditTrail} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultPage() {
  const { calculations, setCalculations, calcLoading, setCalcLoading } = useAppStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const runCalculation = async () => {
    setCalcLoading(true);
    try {
      const res = await fetch('/api/calculation/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) {
        setCalculations(data.calculations);
        setHasRun(true);
      }
    } catch (err) {
      console.error('Calculation failed:', err);
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    const loadList = async () => {
      try {
        const res = await fetch('/api/calculation/list');
        const data = await res.json();
        if (data.success && data.calculations?.length) {
          const details = await Promise.all(
            data.calculations.map(async (c: { id: string }) => {
              const r = await fetch(`/api/calculation/${c.id}`);
              const d = await r.json();
              return d.calculation;
            })
          );
          setCalculations(details.filter(Boolean));
          setHasRun(true);
        }
      } catch {}
    };
    loadList();
  }, [setCalculations]);

  const reviewCount = calculations.filter((c) => c.flags.length > 0).length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-navy-900">试算结果</h2>
          <p className="text-steel-500 mt-1">查看滞期费试算结果，追溯时段切分、豁免规则和阶梯计费</p>
        </div>
        <button
          onClick={runCalculation}
          disabled={calcLoading}
          className="btn-primary flex items-center gap-2"
        >
          <Calculator className="w-4 h-4" />
          {calcLoading ? '试算中...' : '运行试算'}
        </button>
      </div>

      {hasRun && calculations.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-xs text-steel-400">试算船舶</p>
            <p className="text-2xl font-mono font-bold text-navy-900 mt-1">{calculations.length}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-steel-400">滞期费总计</p>
            <p className="text-2xl font-mono font-bold text-port-600 mt-1">
              {calculations.reduce((s, c) => s + c.totalDemurrage, 0).toLocaleString()}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-steel-400">需复核</p>
            <p className="text-2xl font-mono font-bold text-amber-600 mt-1">{reviewCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-steel-400">校验通过</p>
            <p className="text-2xl font-mono font-bold text-emerald-600 mt-1">{calculations.length - reviewCount}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {calculations.map((calc) => (
          <CalculationCard
            key={calc.id}
            calc={calc}
            isExpanded={expandedId === calc.id}
            onExpand={() => setExpandedId(expandedId === calc.id ? null : calc.id)}
          />
        ))}
      </div>

      {!hasRun && (
        <div className="text-center py-20 text-steel-400">
          <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">请先在"数据导入"页面上传数据，然后点击"运行试算"</p>
        </div>
      )}

      {hasRun && calculations.length === 0 && !calcLoading && (
        <div className="text-center py-20 text-steel-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">试算完成，未发现滞期费。请确认已导入靠泊记录和合同费率</p>
        </div>
      )}
    </div>
  );
}
