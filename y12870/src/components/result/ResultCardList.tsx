import {
  CheckCircle2, AlertTriangle, Ban, Upload, ArrowRightLeft,
  RotateCcw, Search, FileWarning, ChevronRight, Link2,
} from 'lucide-react';
import { useCalcStore } from '@/store/useCalcStore';
import type { ResultItem, ResultStatus, NextActionType, MissingMaterial } from '@/types';
import { renderSourceBackLinks } from '@/utils/sourceLinker';

const STATUS_STYLE: Record<ResultStatus, {
  bg: string; border: string; iconColor: string; icon: any; title: string; tag: string;
}> = {
  AVAILABLE: {
    bg: 'bg-status-available-soft', border: 'border-status-available/30',
    iconColor: 'text-status-available', icon: CheckCircle2, title: '可用', tag: 'status-tag-available',
  },
  DEFERRED: {
    bg: 'bg-status-deferred-soft', border: 'border-status-deferred/30',
    iconColor: 'text-status-deferred', icon: AlertTriangle, title: '暂缓', tag: 'status-tag-deferred',
  },
  RECOLLECT: {
    bg: 'bg-status-recollect-soft', border: 'border-status-recollect/30',
    iconColor: 'text-status-recollect', icon: Ban, title: '需重新采集', tag: 'status-tag-recollect',
  },
};

const ACTION_ICON: Record<NextActionType, any> = {
  upload_material: Upload, unify_unit: ArrowRightLeft,
  recalculate: RotateCcw, recollect: Search, verify: FileWarning,
};

const CATEGORY_LABEL: Record<string, string> = {
  weather: '气象', salinity: '盐度', tide: '潮汐', device: '设备', energy: '能流',
};

export default function ResultCardList() {
  const results = useCalcStore(s => s.results);
  const missing = useCalcStore(s => s.missingMaterials);
  const openUnitModal = useCalcStore(s => s.openUnitModal);

  if (!results.length && !missing.length) {
    return (
      <div className="panel-card p-8 text-center animate-fade-in">
        <div className="text-4xl mb-3 opacity-30">📊</div>
        <div className="text-ocean-700 font-medium">尚无试算结果</div>
        <div className="text-xs text-ocean-500 mt-1">
          请在左侧导入气象、盐度数据，录入设备参数后，系统将自动生成分级结论
        </div>
        <div className="mt-4 inline-flex items-center gap-2 text-xs text-ocean-500 px-3 py-2 rounded bg-ocean-50 border border-dashed border-ocean-200">
          <ChevronRight className="w-3.5 h-3.5" /> 提示：可点击顶部「载入示例」一键体验
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      {missing.length > 0 && (
        <div className="panel-card overflow-hidden">
          <div className="px-4 py-2.5 bg-status-recollect/5 border-b border-status-recollect/20 flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-status-recollect" />
            <span className="font-serif text-sm text-ocean-900 font-semibold">材料缺口清单（下一步操作重点）</span>
            <span className="status-tag-recollect ml-auto">{missing.length} 项</span>
          </div>
          <div className="divide-y divide-slate-100">
            {missing.map(m => <MissingRow key={m.id} m={m} />)}
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {results.map(r => (
          <ResultCard key={r.id} r={r} onUnifyUnit={openUnitModal} />
        ))}
      </div>
    </div>
  );
}

function MissingRow({ m }: { m: MissingMaterial }) {
  const st = STATUS_STYLE[m.severity];
  const Icon = st.icon;
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${st.bg}`}>
        <Icon className={`w-4.5 h-4.5 ${st.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${st.iconColor}`}>[{CATEGORY_LABEL[m.category] || '材料'}]</span>
          <span className="font-medium text-ocean-900 text-sm">{m.name}</span>
          <span className={st.tag}>{st.title}</span>
        </div>
        {m.dateRange && <div className="text-[11px] text-ocean-500 mt-0.5 tabular-nums">时间范围：{m.dateRange}</div>}
        <div className="text-xs text-ocean-700 mt-1 flex items-start gap-1.5">
          <span className="text-status-recollect font-medium shrink-0">影响：</span>
          <span>{m.impact}</span>
        </div>
      </div>
      <button className="btn-primary !py-1.5 !px-3 !text-xs whitespace-nowrap shrink-0">
        <Upload className="w-3.5 h-3.5 inline mr-1" /> 上传补充
      </button>
    </div>
  );
}

function ResultCard({ r, onUnifyUnit }: { r: ResultItem; onUnifyUnit: () => void }) {
  const st = STATUS_STYLE[r.status];
  const Ico = st.icon;
  const ActionIco = r.nextAction ? ACTION_ICON[r.nextAction.type] : null;

  function handleNext() {
    if (!r.nextAction) return;
    if (r.nextAction.type === 'unify_unit') onUnifyUnit();
  }

  return (
    <div className={`panel-card card-hover overflow-hidden border-l-[3px] ${st.border}`}
         style={{ borderLeftColor: r.status === 'AVAILABLE' ? '#0E7C7B' : r.status === 'DEFERRED' ? '#E9A23B' : '#D64045' }}>
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${st.bg} ${st.iconColor}`}>
          <Ico className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] text-ocean-500">[{CATEGORY_LABEL[r.category]}]</span>
            <span className="font-serif font-semibold text-ocean-900 text-sm flex-1 min-w-0 truncate">{r.label}</span>
            <span className={st.tag}>{st.title}</span>
          </div>
          <div className="text-xs text-ocean-700 mt-1 leading-relaxed">
            {r.description}
          </div>
          {r.sourceRefs?.length && (
            <div className="mt-1.5 text-[11px] text-ocean-500 inline-flex items-center gap-1">
              <Link2 className="w-3 h-3 text-ocean-400" />
              <span>来源：{renderSourceBackLinks(r.sourceRefs)}</span>
            </div>
          )}
        </div>
      </div>
      {r.nextAction && (
        <div className="px-4 py-2.5 bg-ocean-50/70 border-t border-ocean-100 flex items-center gap-3">
          {ActionIco && <ActionIco className={`w-4 h-4 shrink-0 ${st.iconColor}`} />}
          <div className="flex-1 min-w-0">
            <div className={`text-xs font-medium ${st.iconColor}`}>
              ▶ 下一步：{r.nextAction.label}
            </div>
            {r.nextAction.hint && <div className="text-[11px] text-ocean-600 mt-0.5">{r.nextAction.hint}</div>}
          </div>
          <button
            className={`${
              r.status === 'RECOLLECT' ? 'btn-danger' : r.status === 'DEFERRED' ? 'btn-primary' : 'btn-secondary'
            } !py-1.5 !px-3 !text-xs whitespace-nowrap shrink-0`}
            onClick={handleNext}
          >
            立即处理
          </button>
        </div>
      )}
    </div>
  );
}
