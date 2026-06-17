import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  MessageSquareWarning,
  Camera,
  GitBranch,
  Send,
  ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useRampStore } from '@/store';
import { cn } from '@/lib/utils';
import { fmtDateTime, relativeDay, statusMeta } from '@/lib/ui';
import { RampMap } from '@/components/RampMap';
import { Timeline } from '@/components/Timeline';
import { OverrideTag, SourceBadge, StatusChip } from '@/components/badges';
import type { RampDetail, RampStatus } from '@shared/types';

type Tab = 'feedback' | 'photo' | 'override';

export default function RampDetail() {
  const { id = '' } = useParams();
  const showToast = useRampStore((s) => s.showToast);
  const fetchRamps = useRampStore((s) => s.fetchRamps);
  const [detail, setDetail] = useState<RampDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('feedback');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setDetail(await api.getRamp(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !detail) {
    return <div className="rounded-xl border border-line bg-surface p-12 text-center text-sm text-muted">加载中…</div>;
  }
  if (error || !detail) {
    return (
      <div className="rounded-xl border border-status-overridden/30 bg-status-overridden/5 p-12 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-status-overridden" />
        <p className="mt-2 text-sm text-status-overridden">{error ?? '坡道不存在'}</p>
        <Link to="/" className="btn mt-4">返回清单</Link>
      </div>
    );
  }

  const { ramp, items, changeLogs, feedbackNotes } = detail;
  const photoItems = items.filter((it) => it.source === 'on_site_photo');

  const afterChange = async (msg: string) => {
    showToast(msg);
    await load();
    void fetchRamps();
  };

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        返回公示清单
      </Link>

      {/* header */}
      <div className={cn('rounded-xl border bg-surface p-5 shadow-card', ramp.isOverriding ? 'border-signal/40' : 'border-line')}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{ramp.name}</h1>
              <StatusChip status={ramp.status} />
              <OverrideTag active={ramp.isOverriding} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted">
              <span>{ramp.bridgeName}</span>
              <span>· {ramp.address}</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ramp.lat.toFixed(4)}, {ramp.lng.toFixed(4)}
              </span>
            </div>
          </div>
          <div className="flex gap-4 text-right">
            <Stat label="改判次数" value={ramp.changeCount} />
            <Stat label="材料/照片" value={items.length} />
            <Stat label="居民反馈" value={feedbackNotes.length} />
          </div>
        </div>

        {ramp.lastChangeSource && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-accent">最近改判</span>
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <SourceBadge source={ramp.lastChangeSource} />
                <span className="font-mono text-[11px] text-muted">
                  {fmtDateTime(ramp.lastChangeAt)} · {relativeDay(ramp.lastChangeAt)}
                </span>
              </div>
              {ramp.lastAffected && (
                <p className="mt-1 text-[13px] text-ink/80">{ramp.lastAffected}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* left: timeline + items */}
        <div className="space-y-5">
          <section>
            <SectionTitle title="改判时间线" sub="来源 · 前后状态 · 改变了哪些判断" />
            <Timeline logs={changeLogs} />
          </section>

          <section>
            <SectionTitle title="材料与现场照片" sub={`${items.length} 项`} />
            {items.length === 0 ? (
              <Empty text="暂无材料" />
            ) : (
              <ul className="space-y-2">
                {items.map((it) => (
                  <li key={it.id} className="rounded-lg border border-line bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {it.source === 'on_site_photo' ? (
                          <ImageIcon className="h-4 w-4 text-accent" />
                        ) : null}
                        <span className="font-medium">{it.title}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <SourceBadge source={it.source} />
                        <span className="font-mono text-[11px] text-muted">
                          {fmtDateTime(it.submittedAt)}
                        </span>
                      </div>
                    </div>
                    {it.content && <p className="mt-1.5 text-sm text-ink/80">{it.content}</p>}
                    {it.photoUrl && (
                      <img
                        src={it.photoUrl}
                        alt={it.title}
                        className="mt-2 h-32 w-full rounded-md border border-line object-cover"
                        loading="lazy"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {feedbackNotes.length > 0 && (
            <section>
              <SectionTitle title="居民反馈备注" sub={`${feedbackNotes.length} 条`} />
              <ul className="space-y-2">
                {feedbackNotes.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'rounded-lg border p-3',
                      n.isGrayscale ? 'border-signal/40 bg-signal/[0.06]' : 'border-line bg-surface',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquareWarning className="h-4 w-4 text-signal" />
                      <span className="text-sm">{n.content}</span>
                      {n.isGrayscale && (
                        <span className="chip border-signal/40 bg-signal/10 font-mono text-[10px] text-signal">
                          灰度
                        </span>
                      )}
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-muted">{fmtDateTime(n.createdAt)}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* right: map + actions */}
        <div className="space-y-5">
          <section>
            <SectionTitle title="地图点位" sub="标注补录与覆盖" />
            <RampMap ramps={[ramp]} focusedId={ramp.id} className="min-h-[260px]" />
            {photoItems.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                本次现场照片补录 {photoItems.length} 张，改判记录已说明改了什么。
              </p>
            )}
          </section>

          <section>
            <SectionTitle title="补录与改判" sub="每次操作都写来源与影响判断" />
            <div className="rounded-xl border border-line bg-surface">
              <div className="grid grid-cols-3 border-b border-line">
                <TabBtn active={tab === 'feedback'} onClick={() => setTab('feedback')} icon={<MessageSquareWarning className="h-3.5 w-3.5" />}>
                  居民反馈
                </TabBtn>
                <TabBtn active={tab === 'photo'} onClick={() => setTab('photo')} icon={<Camera className="h-3.5 w-3.5" />}>
                  现场照片
                </TabBtn>
                <TabBtn active={tab === 'override'} onClick={() => setTab('override')} icon={<GitBranch className="h-3.5 w-3.5" />}>
                  人工改判
                </TabBtn>
              </div>
              <div className="p-3">
                {tab === 'feedback' && <FeedbackForm rampId={ramp.id} onDone={afterChange} />}
                {tab === 'photo' && <PhotoForm rampId={ramp.id} onDone={afterChange} />}
                {tab === 'override' && <OverrideForm rampId={ramp.id} current={ramp.status} onDone={afterChange} />}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold text-ink">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      {sub && <span className="font-mono text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-center text-sm text-muted">{text}</div>;
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors',
        active ? 'border-b-2 border-accent text-accent' : 'text-muted hover:text-ink',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}

const OPERATOR = '阿宁';

function FeedbackForm({
  rampId,
  onDone,
}: {
  rampId: string;
  onDone: (msg: string) => void;
}) {
  const [content, setContent] = useState('');
  const [affected, setAffected] = useState('');
  const [grayscale, setGrayscale] = useState(true);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!content.trim()) return;
    setBusy(true);
    try {
      const r = await api.addFeedback(rampId, {
        content: content.trim(),
        isGrayscale: grayscale,
        affectsRamps: [rampId],
        affectedSummary: affected.trim() || `居民反馈改判为「待补材料」，需复核`,
        operator: OPERATOR,
      });
      setContent('');
      setAffected('');
      onDone(r.message);
    } catch (e) {
      onDone(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <Field label="反馈内容">
        <textarea className="field min-h-[64px]" value={content} onChange={(e) => setContent(e.target.value)} placeholder="如：坡道夜间无照明、雨天积水…" />
      </Field>
      <Field label="改变了哪些判断">
        <input className="field" value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="如：由已处理改为待补材料，需补排水方案" />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={grayscale} onChange={(e) => setGrayscale(e.target.checked)} className="h-4 w-4 accent-[#0F4C5C]" />
        灰度发布前临时补录
      </label>
      <button className="btn btn-primary w-full" onClick={submit} disabled={busy || !content.trim()}>
        <Send className="h-4 w-4" />
        提交反馈（写改判记录）
      </button>
    </div>
  );
}

function PhotoForm({
  rampId,
  onDone,
}: {
  rampId: string;
  onDone: (msg: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [note, setNote] = useState('');
  const [affected, setAffected] = useState('');
  const [status, setStatus] = useState<RampStatus>('pending');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const r = await api.addPhoto(rampId, {
        title: title.trim(),
        content: note.trim(),
        photoUrl: photoUrl.trim() || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=on%20site%20photo%20of%20a%20pedestrian%20bridge%20ramp%20detail&image_size=landscape_4_3',
        note: note.trim() || '现场照片补录',
        affectedSummary: affected.trim() || '现场照片补录，坡道状态需据此复核',
        operator: OPERATOR,
        newStatus: status,
      });
      setTitle('');
      setPhotoUrl('');
      setNote('');
      setAffected('');
      onDone(r.message);
    } catch (e) {
      onDone(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <Field label="照片标题">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：东侧扶手松动" />
      </Field>
      <Field label="照片地址（可选）">
        <input className="field" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <Field label="补录说明 / 改变了哪些判断">
        <input className="field" value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="如：照片补录确认扶手松动，改为待补材料" />
      </Field>
      <Field label="改判后状态">
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value as RampStatus)}>
          <option value="pending">待补材料</option>
          <option value="processed">已处理</option>
          <option value="overridden">人工改判</option>
        </select>
      </Field>
      <button className="btn btn-primary w-full" onClick={submit} disabled={busy || !title.trim()}>
        <Camera className="h-4 w-4" />
        补录照片（写改判记录）
      </button>
    </div>
  );
}

function OverrideForm({
  rampId,
  current,
  onDone,
}: {
  rampId: string;
  current: RampStatus;
  onDone: (msg: string) => void;
}) {
  const [status, setStatus] = useState<RampStatus>(current === 'overridden' ? 'pending' : 'overridden');
  const [note, setNote] = useState('');
  const [affected, setAffected] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api.addChange(rampId, {
        source: 'manual_override',
        newStatus: status,
        note: note.trim() || '人工改判',
        affectedSummary: affected.trim() || `人工改判为「${statusMeta[status].label}」`,
        operator: OPERATOR,
      });
      setNote('');
      setAffected('');
      onDone(r.message);
    } catch (e) {
      onDone(e instanceof Error ? e.message : '提交失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <Field label="改判为">
        <select className="field" value={status} onChange={(e) => setStatus(e.target.value as RampStatus)}>
          <option value="pending">待补材料</option>
          <option value="overridden">人工改判</option>
          <option value="processed">已处理</option>
        </select>
      </Field>
      <Field label="改判原因">
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="如：坡比不达标，负责人核定" />
      </Field>
      <Field label="改变了哪些判断">
        <input className="field" value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="如：由已处理改为人工改判" />
      </Field>
      <button className="btn btn-signal w-full" onClick={submit} disabled={busy}>
        <GitBranch className="h-4 w-4" />
        提交人工改判
      </button>
    </div>
  );
}
