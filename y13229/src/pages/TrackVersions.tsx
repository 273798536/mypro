import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { TrackVersion } from '@/types';
import { formatDateTime } from '@/utils/storage';
import {
  Plus,
  Layers,
  Star,
  ArrowLeftRight,
  CheckCircle2,
  User,
  Calendar,
  FileText,
  X,
} from 'lucide-react';

export default function TrackVersions() {
  const versions = useAppStore((s) => s.trackVersions);
  const addTrackVersion = useAppStore((s) => s.addTrackVersion);
  const markVersionLatest = useAppStore((s) => s.markVersionLatest);

  const groups = useMemo(() => {
    const m = new Map<string, TrackVersion[]>();
    versions.forEach((v) => {
      const arr = m.get(v.trackName) ?? [];
      arr.push(v);
      m.set(v.trackName, arr);
    });
    m.forEach((arr) => arr.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1)));
    return Array.from(m.entries());
  }, [versions]);

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const left = versions.find((v) => v.id === leftId);
  const right = versions.find((v) => v.id === rightId);

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    trackName: '',
    versionTag: '',
    changeSummary: '',
    composer: '',
    lyricist: '',
    originalArtist: '',
    workId: '',
    notes: '',
  });
  const user = useAppStore((s) => s.currentUser);

  function submitNew() {
    if (!form.trackName.trim()) return;
    addTrackVersion({
      trackName: form.trackName.trim(),
      versionTag: form.versionTag.trim(),
      uploadedBy: user,
      changeSummary: form.changeSummary.trim() || '新增曲目表版本',
      snapshot: {
        composer: form.composer.trim() || undefined,
        lyricist: form.lyricist.trim() || undefined,
        originalArtist: form.originalArtist.trim() || undefined,
        workId: form.workId.trim() || undefined,
        notes: form.notes.trim() || undefined,
      },
    });
    setForm({
      trackName: '',
      versionTag: '',
      changeSummary: '',
      composer: '',
      lyricist: '',
      originalArtist: '',
      workId: '',
      notes: '',
    });
    setShowAdd(false);
  }

  return (
    <div className="space-y-6">
      <Header onAdd={() => setShowAdd(true)} />

      {showAdd && (
        <div className="theater-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-700">
              上传新版本曲目表
            </h3>
            <button
              onClick={() => setShowAdd(false)}
              className="text-ink-400 hover:text-ink-700"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              className="theater-input"
              placeholder="曲目名称（必填）"
              value={form.trackName}
              onChange={(e) => setForm({ ...form, trackName: e.target.value })}
            />
            <input
              className="theater-input"
              placeholder="版本标记，如 v1.3（不填则自动递增）"
              value={form.versionTag}
              onChange={(e) => setForm({ ...form, versionTag: e.target.value })}
            />
            <input
              className="theater-input"
              placeholder="作曲"
              value={form.composer}
              onChange={(e) => setForm({ ...form, composer: e.target.value })}
            />
            <input
              className="theater-input"
              placeholder="作词"
              value={form.lyricist}
              onChange={(e) => setForm({ ...form, lyricist: e.target.value })}
            />
            <input
              className="theater-input"
              placeholder="原唱"
              value={form.originalArtist}
              onChange={(e) =>
                setForm({ ...form, originalArtist: e.target.value })
              }
            />
            <input
              className="theater-input"
              placeholder="版权工作编号"
              value={form.workId}
              onChange={(e) => setForm({ ...form, workId: e.target.value })}
            />
            <div className="md:col-span-2">
              <textarea
                rows={2}
                className="theater-input resize-none"
                placeholder="本次变更摘要（为什么发新版？）"
                value={form.changeSummary}
                onChange={(e) =>
                  setForm({ ...form, changeSummary: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <textarea
                rows={2}
                className="theater-input resize-none"
                placeholder="备注（合同位置、沟通记录等）"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="theater-btn-primary" onClick={submitNew}>
              <Plus size={14} /> 保存为最新版本
            </button>
          </div>
        </div>
      )}

      {/* 版本对比 */}
      <section className="theater-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <ArrowLeftRight size={16} className="text-amber-500" />
          <h3 className="font-display text-base font-semibold text-ink-700">
            版本快照对比
          </h3>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          <select
            className="theater-select"
            value={leftId ?? ''}
            onChange={(e) => setLeftId(e.target.value || null)}
          >
            <option value="">选择左侧版本…</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.trackName} · {v.versionTag}
              </option>
            ))}
          </select>
          <select
            className="theater-select"
            value={rightId ?? ''}
            onChange={(e) => setRightId(e.target.value || null)}
          >
            <option value="">选择右侧版本…</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.trackName} · {v.versionTag}
              </option>
            ))}
          </select>
        </div>
        {(left || right) && (
          <div className="grid grid-cols-1 gap-3 rounded-lg bg-ink-50 p-3 md:grid-cols-2">
            <VersionSnapshot label="版本 A" v={left} />
            <VersionSnapshot label="版本 B" v={right} />
          </div>
        )}
      </section>

      {/* 曲目分组时间线 */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {groups.map(([trackName, list]) => (
          <div key={trackName} className="theater-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Layers size={16} className="text-ink-500" />
              <h3 className="font-display text-lg font-semibold text-ink-800">
                {trackName}
              </h3>
              <span className="ml-2 text-xs text-ink-400">
                共 {list.length} 个版本
              </span>
            </div>
            <ol className="relative ml-2 space-y-4 border-l-2 border-ink-100 pl-6">
              {list.map((v, i) => (
                <li key={v.id} className="relative">
                  <span
                    className={`absolute -left-[30px] top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow ${
                      v.isLatest
                        ? 'bg-pine-400 animate-breathe'
                        : 'bg-ink-300'
                    }`}
                  >
                    {v.isLatest ? (
                      <Star size={10} className="text-white" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <div
                    className={`rounded-xl border p-4 transition ${
                      v.isLatest
                        ? 'border-pine-300 bg-gradient-to-br from-pine-50 to-white shadow-card'
                        : 'border-ink-100 bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                          v.isLatest
                            ? 'bg-pine-500 text-white'
                            : 'bg-ink-100 text-ink-500'
                        }`}
                      >
                        {v.versionTag}
                      </span>
                      {v.isLatest && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-pine-100 px-2 py-0.5 text-[11px] font-medium text-pine-600">
                          <CheckCircle2 size={11} /> 当前最新
                        </span>
                      )}
                      {!v.isLatest && (
                        <button
                          onClick={() => markVersionLatest(v.id)}
                          className="rounded-full border border-ink-200 bg-white px-2 py-0.5 text-[11px] text-ink-500 transition hover:border-amber-300 hover:text-amber-600"
                        >
                          设为最新版
                        </button>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-ink-400">
                        <User size={11} /> {v.uploadedBy}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-ink-600">
                      {v.changeSummary}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <KV label="作曲" value={v.snapshot.composer} />
                      <KV label="作词" value={v.snapshot.lyricist} />
                      <KV label="原唱" value={v.snapshot.originalArtist} />
                      <KV label="编号" value={v.snapshot.workId} />
                    </div>
                    {v.snapshot.notes && (
                      <p className="mt-2 rounded-md bg-ink-50 p-2 text-[11px] leading-relaxed text-ink-500">
                        <FileText size={11} className="mb-0.5 mr-1 inline" />
                        {v.snapshot.notes}
                      </p>
                    )}
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-400">
                      <Calendar size={10} />
                      {formatDateTime(v.uploadedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium tracking-wider text-amber-500">
          曲目表版本管理
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-ink-800">
          一版一号，最新版有标记
        </h2>
        <p className="mt-1 max-w-xl text-sm text-ink-500">
          再也不怕翻到一份旧说法——每个版本有变更摘要、上传人和时间。
          <b className="text-pine-600">松绿色带星标</b> 的就是当前最新版。
        </p>
      </div>
      <button onClick={onAdd} className="theater-btn-primary">
        <Plus size={16} /> 上传新版本
      </button>
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-ink-400">{label}：</span>
      <span className="text-ink-700">{value || '—'}</span>
    </div>
  );
}

function VersionSnapshot({ label, v }: { label: string; v?: TrackVersion }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3">
      <p className="mb-2 text-[11px] font-semibold tracking-wider text-ink-400">
        {label}
      </p>
      {v ? (
        <>
          <p className="font-medium text-ink-800">
            {v.trackName}{' '}
            <span className="text-xs text-ink-400">{v.versionTag}</span>
          </p>
          <div className="mt-2 space-y-1 text-xs">
            <KV label="作曲" value={v.snapshot.composer} />
            <KV label="作词" value={v.snapshot.lyricist} />
            <KV label="原唱" value={v.snapshot.originalArtist} />
            <KV label="编号" value={v.snapshot.workId} />
          </div>
        </>
      ) : (
        <p className="text-xs text-ink-300">请从上方选择…</p>
      )}
    </div>
  );
}
