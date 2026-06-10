import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  CheckCircle2,
  Thermometer,
  Edit3,
  Info,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import type { OperationalError, Reagent } from '../../shared/types';

export function SupplementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { reagents, fetchReagents, supplementReagent, error, clearError } = useAppStore();
  const [fieldName, setFieldName] = useState('nominalConcentration');
  const [newValue, setNewValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchReagents();
  }, [fetchReagents]);

  const reagent: Reagent | undefined = reagents.find((r) => r.id === id);

  useEffect(() => {
    if (reagent && fieldName === 'nominalConcentration') {
      setNewValue(String(reagent.nominalConcentration));
    }
  }, [reagent, fieldName]);

  const handleSubmit = async () => {
    if (!id || !newValue.trim() || !reason.trim()) return;
    setSubmitting(true);
    clearError();
    const result = await supplementReagent(id, {
      fieldName,
      newValue: newValue.trim(),
      reason: reason.trim(),
    });
    setSubmitting(false);
    if (result.success) {
      setSuccess('补录成功，系统已自动合并至最新结论，未产生重复记录');
      setTimeout(() => {
        setSuccess(null);
        navigate('/reagent-ledger');
      }, 1500);
    }
  };

  if (!reagent && reagents.length === 0) {
    return <div className="p-16 text-center text-slate-400">加载中...</div>;
  }
  if (!reagent) {
    return (
      <div className="text-center py-24">
        <p className="text-slate-500 mb-4">试剂记录不存在</p>
        <button onClick={() => navigate('/reagent-ledger')} className="text-navy-600 hover:underline text-sm">
          返回试剂台账
        </button>
      </div>
    );
  }

  const fields = [
    { key: 'nominalConcentration', label: '标称浓度 (mg/L)', current: String(reagent.nominalConcentration) },
    { key: 'actualConcentration', label: '实测浓度 (mg/L)', current: reagent.actualConcentration ? String(reagent.actualConcentration) : '' },
    { key: 'supplier', label: '供应商', current: reagent.supplier ?? '' },
    { key: 'name', label: '试剂名称', current: reagent.name },
  ];
  const curField = fields.find((f) => f.key === fieldName)!;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-slide-up stagger-1">
        <button
          onClick={() => navigate('/reagent-ledger')}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          返回试剂台账
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded shadow-card overflow-hidden animate-slide-up stagger-1">
        <div className="px-6 py-5 bg-navy-600 flex items-center gap-3">
          <Edit3 className="w-6 h-6 text-navy-100" strokeWidth={1.8} />
          <div>
            <h1 className="font-serif text-xl font-bold text-white">试剂补录 / 修正</h1>
            <p className="text-navy-200 text-xs mt-0.5">
              系统自动合并同批次同指标的多份记录，以最新补录为准，避免产生重复结论
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 bg-slate-50 rounded border border-slate-200">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-navy-600 shrink-0 mt-0.5" strokeWidth={1.8} />
              <div className="text-sm">
                <div className="font-semibold text-slate-800 mb-1">
                  当前试剂：<span className="font-mono">{reagent.batchNo}</span> {reagent.name}
                </div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div>标称浓度：<span className="font-mono">{reagent.nominalConcentration} mg/L</span></div>
                  <div>温度曲线：<span className="font-mono">{reagent.temperatureCurves.map(c => `${c.temperature}℃`).join('、') || '无'}</span></div>
                  <div>已有补录：<span className="text-accent-600 font-medium">{reagent.supplementHistory.length} 条</span></div>
                </div>
              </div>
            </div>
          </div>

          {error && <DuplicateErrorBanner error={error} />}

          {success && (
            <div className="p-4 bg-status-passed/5 border border-status-passed/30 rounded animate-slide-up">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-status-passed shrink-0" strokeWidth={1.8} />
                <div>
                  <div className="text-sm font-semibold text-status-passed">补录成功</div>
                  <div className="text-xs text-slate-600 mt-0.5">{success}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                选择补录 / 修正的字段
              </label>
              <div className="grid grid-cols-2 gap-2">
                {fields.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFieldName(f.key)}
                    className={cn(
                      'p-3 text-left rounded border-2 transition-colors',
                      fieldName === f.key
                        ? 'border-navy-600 bg-navy-50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div className={cn(
                      'text-xs font-medium mb-0.5',
                      fieldName === f.key ? 'text-navy-700' : 'text-slate-500'
                    )}>{f.label}</div>
                    <div className={cn(
                      'font-mono text-sm',
                      fieldName === f.key ? 'text-navy-800 font-semibold' : 'text-slate-700'
                    )}>{f.current || '（空）'}</div>
                  </button>
                ))}
              </div>
              <button
                className="mt-2 w-full p-3 text-left rounded border-2 border-dashed border-slate-200 hover:border-accent-400 hover:bg-accent-50 transition-colors"
                onClick={() => {
                  const temps = [20, 25, 30].filter(
                    (t) => !reagent.temperatureCurves.some((c) => c.temperature === t)
                  );
                  if (temps.length === 0) return;
                  setFieldName('temperatureCurves');
                  setNewValue(`补充${temps[0]}℃温度曲线`);
                }}
              >
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-slate-400" strokeWidth={1.8} />
                  <div>
                    <div className="text-xs font-medium text-slate-500">补录温度曲线数据</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {[20, 25, 30]
                        .filter((t) => !reagent.temperatureCurves.some((c) => c.temperature === t))
                        .length > 0
                        ? `缺失：${[20, 25, 30].filter(t => !reagent.temperatureCurves.some(c => c.temperature === t)).map(t => `${t}℃`).join('、')}`
                        : '常用温度点已全部覆盖'
                      }
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {curField?.label ?? '新值'}
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`输入${curField?.label ?? '新值'}`}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                补录原因 / 说明 <span className="text-status-anomaly">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="请填写补录原因，例如：对照质检报告单修正原录入值、校准证书最新更新等..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 resize-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                此说明将写入追溯链路，便于后续审核和讲解
              </p>
            </div>
          </div>

          {reagent.supplementHistory.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">
                历史补录记录
              </h3>
              <ol className="space-y-2">
                {reagent.supplementHistory.map((s, idx) => (
                  <li key={s.id} className="p-3 bg-slate-50 rounded border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-accent-600">#{idx + 1}</span>
                      <span className="text-slate-500">{s.supplementedBy} · {formatDate(s.supplementedAt)}</span>
                    </div>
                    <div className="text-slate-700">
                      修正 <span className="font-mono">{s.fieldName}</span>：
                      {s.oldValue && (
                        <span className="font-mono text-slate-400 line-through mx-1">{s.oldValue}</span>
                      )}
                      <span className="mx-1">→</span>
                      <span className="font-mono font-semibold text-navy-700 mx-1">{s.newValue}</span>
                    </div>
                    <div className="text-slate-500 mt-0.5">原因：{s.reason}</div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => navigate('/reagent-ledger')}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 bg-white rounded hover:bg-slate-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !newValue.trim() || !reason.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-navy-600 rounded hover:bg-navy-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" strokeWidth={1.8} />
              {submitting ? '保存中...' : '提交补录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DuplicateErrorBanner({ error }: { error: OperationalError }) {
  return (
    <div className="p-4 bg-status-anomaly/5 border-l-4 border-status-anomaly rounded-r animate-expand-l">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-status-anomaly shrink-0 mt-0.5" strokeWidth={1.8} />
        <div className="flex-1">
          <div className="text-sm font-semibold text-status-anomaly mb-1">{error.title}</div>
          <ol className="text-xs text-slate-600 space-y-1 mt-2 list-decimal list-inside">
            {error.actionableSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }
