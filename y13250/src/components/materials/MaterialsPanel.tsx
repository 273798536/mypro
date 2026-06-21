import { useMemo, useState } from 'react';
import { useStore, type NewMaterialInput } from '@/store';
import { MaterialCard } from './MaterialCard';
import {
  Search,
  Package,
  Filter,
  Plus,
  FileText,
  MessageSquare,
  Mic,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import type { MaterialSource } from '@/types';
import { sourceMeta } from '../common/StatusBadge';
import { cn } from '@/lib/utils';

const FILTERS: Array<{ key: MaterialSource | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'resident_feedback', label: '💬 居民反馈' },
  { key: 'written', label: '📄 书面' },
  { key: 'verbal', label: '🗣️ 口头' },
];

type SourceOption = {
  key: MaterialSource;
  label: string;
  hint: string;
  icon: typeof MessageSquare;
  placeholderTitle: string;
  placeholderContent: string;
  placeholderMentions: string;
};

const SOURCE_OPTIONS: SourceOption[] = [
  {
    key: 'resident_feedback',
    label: '居民反馈',
    hint: '居民群、电话、12345 转办等',
    icon: MessageSquare,
    placeholderTitle: '如：6/20 居民群反馈-南门摊位争议',
    placeholderContent: '粘贴原文或摘要：例如「居民反映南门小吃街和外摆区名字乱，有两拨人争位置」',
    placeholderMentions: '每行一个点位名称，如：\n人民广场南门小吃街\n广场南门外摆小吃区',
  },
  {
    key: 'written',
    label: '书面材料',
    hint: '点位清单、会议纪要、正式方案等',
    icon: FileText,
    placeholderTitle: '如：书面-XX路点位清单 v1',
    placeholderContent: '粘贴书面材料内容或填写主要描述',
    placeholderMentions: '每行一个，如：\n文化路东风路口东北角外摆',
  },
  {
    key: 'verbal',
    label: '口头说明',
    hint: '领导/主管/同事口头告知',
    icon: Mic,
    placeholderTitle: '如：口头说明-张主任补录 XX 点位',
    placeholderContent: '口头说明要点：谁说的、说了什么（例如「李主管确认西关两个名字是同一个地方」）',
    placeholderMentions: '每行一个，如：\n老城西关美食城外摆\n老城美食城出入口点位',
  },
];

type ToastKind = 'ok' | 'warn';
type Toast = { kind: ToastKind; title: string; detail?: string } | null;

export function MaterialsPanel() {
  const materials = useStore(s => s.materials);
  const addMaterial = useStore(s => s.addMaterial);
  const [kw, setKw] = useState('');
  const [flt, setFlt] = useState<MaterialSource | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{
    source: MaterialSource;
    title: string;
    content: string;
    mentions: string;
    changeNote: string;
    uploader: string;
    updateExistingId: string | null;
  }>({
    source: 'resident_feedback',
    title: '',
    content: '',
    mentions: '',
    changeNote: '',
    uploader: '社区运营-阿宁',
    updateExistingId: null,
  });
  const [toast, setToast] = useState<Toast>(null);
  const [submitting, setSubmitting] = useState(false);

  const list = useMemo(
    () =>
      materials.filter(m => {
        if (flt !== 'all' && m.source !== flt) return false;
        if (!kw.trim()) return true;
        const q = kw.trim();
        const ptNames = useStore.getState().points;
        return (
          m.title.includes(q) ||
          m.relatedPointIds.some(pid => ptNames.find(p => p.id === pid)?.name.includes(q))
        );
      }),
    [materials, kw, flt],
  );

  const caliberCount = materials.filter(m => m.caliberChanged).length;

  const srcOpt = SOURCE_OPTIONS.find(s => s.key === form.source)!;

  const resetForm = () => {
    setForm({
      source: 'resident_feedback',
      title: '',
      content: '',
      mentions: '',
      changeNote: '',
      uploader: '社区运营-阿宁',
      updateExistingId: null,
    });
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const pointMentions = form.mentions
      .split(/[\n,，、;；]/)
      .map(s => s.trim())
      .filter(Boolean);

    const payload: NewMaterialInput = {
      title: form.title.trim(),
      source: form.source,
      uploader: form.uploader.trim() || '社区运营-阿宁',
      content: form.content.trim(),
      changeNote: form.changeNote.trim(),
      pointMentions,
      updateExistingMaterialId: form.updateExistingId || undefined,
    };

    setSubmitting(true);
    await new Promise(r => setTimeout(r, 350));
    const r = addMaterial(payload);
    setSubmitting(false);

    if (r.materialId) {
      const title2 = form.updateExistingId ? '材料版本已更新' : '材料已录入';
      const lines: string[] = [];
      if (r.createdPointIds.length > 0) {
        lines.push(`自动生成 ${r.createdPointIds.length} 个新点位`);
      }
      if (r.isCaliberChanged) {
        lines.push('⚠️ 检测到口径变更，已打异常并弹出版本对比');
      }
      lines.push('归并算法已自动重跑');
      setToast({ kind: r.isCaliberChanged ? 'warn' : 'ok', title: title2, detail: lines.join('，') });
      if (!form.updateExistingId) resetForm();
      setShowForm(false);
      setTimeout(() => setToast(null), 4200);
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-bg-card/70 rounded-xl border border-border overflow-hidden animate-fade-in relative"
      style={{ animationDelay: '380ms' }}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1 h-5 rounded-full bg-accent-export shrink-0" />
          <h2 className="text-base font-bold tracking-wide">材料区</h2>
          <span className="text-[11px] px-2 py-0.5 rounded bg-bg-hover text-text-muted font-mono">
            {materials.length} 份
          </span>
          {caliberCount > 0 && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-accent-caliber/15 text-accent-caliber border border-accent-caliber/30">
              {caliberCount} 份改口径
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              resetForm();
              setShowForm(v => !v);
            }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all border',
              showForm
                ? 'bg-accent-export text-bg border-accent-export'
                : 'bg-accent-export/15 text-accent-export border-accent-export/40 hover:bg-accent-export/25',
            )}
            title="把阿宁丢过来的居民反馈、书面、口头材料录入系统"
          >
            <Plus className="w-3.5 h-3.5" />
            {showForm ? '收起表单' : '+ 新增材料'}
          </button>
          <Package className="w-4 h-4 text-text-dim shrink-0" />
        </div>
      </div>

      {showForm && (
        <div className="border-b border-border bg-gradient-to-b from-accent-export/[0.07] to-transparent px-4 py-3 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-semibold text-text flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-export" />
              阿宁丢材料过来：选择来源 → 填标题/内容 → 列点位名称（每行一个）→ 系统自动生成点位 + 打异常 + 重跑归并
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-text-dim hover:text-text p-1 rounded hover:bg-bg-hover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SOURCE_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = form.source === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setForm(f => ({ ...f, source: opt.key }))}
                  className={cn(
                    'flex flex-col items-start gap-0.5 p-2 rounded-lg border text-left transition-all',
                    active
                      ? 'bg-bg border-accent-export text-accent-export shadow-[0_0_0_1px_rgba(6,182,212,0.55)]'
                      : 'bg-bg-card/50 border-border text-text-muted hover:text-text hover:border-soft',
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </div>
                  <div className="text-[10px] text-text-dim leading-tight">{opt.hint}</div>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">标题</span>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={srcOpt.placeholderTitle}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">上传人</span>
              <input
                value={form.uploader}
                onChange={e => setForm(f => ({ ...f, uploader: e.target.value }))}
                placeholder="社区运营-阿宁"
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">材料正文</span>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              rows={3}
              placeholder={srcOpt.placeholderContent}
              className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim resize-y min-h-[72px]"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase tracking-wider">
                点位名称（每行一个）
              </span>
              <textarea
                value={form.mentions}
                onChange={e => setForm(f => ({ ...f, mentions: e.target.value }))}
                rows={3}
                placeholder={srcOpt.placeholderMentions}
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim resize-y font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted uppercase tracking-wider">
                  修改说明
                </span>
                <label className="flex items-center gap-1 text-[10px] text-text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!form.updateExistingId}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        updateExistingId: e.target.checked ? (materials[0]?.id ?? null) : null,
                      }))
                    }
                    className="w-3 h-3"
                  />
                  更新已有材料版本
                </label>
              </div>
              <textarea
                value={form.changeNote}
                onChange={e => setForm(f => ({ ...f, changeNote: e.target.value }))}
                rows={2}
                placeholder={
                  form.updateExistingId
                    ? '如：按 6/20 领导会议精神修改口径'
                    : '选填：初版录入、居民反馈整理等'
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-md bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim resize-y"
              />
              {form.updateExistingId && (
                <select
                  value={form.updateExistingId || ''}
                  onChange={e => setForm(f => ({ ...f, updateExistingId: e.target.value || null }))}
                  className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-bg border border-border focus:border-soft focus:outline-none text-text"
                >
                  <option value="">请选择要更新的已有材料</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      [{sourceMeta[m.source].label}] {m.title}（当前 v{m.currentVersion}）
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[10px] text-text-dim leading-snug">
              系统会自动：①按点位名称建档 ②检测相邻路口并挂起 ③对比新版本改口径并打异常 ④触发归并重跑
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={resetForm}
                className="px-2.5 py-1.5 rounded-md text-[11px] text-text-muted hover:text-text hover:bg-bg-hover border border-border"
              >
                清空
              </button>
              <button
                onClick={submit}
                disabled={!form.title.trim() || !form.content.trim() || submitting}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all border',
                  !form.title.trim() || !form.content.trim()
                    ? 'bg-bg-hover text-text-dim border-border cursor-not-allowed'
                    : 'bg-accent-export text-bg border-accent-export hover:brightness-110',
                )}
              >
                {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                {form.updateExistingId ? '📝 更新为新版本' : '✅ 丢进来 · 自动归并'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={cn(
            'absolute left-3 right-3 top-[56px] z-20 rounded-lg border px-3 py-2 shadow-lg animate-fade-in flex items-start gap-2',
            toast.kind === 'ok'
              ? 'bg-accent-normal/15 border-accent-normal/40 text-text'
              : 'bg-accent-pending/15 border-accent-caliber/50 text-text',
          )}
        >
          {toast.kind === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-accent-normal shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-accent-caliber shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold">{toast.title}</div>
            {toast.detail && <div className="text-[11px] text-text-muted leading-tight mt-0.5">{toast.detail}</div>}
          </div>
          <button onClick={() => setToast(null)} className="text-text-dim hover:text-text">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={kw}
            onChange={e => setKw(e.target.value)}
            placeholder="搜材料标题 / 点位名称…"
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-bg border border-border focus:border-soft focus:outline-none text-text placeholder:text-text-dim"
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <Filter className="w-3 h-3 text-text-dim shrink-0" />
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFlt(f.key)}
              className={cn(
                'shrink-0 px-2 py-1 text-[11px] rounded-md transition-colors whitespace-nowrap',
                flt === f.key
                  ? 'bg-accent-export/20 text-accent-export border border-accent-export/40'
                  : 'text-text-muted hover:text-text hover:bg-bg-hover',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {list.length === 0 && (
          <div className="text-center py-10 text-text-dim text-sm">
            {materials.length === 0 ? '还没有材料，点右上角「+ 新增材料」开始' : '无匹配材料'}
          </div>
        )}
        {list.map(m => (
          <MaterialCard key={m.id} materialId={m.id} />
        ))}
      </div>

      <div className="px-3 py-2 border-t border-border text-[10px] text-text-dim leading-relaxed flex items-center justify-between">
        <div className="flex items-center gap-1">
          {showForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          点「+ 新增材料」把居民反馈 / 书面 / 口头丢进来；点卡片右上角 🔀 对比改口径前后版本。
        </div>
      </div>
    </div>
  );
}
