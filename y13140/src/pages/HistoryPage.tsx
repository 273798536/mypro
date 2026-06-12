import { useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronDown,
  Paperclip,
  ImagePlus,
  Plus,
  StickyNote,
  User,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAppStoreShallow } from '@/store/useAppStoreShallow';

export default function HistoryPage() {
  const { paramId = 'p1' } = useParams();
  const navigate = useNavigate();

  const {
    parameter,
    versions,
    getNotesByVersion,
    getScreenshotsByVersion,
    addNote,
    addScreenshot,
    parameters,
  } = useAppStoreShallow((s) => ({
    parameter: s.parameters.find((p) => p.id === paramId) ?? null,
    versions: s.getVersionsByParam(paramId),
    getNotesByVersion: s.getNotesByVersion,
    getScreenshotsByVersion: s.getScreenshotsByVersion,
    addNote: s.addNote,
    addScreenshot: s.addScreenshot,
    parameters: s.parameters,
  }));

  const [openVersionId, setOpenVersionId] = useState<string | null>(
    versions[0]?.id ?? null,
  );
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!parameter) {
    return (
      <div className="p-10 text-center text-ink-500">
        参数不存在。<Link to="/" className="underline">返回工作台</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1040px] mx-auto p-6 fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-700 mb-4 font-hei"
      >
        <ChevronLeft size={15} /> 返回
      </button>

      <header className="bg-white border border-ink-200 rounded-[2px] p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] text-ink-400 tracking-widest font-hei">
              参数历史面板
            </div>
            <h1 className="font-song text-xl text-ink-800 mt-1">{parameter.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-5 text-sm">
              <InfoLine label="当前值">
                <span className="font-mono text-ink-800">
                  {parameter.currentValue} {parameter.unit}
                </span>
              </InfoLine>
              <InfoLine label="当前权重">
                <span className="font-mono text-ink-800">
                  {parameter.currentWeight.toFixed(2)}
                </span>
              </InfoLine>
              <InfoLine label="变更次数">
                <span className="font-mono text-amber-600">
                  {parameter.changeCount}
                </span>
              </InfoLine>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {parameters
              .filter((p) => p.id !== paramId)
              .slice(0, 4)
              .map((p) => (
                <Link
                  key={p.id}
                  to={`/history/${p.id}`}
                  className="px-3 py-1 text-xs border border-ink-200 rounded-[2px] text-ink-600 hover:bg-ink-100 hover:text-ink-800 transition-colors font-hei"
                >
                  跳至 · {p.name.length > 8 ? p.name.slice(0, 8) + '…' : p.name}
                </Link>
              ))}
          </div>
        </div>
      </header>

      {/* 版本时间轴 */}
      <section className="space-y-3">
        <div className="text-[11px] text-ink-400 tracking-widest font-hei px-2">
          版本时间轴 · 倒序（最新在上）
        </div>
        <ol className="relative border-l border-ink-200 ml-5">
          {versions.map((v, idx) => {
            const isOpen = openVersionId === v.id;
            const notes = getNotesByVersion(v.id);
            const shots = getScreenshotsByVersion(v.id);
            const isLatest = idx === 0;
            return (
              <li key={v.id} className="relative pl-6 pb-6">
                <span
                  className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                    isLatest
                      ? 'border-ink-700 bg-white'
                      : 'border-ink-300 bg-white'
                  } ${v.reason ? '' : 'ring-2 ring-amber-200'}`}
                >
                  {v.reason && (
                    <span className="absolute inset-1 rounded-full bg-ink-700" />
                  )}
                </span>

                <div
                  className={`bg-white border ${
                    isOpen ? 'border-ink-300 shadow-sm' : 'border-ink-200'
                  } rounded-[2px] transition-all`}
                >
                  <button
                    onClick={() => setOpenVersionId(isOpen ? null : v.id)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-ink-500 w-10 shrink-0">
                        v{v.version}
                      </span>
                      <span
                        className={`text-sm ${
                          v.operator === '匿名'
                            ? 'text-amber-700'
                            : 'text-ink-800'
                        } font-hei truncate`}
                      >
                        {summarizeChange(v)}
                      </span>
                      {!v.reason && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-[2px] font-hei">
                          理由待补
                        </span>
                      )}
                      {v.operator === '匿名' && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 border border-amber-300 text-amber-700 rounded-[2px] font-hei">
                          匿名操作
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-ink-500">
                      <span className="hidden sm:inline-flex items-center gap-1">
                        <User size={12} /> {v.operator}
                      </span>
                      <span className="hidden sm:inline-flex items-center gap-1">
                        <Clock size={12} /> {v.timestamp}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`chevron-toggle ${isOpen ? 'open' : ''}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-ink-100 px-4 py-4 space-y-4 fade-in">
                      {/* 变更对比 */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <DiffBlock
                          title="变更前"
                          value={v.value}
                          weight={v.weight}
                          unit={parameter.unit}
                          muted
                        />
                        <DiffBlock
                          title="变更后"
                          value={v.newValue}
                          weight={v.newWeight}
                          unit={parameter.unit}
                          diffValue={v.newValue - v.value}
                          diffWeight={+(v.newWeight - v.weight).toFixed(2)}
                        />
                      </div>

                      {/* 修改理由 */}
                      <div>
                        <div className="text-[11px] text-ink-400 tracking-widest font-hei mb-1.5">
                          修改理由
                        </div>
                        {v.reason ? (
                          <div className="p-3 bg-ink-50 border border-ink-200 rounded-[2px] text-sm text-ink-700">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-ink-500" />
                              <span>{v.reason}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 border border-amber-200 border-dashed rounded-[2px] text-xs text-amber-700">
                            未填写。请在下方补记里说明原因。
                          </div>
                        )}
                      </div>

                      {/* 历史补记（永久留存） */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] text-ink-400 tracking-widest font-hei flex items-center gap-1.5">
                            <StickyNote size={12} /> 历史补记 · 永久留存不被覆盖
                          </div>
                          <span className="text-[10px] text-ink-400 font-hei">
                            {notes.length} 条
                          </span>
                        </div>

                        {notes.length > 0 ? (
                          <div className="grid sm:grid-cols-2 gap-3 stagger">
                            {notes.map((n) => (
                              <div
                                key={n.id}
                                className="sticky-note rounded-[2px] p-3 text-xs text-ink-800 leading-relaxed"
                              >
                                <div className="flex items-center justify-between text-[10px] text-ink-600 mb-1.5">
                                  <span>{n.author} · 补记</span>
                                  <span>{n.timestamp}</span>
                                </div>
                                <div>{n.content}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-ink-400 border border-dashed border-ink-200 p-3 rounded-[2px] text-center">
                          暂无补记，可在下方新增。
                        </div>

                        {/* 新增补记 */}
                        <div className="mt-3 flex items-start gap-2">
                          <input
                            type="text"
                            placeholder="后补说明（会写入历史不被覆盖）"
                            value={noteInputs[v.id] ?? ''}
                            onChange={(e) =>
                              setNoteInputs((m) => ({ ...m, [v.id]: e.target.value }))
                            className="flex-1 px-3 py-2 text-xs border border-ink-200 rounded-[2px] focus:outline-none focus:border-ink-400 font-hei"
                          />
                          <button
                            onClick={() => {
                              const val = noteInputs[v.id];
                              if (!val?.trim()) return;
                              addNote(v.id, val.trim(), '阿宁');
                              setNoteInputs((m) => ({ ...m, [v.id]: '' }));
                            }}
                            className="px-3 py-2 text-xs bg-ink-700 text-white rounded-[2px] hover:bg-ink-600 font-hei inline-flex items-center gap-1"
                          >
                            <Plus size={13} /> 补记
                          </button>
                        </div>
                      </div>

                      {/* 旧版截图 */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] text-ink-400 tracking-widest font-hei flex items-center gap-1.5">
                            <Paperclip size={12} /> 旧版截图 · 胶片存档
                          </div>
                        </div>

                        {shots.length > 0 ? (
                          <div className="grid sm:grid-cols-2 gap-4">
                            {shots.map((s) => (
                              <figure key={s.id} className="film-border">
                                <img
                                  src={s.dataUrl}
                                  alt={s.description}
                                  className="w-full block"
                                />
                                <figcaption className="bg-ink-800 text-[10px] text-amber-100 px-2 py-1 font-hei">
                                  {s.description}
                                  <span className="text-ink-400 ml-2">{s.timestamp}</span>
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-ink-400 border border-dashed border-ink-200 p-4 rounded-[2px] text-center">
                          暂无截图。上传后会存进历史不被覆盖。
                        </div>

                        <div className="mt-3">
                          <input
                            ref={(el) => {
                              fileRefs.current[v.id] = el;
                              return undefined;
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                addScreenshot(
                                  v.id,
                                  String(reader.result),
                                  `上传截图 · ${file.name}`,
                                );
                              };
                              reader.readAsDataURL(file);
                              e.target.value = '';
                            }}
                          />
                          <button
                            onClick={() => fileRefs.current[v.id]?.click()}
                            className="px-3 py-1.5 text-xs border border-ink-300 text-ink-700 hover:bg-ink-100 transition-colors rounded-[2px] font-hei inline-flex items-center gap-1"
                          >
                            <ImagePlus size={13} /> 上传旧版截图
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function InfoLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-[11px] text-ink-400 tracking-widest font-hei">
        {label}
      </span>
      {children}
    </span>
  );
}

function DiffBlock({
  title,
  value,
  weight,
  unit,
  muted,
  diffValue,
  diffWeight,
}: {
  title: string;
  value: number;
  weight: number;
  unit: string;
  muted?: boolean;
  diffValue?: number;
  diffWeight?: string;
}) {
  return (
    <div
      className={`p-3 rounded-[2px] border ${
        muted ? 'bg-ink-50 border-ink-200' : 'bg-white border-ink-300'
      }`}
    >
      <div className="text-[10px] text-ink-400 tracking-widest font-hei mb-1.5">
        {title}
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-ink-500">值</span>
          <span className="font-mono text-ink-800">
            {value} <span className="text-ink-500 text-[10px]">{unit}</span>
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-ink-500">权重</span>
          <span className="font-mono text-ink-800">{weight.toFixed(2)}</span>
        </div>
        {(diffValue || diffWeight) && (
          <div className="pt-1 mt-1 border-t border-ink-100 text-[10px] font-mono text-amber-700 space-y-0.5">
          {diffValue !== undefined && diffValue !== 0 && (
            <div>Δ值 {diffValue > 0 ? '+' : ''}
              {diffValue} {unit}
            </div>
          )}
          {diffWeight !== undefined && Number(diffWeight) !== 0 && (
            <div>Δ权重 {Number(diffWeight) > 0 ? '+' : ''}
              {diffWeight}
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function summarizeChange(v: {
  value: number;
  newValue: number;
  weight: number;
  newWeight: number;
}) {
  const parts: string[] = [];
  if (v.value !== v.newValue) {
    parts.push(`值 ${v.value} → ${v.newValue}`);
  }
  if (v.weight !== v.newWeight) {
    parts.push(
      `权重 ${v.weight.toFixed(2)} → ${v.newWeight.toFixed(2)}`,
    );
  }
  return parts.join(' · ') || '未变更（仅打标）';
}
