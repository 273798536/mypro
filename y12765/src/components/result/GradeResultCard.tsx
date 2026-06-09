import { CheckCircle2, UserCheck, XOctagon, ArrowLeft, Info, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVerificationStore } from '@/store/useVerificationStore';
import { computeSummary } from '@/utils/consistency';
import type { GradeResult } from '@/types';

function deriveGrade(): GradeResult {
  const { additiveItems } = useVerificationStore.getState();
  const summary = computeSummary(additiveItems);
  if (summary.total === 0) {
    return { level: 'review', label: '暂无数据', description: '请先在核验工作台录入检测数据' };
  }
  if (summary.failCount > 0) {
    return {
      level: 'reject',
      label: '不合格',
      description: '存在超过国家标准限量的添加剂，不得放行，必须由配方工程师启动不合格复测流程。',
    };
  }
  if (summary.reviewCount > 0) {
    return {
      level: 'review',
      label: '需配方工程师复核',
      description: '部分添加剂实测值已达限量 80% 以上，或数据处于临界区间。学生请勿直接用于生产放行，请提交配方工程师复核后再做决定。',
    };
  }
  return {
    level: 'direct',
    label: '可直接使用',
    description: '所有添加剂残留均在安全区间内（< 限量 80%），符合国家标准要求。学生可在配方工程师监督下参考使用。',
  };
}

export default function GradeResultCard() {
  const nav = useNavigate();
  const { additiveItems, safetyAlerts, retestSuggestions, batchNumber } = useVerificationStore();
  const grade = deriveGrade();
  const summary = computeSummary(additiveItems);

  const styles = {
    direct: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
      border: 'border-emerald-300',
      chip: 'bg-pass-500 text-white',
      icon: <CheckCircle2 size={44} className="text-pass-600" />,
      text: 'text-pass-700',
    },
    review: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
      border: 'border-amber-300',
      chip: 'bg-warn-500 text-white',
      icon: <UserCheck size={44} className="text-warn-600" />,
      text: 'text-warn-700',
    },
    reject: {
      bg: 'bg-gradient-to-br from-rose-50 to-red-50',
      border: 'border-rose-300',
      chip: 'bg-fail-500 text-white',
      icon: <XOctagon size={44} className="text-fail-600" />,
      text: 'text-fail-700',
    },
  }[grade.level];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button className="btn-ghost" onClick={() => nav('/')}>
        <ArrowLeft size={16} />返回核验工作台
      </button>

      <div className={`card p-8 border-2 ${styles.border} ${styles.bg}`}>
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0">{styles.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-serif text-3xl font-bold text-slate-800">核验结论</h1>
              <span className={`chip ${styles.chip} !text-sm !px-3 !py-1`}>{grade.label}</span>
            </div>
            <div className={`text-sm font-medium ${styles.text} mb-3`}>
              批次号：<span className="font-mono">{batchNumber || '未填写'}</span>
            </div>
            <p className="text-slate-700 leading-relaxed">{grade.description}</p>
            <div className="mt-4 grid grid-cols-4 gap-3 max-w-md">
              <div className="bg-white/70 rounded-md py-2 text-center">
                <div className="text-2xl font-serif font-bold text-slate-800">{summary.total}</div>
                <div className="text-xs text-slate-500">总条目</div>
              </div>
              <div className="bg-pass-50 rounded-md py-2 text-center">
                <div className="text-2xl font-serif font-bold text-pass-700">{summary.passCount}</div>
                <div className="text-xs text-slate-500">直接可用</div>
              </div>
              <div className="bg-warn-50 rounded-md py-2 text-center">
                <div className="text-2xl font-serif font-bold text-warn-700">{summary.reviewCount}</div>
                <div className="text-xs text-slate-500">需复核</div>
              </div>
              <div className="bg-fail-50 rounded-md py-2 text-center">
                <div className="text-2xl font-serif font-bold text-fail-700">{summary.failCount}</div>
                <div className="text-xs text-slate-500">不合格</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {grade.level === 'review' && (
        <div className="card p-5 border-l-4 border-warn-500">
          <div className="flex items-start gap-3">
            <UserCheck size={20} className="text-warn-600 mt-0.5" />
            <div>
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-1">学生使用指引</h3>
              <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
                <li>橙色项表示数据接近临界值（≥ 限量 80%），请不要自行判定为合格。</li>
                <li>请联系配方工程师，在复盘视图核对温度曲线版本、原始行号与图谱。</li>
                <li>工程师确认并给出最终书面意见后，方可作为配方放行依据。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {grade.level === 'reject' && (
        <div className="card p-5 border-l-4 border-fail-500">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-fail-600 mt-0.5" />
            <div>
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-1">不合格处置</h3>
              <ul className="text-sm text-slate-600 space-y-1 list-disc pl-5">
                <li>该批次不得放行，立即启动留样复测流程。</li>
                <li>请切换至配方工程师身份，进入复盘视图追溯温度曲线与原始记录。</li>
                <li>复测建议已在右侧列出，按高优先级项优先执行。</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {grade.level === 'direct' && (
        <div className="card p-5 border-l-4 border-pass-500">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-pass-600 mt-0.5" />
            <div>
              <h3 className="font-serif text-lg font-semibold text-slate-800 mb-1">使用说明</h3>
              <p className="text-sm text-slate-600">
                所有检测项均远低于国家限量标准，可作为学生配方作业参考数据。正式生产放行仍需配方工程师签字确认。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="section-title !text-base mb-3">安全提示</h3>
          <div className="space-y-2 max-h-60 overflow-auto">
            {safetyAlerts.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">暂无</div>
            ) : (
              safetyAlerts.map((a) => (
                <div key={a.id} className="text-sm text-slate-700 border-l-2 border-slate-200 pl-2 py-1">
                  <div className="font-medium">{a.additiveName}</div>
                  <div className="text-xs text-slate-500">{a.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="section-title !text-base mb-3">复测建议</h3>
          <div className="space-y-2 max-h-60 overflow-auto">
            {retestSuggestions.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">暂无</div>
            ) : (
              retestSuggestions.map((r) => (
                <div key={r.id} className="text-sm text-slate-700 border-l-2 border-slate-200 pl-2 py-1">
                  <div className="font-medium">{r.additiveName} · {r.sampleCount} 样</div>
                  <div className="text-xs text-slate-500">{r.reason}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
