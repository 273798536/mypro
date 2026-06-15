import { useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  MessageSquarePlus,
  CheckCircle2,
  Unlock,
  History,
  GitBranch,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Camera,
  Zap,
} from 'lucide-react';
import {
  Note,
  NoteSourceType,
  NOTE_SOURCE_LABEL,
  Screenshot,
  SplitRecord,
  SplitStatus,
  STATUS_LABEL,
  TrackVersion,
  TraceNode,
  INFLUENCE_LABEL,
} from '@/types';
import { useAppStore } from '@/store/appStore';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime, isAuthExpired } from '@/utils/storage';
import { getLatestVersion } from '@/utils/reason';

const sourceChipClass: Record<NoteSourceType, string> = {
  old_version: 'bg-ink-100 text-ink-600',
  manual_add: 'bg-pine-100 text-pine-600',
  verbal: 'bg-amber-100 text-amber-700',
};

const influenceChipClass: Record<TraceNode['influenceType'], string> = {
  old_version: 'bg-ink-100 text-ink-600',
  manual_add: 'bg-pine-100 text-pine-600',
  verbal: 'bg-amber-100 text-amber-700',
  system_check: 'bg-rouge-100 text-rouge-600',
};

interface Props {
  open: boolean;
  record: SplitRecord;
  version?: TrackVersion;
  latestVersion?: TrackVersion;
  onClose: () => void;
}

export default function DetailDrawer({
  open,
  record,
  version,
  latestVersion,
  onClose,
}: Props) {
  const notes = useAppStore((s) =>
    s.notes.filter((n) => n.splitRecordId === record.id)
  );
  const shots = useAppStore((s) =>
    s.screenshots.filter((s2) => s2.splitRecordId === record.id)
  );
  const traces = useAppStore((s) =>
    s.traceNodes
      .filter((t) => t.splitRecordId === record.id)
      .sort((a, b) => a.orderIndex - b.orderIndex)
  );
  const versions = useAppStore((s) => s.trackVersions);
  const updateSplitRecord = useAppStore((s) => s.updateSplitRecord);
  const confirmAligned = useAppStore((s) => s.confirmAligned);
  const unlockSuspended = useAppStore((s) => s.unlockSuspended);
  const markVersionLatest = useAppStore((s) => s.markVersionLatest);
  const addNote = useAppStore((s) => s.addNote);
  const addScreenshot = useAppStore((s) => s.addScreenshot);

  const [noteContent, setNoteContent] = useState('');
  const [noteSource, setNoteSource] = useState<NoteSourceType>('manual_add');
  const [shotDesc, setShotDesc] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('接手同事');
  const expired = isAuthExpired(record.authExpiryDate);
  const isSuspended = record.status === 'suspended';

  const sameTrackVersions = versions
    .filter((v) => v.trackName === version?.trackName)
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const ratioSum =
    Number(record.artistRatio) +
    Number(record.venueRatio) +
    Number(record.distributionRatio);
  const ratioValid = ratioSum === 100;

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(f);
  }

  function onUploadShot() {
    if (!previewUrl) return;
    addScreenshot(record.id, shotDesc || '截图说明', previewUrl);
    setPreviewUrl(null);
    setShotDesc('');
    if (fileRef.current) fileRef.current.value = '';
  }

  function onAddNote() {
    if (!noteContent.trim()) return;
    addNote(record.id, noteSource, noteContent.trim());
    setNoteContent('');
  }

  function onConfirmRatio() {
    if (expired) return;
    confirmAligned(record.id);
  }

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-ink-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 h-full w-full max-w-[560px] animate-slidein border-l border-ink-100 bg-ink-50 shadow-pop">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-ink-100 bg-white px-6 py-4">
            <div>
              <p className="text-xs text-ink-400">返场曲分账详情</p>
              <h2 className="font-display text-lg font-semibold text-ink-800">
                {version?.trackName ?? '未知曲目'} · {record.performanceName}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {/* 顶部摘要卡 */}
            <div className="space-y-4 p-5">
              <div
                className={`rounded-xl border p-4 shadow-card ${
                  expired
                    ? 'border-rouge-200 bg-rouge-50'
                    : !ratioValid
                    ? 'border-rattan-200 bg-rattan-50'
                    : 'border-pine-200 bg-pine-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={record.status} />
                      {expired && (
                        <span className="theater-chip bg-rouge-200/60 text-rouge-600">
                          <ShieldAlert size={12} /> 授权已到期
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">
                      <Sparkles size={12} className="mb-0.5 mr-1 inline text-amber-500" />
                      {record.humanReason || '暂无异常说明'}
                    </p>
                  </div>
                  {!ratioValid && (
                    <AlertCircle
                      size={20}
                      className="mt-1 shrink-0 text-rattan-500"
                    />
                  )}
                </div>
              </div>

              {/* 版本快照 */}
              <Section icon={<History size={14} />} title="曲目版本快照">
                <div className="space-y-2">
                  {sameTrackVersions.map((v) => {
                    const isCurrent = v.id === record.trackVersionId;
                    return (
                      <div
                        key={v.id}
                        className={`rounded-lg border p-3 transition ${
                          isCurrent
                            ? 'border-pine-300 bg-white ring-2 ring-pine-400/20 animate-breathe'
                            : 'border-ink-100 bg-white/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                              v.isLatest
                                ? 'bg-pine-100 text-pine-600'
                                : 'bg-ink-100 text-ink-500'
                            }`}
                          >
                            {v.versionTag}
                          </span>
                          {v.isLatest && (
                            <span className="text-[10px] font-medium text-pine-500">
                              最新版
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] font-medium text-amber-600">
                              当前引用
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-ink-400">
                            {formatDateTime(v.uploadedAt)} · {v.uploadedBy}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-ink-500">
                          {v.changeSummary}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-ink-600">
                          <div>作曲：{v.snapshot.composer ?? '—'}</div>
                          <div>作词：{v.snapshot.lyricist ?? '—'}</div>
                          <div>原唱：{v.snapshot.originalArtist ?? '—'}</div>
                          <div>编号：{v.snapshot.workId ?? '—'}</div>
                        </div>
                        {!v.isLatest && (
                          <button
                            onClick={() => markVersionLatest(v.id)}
                            className="mt-2 text-[11px] font-medium text-ink-400 underline-offset-2 transition hover:text-pine-600 hover:underline"
                          >
                            标记为最新版（需二次确认）
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>

              {/* 分账比例编辑 */}
              <Section icon={<Zap size={14} />} title="分账比例 & 授权">
                <div className="grid grid-cols-3 gap-3">
                  <RatioField
                    label="艺人比例"
                    value={record.artistRatio}
                    disabled={isSuspended}
                    onChange={(v) =>
                      updateSplitRecord(record.id, { artistRatio: v }, '调整艺人比例')
                    }
                  />
                  <RatioField
                    label="剧场比例"
                    value={record.venueRatio}
                    disabled={isSuspended}
                    onChange={(v) =>
                      updateSplitRecord(record.id, { venueRatio: v }, '调整剧场比例')
                    }
                  />
                  <RatioField
                    label="发行比例"
                    value={record.distributionRatio}
                    disabled={isSuspended}
                    onChange={(v) =>
                      updateSplitRecord(
                        record.id,
                        { distributionRatio: v },
                        '调整发行比例'
                      )
                    }
                  />
                </div>
                <div
                  className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                    ratioValid
                      ? 'bg-pine-100/60 text-pine-700'
                      : 'bg-rattan-100/70 text-rattan-600'
                  }`}
                >
                  <span>合计：</span>
                  <span className="font-semibold tabular-nums">{ratioSum}%</span>
                  <span className="ml-auto">
                    {ratioValid ? '比例合计正确 ✓' : '应当为 100%，请检查'}
                  </span>
                </div>
                <div className="mt-3 rounded-lg border border-ink-100 bg-white p-3">
                  <label className="mb-1 block text-xs font-medium text-ink-500">
                    授权到期日
                  </label>
                  <input
                    type="date"
                    disabled={isSuspended}
                    value={record.authExpiryDate.slice(0, 10)}
                    onChange={(e) =>
                      updateSplitRecord(
                        record.id,
                        { authExpiryDate: e.target.value },
                        '更新授权到期日'
                      )
                    }
                    className="theater-input"
                  />
                </div>
              </Section>

              {/* 人工备注 */}
              <Section icon={<MessageSquarePlus size={14} />} title="人工备注（带来源）">
                <div className="mb-3 rounded-lg border border-ink-100 bg-white p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {(['manual_add', 'verbal', 'old_version'] as NoteSourceType[]).map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() => setNoteSource(t)}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            noteSource === t
                              ? `${sourceChipClass[t]} ring-1 ring-ink-200`
                              : 'bg-white text-ink-400 hover:text-ink-700'
                          }`}
                        >
                          {NOTE_SOURCE_LABEL[t]}
                        </button>
                      )
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="记录你要补充的备注，系统会根据类型打上来源标签"
                    className="theater-input resize-none"
                  />
                  <button
                    onClick={onAddNote}
                    disabled={!noteContent.trim()}
                    className="mt-2 theater-btn-primary text-xs"
                  >
                    <MessageSquarePlus size={14} /> 添加备注
                  </button>
                </div>
                <div className="space-y-2">
                  {notes.length === 0 && (
                    <p className="rounded-lg border border-dashed border-ink-200 p-3 text-center text-xs text-ink-400">
                      暂无备注，从上面加一条吧
                    </p>
                  )}
                  {notes.map((n) => (
                    <NoteCard key={n.id} note={n} />
                  ))}
                </div>
              </Section>

              {/* 截图说明 */}
              <Section icon={<Camera size={14} />} title="截图说明">
                <div className="mb-3 rounded-lg border border-ink-100 bg-white p-3">
                  <input
                    type="text"
                    value={shotDesc}
                    onChange={(e) => setShotDesc(e.target.value)}
                    placeholder="这张截图是啥？如：法务邮件确认截图"
                    className="theater-input mb-2"
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={onPickFile}
                    className="block w-full text-xs text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-600"
                  />
                  {previewUrl && (
                    <div className="mt-3">
                      <img
                        src={previewUrl}
                        alt="预览"
                        className="max-h-40 w-full rounded-lg border border-ink-100 object-cover"
                      />
                      <button
                        onClick={onUploadShot}
                        className="mt-2 theater-btn-amber text-xs"
                      >
                        <Upload size={14} /> 上传到本记录
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {shots.length === 0 && (
                    <p className="col-span-2 rounded-lg border border-dashed border-ink-200 p-3 text-center text-xs text-ink-400">
                      还没有截图
                    </p>
                  )}
                  {shots.map((s) => (
                    <ScreenshotCard key={s.id} shot={s} />
                  ))}
                </div>
              </Section>

              {/* 影响溯源链 */}
              <Section icon={<GitBranch size={14} />} title="结论影响链（谁影响了结论）">
                <ol className="relative ml-2 space-y-3 border-l border-ink-100 pl-5">
                  {traces.length === 0 && (
                    <p className="text-xs text-ink-400">暂无影响记录</p>
                  )}
                  {traces.map((t, i) => (
                    <li key={t.id} className="relative">
                      <span
                        className={`absolute -left-[30px] top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${influenceChipClass[t.influenceType]}`}
                      >
                        {i + 1}
                      </span>
                      <div className="rounded-lg border border-ink-100 bg-white p-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`theater-chip ${influenceChipClass[t.influenceType]}`}
                          >
                            {INFLUENCE_LABEL[t.influenceType]}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-700">
                          {t.description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="border-t border-ink-100 bg-white/80 p-4 backdrop-blur">
            {isSuspended ? (
              <div className="rounded-lg border border-rouge-200 bg-rouge-50 p-3">
                <p className="text-xs font-medium text-rouge-600">
                  <ShieldAlert size={14} className="mb-0.5 mr-1 inline" />
                  本记录已因授权到期挂起。如需继续，请让接手同事确认后解锁：
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    className="theater-input flex-1"
                    placeholder="接手同事姓名"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                  />
                  <button
                    className="theater-btn-amber text-xs"
                    disabled={!confirmText.trim()}
                    onClick={() => unlockSuspended(record.id, confirmText.trim())}
                  >
                    <Unlock size={14} /> 解锁为待确认
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-rouge-500/80">
                  宁可挂起，也不给出假稳定结论。
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-xs text-ink-400">
                  {record.confirmedBy ? (
                    <>
                      已由 <b className="text-ink-600">{record.confirmedBy}</b> 于{' '}
                      {formatDateTime(record.confirmedAt)} 确认
                    </>
                  ) : (
                    '核对完毕后一键确认对齐'
                  )}
                </div>
                <button
                  onClick={onConfirmRatio}
                  disabled={expired || !ratioValid}
                  className="ml-auto theater-btn-primary text-xs"
                >
                  <CheckCircle2 size={14} /> 人工确认对齐
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="theater-card p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-700">
        <span className="text-amber-500">{icon}</span>
        {title}
      </h4>
      {children}
    </section>
  );
}

function RatioField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          max={100}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="theater-input pr-8 tabular-nums"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-400">
          %
        </span>
      </div>
    </label>
  );
}

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className={`theater-chip ${sourceChipClass[note.sourceType]}`}>
          {NOTE_SOURCE_LABEL[note.sourceType]}
        </span>
        <span className="text-[11px] text-ink-400">
          {note.createdBy} · {formatDateTime(note.createdAt)}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-700">{note.content}</p>
    </div>
  );
}

function ScreenshotCard({ shot }: { shot: Screenshot }) {
  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
      <img
        src={shot.dataUrl}
        alt={shot.description}
        className="h-28 w-full object-cover"
      />
      <div className="p-2">
        <p className="text-xs font-medium text-ink-700">{shot.description}</p>
        <p className="mt-0.5 text-[10px] text-ink-400">
          {formatDateTime(shot.createdAt)}
        </p>
      </div>
    </div>
  );
}
