import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileSearch,
  Link2,
  ArrowRight,
  User,
  Clock,
  FileText,
  Image as ImageIcon,
  History,
  GitCompareArrows,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Unlink,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { ChangeLogEntry } from '@/types';
import { cn, formatDateTime, scrollToElement, fieldLabel } from '@/utils';

export default function PathologyPage() {
  const store = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedSampleId, setSelectedSampleId] = useState<string>('all');
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddConclusion, setShowAddConclusion] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [formNote, setFormNote] = useState({ sampleId: '', content: '', createdBy: '' });
  const [formConclusion, setFormConclusion] = useState({ sampleId: '', judgment: '', issuer: '', noteIds: [] as string[] });

  const highlightId = store.ui_highlightId;
  const highlightType = store.ui_highlightType;

  useEffect(() => {
    const hash = location.hash.slice(1);
    if (hash) {
      const type = hash.startsWith('P-') ? 'note' : hash.startsWith('C-') ? 'conclusion' : null;
      if (type) {
        store.setHighlight(hash, type as any);
        scrollToElement(hash);
        setTimeout(() => {
          navigate(location.pathname, { replace: true });
        }, 100);
      }
    }
  }, [location.hash]);

  useEffect(() => {
    if (highlightId) {
      scrollToElement(highlightId);
    }
  }, [highlightId]);

  const samplesWithData = useMemo(() => {
    const ids = new Set([
      ...store.pathologyNotes.map((n) => n.sampleId),
      ...store.conclusions.map((c) => c.sampleId),
    ]);
    return store.samples.filter((s) => ids.has(s.id));
  }, [store.samples, store.pathologyNotes, store.conclusions]);

  const filteredNotes = useMemo(
    () =>
      selectedSampleId === 'all'
        ? store.pathologyNotes
        : store.pathologyNotes.filter((n) => n.sampleId === selectedSampleId),
    [store.pathologyNotes, selectedSampleId]
  );

  const filteredConclusions = useMemo(
    () =>
      selectedSampleId === 'all'
        ? store.conclusions
        : store.conclusions.filter((c) => c.sampleId === selectedSampleId),
    [store.conclusions, selectedSampleId]
  );

  const sampleLogs: ChangeLogEntry[] = useMemo(
    () =>
      selectedSampleId === 'all'
        ? store.changeLogs
        : store.changeLogs.filter((l) => {
            const entity =
              l.entityType === 'note'
                ? store.pathologyNotes.find((n) => n.id === l.entityId)
                : l.entityType === 'conclusion'
                ? store.conclusions.find((c) => c.id === l.entityId)
                : store.sequencingRuns.find((r) => r.id === l.entityId);
            return entity && (entity as any).sampleId === selectedSampleId;
          }),
    [store.changeLogs, store.pathologyNotes, store.conclusions, store.sequencingRuns, selectedSampleId]
  );

  const handleJumpToConclusion = (conclusionId: string) => {
    store.setHighlight(conclusionId, 'conclusion');
    window.location.hash = conclusionId;
  };

  const handleJumpToNote = (noteId: string) => {
    store.setHighlight(noteId, 'note');
    window.location.hash = noteId;
  };

  const handleSubmitNote = () => {
    if (!formNote.sampleId || !formNote.content || !formNote.createdBy) return;
    store.addPathologyNote({
      sampleId: formNote.sampleId,
      content: formNote.content,
      imageAttachments: [],
      createdBy: formNote.createdBy,
      linkedConclusionIds: [],
    });
    setFormNote({ sampleId: '', content: '', createdBy: '' });
    setShowAddNote(false);
  };

  const handleSubmitConclusion = () => {
    if (!formConclusion.sampleId || !formConclusion.judgment || !formConclusion.issuer) return;
    store.addFinalConclusion({
      sampleId: formConclusion.sampleId,
      judgment: formConclusion.judgment,
      issuer: formConclusion.issuer,
      linkedNoteIds: formConclusion.noteIds,
    });
    setFormConclusion({ sampleId: '', judgment: '', issuer: '', noteIds: [] });
    setShowAddConclusion(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-5 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">病理分析 / 结论追溯</div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 font-serif-cn flex items-center gap-2">
            🔬 病理备注 & 最终结论 双向追溯
            <span className="ml-3 px-2 py-0.5 rounded bg-deep-ocean/10 text-deep-ocean text-xs font-normal border border-deep-ocean/20">
              🔗 点锚点双向跳，不用人工查表
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            每条病理备注和结论都有唯一锚点ID，互相关联后点击就能直接跳回去
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSampleId}
            onChange={(e) => setSelectedSampleId(e.target.value)}
            className="px-3 py-2 rounded-md border border-slate-200 text-sm bg-white cursor-pointer focus:outline-none focus:border-deep-ocean"
          >
            <option value="all">全部样本</option>
            {samplesWithData.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.species}/{s.variety.slice(0, 8)}
              </option>
            ))}
          </select>
          <button onClick={() => setShowAddConclusion(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            签发新结论
          </button>
          <button onClick={() => setShowAddNote(true)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            新增病理备注
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr_320px] gap-5">
        <div className="card !p-0 flex flex-col max-h-[calc(100vh-160px)] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-warning/[0.08] to-transparent flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-bold text-slate-800 font-serif-cn">
              <FileText className="w-4 h-4 text-amber-warning" />
              病理备注列表
              <span className="text-xs font-normal text-slate-400">共 {filteredNotes.length} 条</span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <GitCompareArrows className="w-3 h-3" />
              锚点ID: P-YYYYMMDD-NNN
            </div>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin">
            {filteredNotes.map((note) => {
              const sample = store.samples.find((s) => s.id === note.sampleId);
              const isHighlighted = highlightId === note.id && highlightType === 'note';
              return (
                <div
                  key={note.id}
                  id={note.id}
                  className={cn(
                    'p-3.5 rounded-xl border-2 transition-all',
                    isHighlighted ? 'animate-flash-highlight border-deep-ocean shadow-lg' : 'border-slate-100 bg-slate-50/40 hover:border-amber-warning/40 hover:bg-amber-warning/[0.03]'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-[11px] font-bold text-amber-warning bg-amber-warning/10 px-1.5 py-0.5 rounded">
                          {note.id}
                        </span>
                        <span className="font-mono-data text-[10px] text-slate-500">{note.sampleId}</span>
                        {sample && (
                          <span className="text-[10px] text-slate-400">
                            {sample.species} · {sample.variety.slice(0, 10)}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {note.createdBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDateTime(note.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[12.5px] text-slate-700 leading-relaxed whitespace-pre-line mb-2.5">
                    {note.content}
                  </div>

                  {note.imageAttachments.length > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2.5 flex-wrap">
                      <ImageIcon className="w-3 h-3" />
                      附件:
                      {note.imageAttachments.map((f) => (
                        <span key={f} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono-data">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> 引用此备注的最终结论 ({note.linkedConclusionIds.length}):
                    </div>
                    {note.linkedConclusionIds.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-warning/60" />
                        暂未关联任何结论，建议签发结论后建立锚点
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {note.linkedConclusionIds.map((cid) => {
                          const conc = store.conclusions.find((c) => c.id === cid);
                          return (
                            <button
                              key={cid}
                              onClick={() => handleJumpToConclusion(cid)}
                              className="group flex items-center gap-1 px-2 py-1 rounded-md bg-tundra-green/10 border border-tundra-green/30 hover:bg-tundra-green/20 transition-colors"
                            >
                              <span className="font-mono-data text-[10.5px] font-bold text-tundra-green-dark">
                                {cid}
                              </span>
                              {conc && (
                                <span className="text-[9.5px] text-slate-500 max-w-[120px] truncate">
                                  {conc.judgment.slice(0, 15)}...
                                </span>
                              )}
                              <ArrowRight className="w-2.5 h-2.5 text-tundra-green-dark opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredNotes.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-1 opacity-40" />
                暂无病理备注
              </div>
            )}
          </div>
        </div>

        <div className="card !p-0 flex flex-col max-h-[calc(100vh-160px)] overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-tundra-green/[0.08] to-transparent flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 font-bold text-slate-800 font-serif-cn">
              <CheckCircle2 className="w-4 h-4 text-tundra-green-dark" />
              最终结论卡片
              <span className="text-xs font-normal text-slate-400">共 {filteredConclusions.length} 条</span>
            </div>
            <div className="text-[10px] text-slate-500 flex items-center gap-1">
              <GitCompareArrows className="w-3 h-3" />
              锚点ID: C-YYYYMMDD-NNN
            </div>
          </div>
          <div className="p-3 space-y-3 overflow-y-auto scrollbar-thin">
            {filteredConclusions.map((conc) => {
              const sample = store.samples.find((s) => s.id === conc.sampleId);
              const isHighlighted = highlightId === conc.id && highlightType === 'conclusion';
              const hasWarn = conc.linkedNoteIds.length === 0;
              return (
                <div
                  key={conc.id}
                  id={conc.id}
                  className={cn(
                    'p-3.5 rounded-xl border-2 transition-all',
                    isHighlighted ? 'animate-flash-highlight border-tundra-green shadow-lg' :
                    hasWarn ? 'border-amber-warning/40 bg-amber-warning/[0.02]' :
                    'border-slate-100 bg-gradient-to-br from-white to-tundra-green/[0.02] hover:border-tundra-green/40'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-[11px] font-bold text-tundra-green-dark bg-tundra-green/12 px-1.5 py-0.5 rounded">
                          {conc.id}
                        </span>
                        <span className="font-mono-data text-[10px] text-slate-500">{conc.sampleId}</span>
                        {sample && (
                          <span className="text-[10px] text-slate-400">
                            {sample.species}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> 签发人: {conc.issuer}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDateTime(conc.issuedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[12.5px] text-slate-700 leading-relaxed p-3 rounded-lg bg-white border border-slate-100 shadow-sm mb-2.5">
                    {conc.judgment}
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> 本结论依据的病理备注 ({conc.linkedNoteIds.length}):
                    </div>
                    {conc.linkedNoteIds.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-warning/60" />
                        未关联病理备注，复盘时无法溯源！
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {conc.linkedNoteIds.map((nid) => {
                          const note = store.pathologyNotes.find((n) => n.id === nid);
                          return (
                            <button
                              key={nid}
                              onClick={() => handleJumpToNote(nid)}
                              className="group flex items-center gap-1 px-2 py-1 rounded-md bg-amber-warning/10 border border-amber-warning/30 hover:bg-amber-warning/15 transition-colors"
                            >
                              <span className="font-mono-data text-[10.5px] font-bold text-amber-warning">
                                {nid}
                              </span>
                              {note && (
                                <span className="text-[9.5px] text-slate-500 max-w-[100px] truncate">
                                  {note.content.slice(0, 14)}...
                                </span>
                              )}
                              <ArrowRight className="w-2.5 h-2.5 text-amber-warning opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredConclusions.length === 0 && (
              <div className="py-16 text-center text-sm text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-1 opacity-40" />
                暂无最终结论
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="card">
            <h3 className="font-bold text-slate-800 font-serif-cn flex items-center gap-2 mb-3 text-sm">
              <GitCompareArrows className="w-4 h-4 text-deep-ocean" />
              关联关系总览
            </h3>
            <div className="space-y-2 text-xs">
              {samplesWithData.slice(0, 6).map((s) => {
                const sNotes = store.getNotesBySample(s.id);
                const sConcs = store.getConclusionsBySample(s.id);
                const linkedPairs = sNotes.reduce(
                  (acc, n) => acc + n.linkedConclusionIds.length, 0
                );
                const totalPossible = sNotes.length * Math.max(1, sConcs.length);
                const linkRatio = totalPossible === 0 ? 0 : Math.min(100, (linkedPairs / totalPossible) * 100);
                return (
                  <div key={s.id} className="p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono-data font-semibold text-[11px] text-slate-700">{s.id.slice(-7)}</span>
                      <span className="text-[10px] text-slate-400">{s.species}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-amber-warning/10 text-amber-warning font-mono-data">
                        备注 {sNotes.length}
                      </span>
                      <Link2 className="w-3 h-3 text-slate-300" />
                      <span className="px-1.5 py-0.5 rounded bg-tundra-green/10 text-tundra-green-dark font-mono-data">
                        结论 {sConcs.length}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          linkRatio >= 80 ? 'bg-tundra-green' : linkRatio >= 40 ? 'bg-amber-warning' : 'bg-red-400'
                        )}
                        style={{ width: Math.max(linkRatio, 5) + '%' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card !p-0 flex flex-col max-h-[380px] overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 font-bold text-slate-800 font-serif-cn text-sm shrink-0">
              <History className="w-4 h-4 text-slate-500" />
              变更日志
              <span className="text-xs font-normal text-slate-400">{sampleLogs.length}</span>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto scrollbar-thin">
              {sampleLogs.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">暂无变更记录</div>
              )}
              {sampleLogs.map((log) => {
                const expanded = expandedLogs[log.id];
                return (
                  <div
                    key={log.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedLogs({ ...expandedLogs, [log.id]: !expanded })}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded font-mono-data font-semibold text-[10px]',
                          log.entityType === 'note' ? 'bg-amber-warning/10 text-amber-warning' :
                          log.entityType === 'conclusion' ? 'bg-tundra-green/10 text-tundra-green-dark' :
                          'bg-deep-ocean/10 text-deep-ocean'
                        )}>
                          {log.entityType === 'note' ? '备注' : log.entityType === 'conclusion' ? '结论' : '测序'}
                        </span>
                        <span className="font-mono-data text-[10px] text-slate-500">{log.entityId}</span>
                        <span className="text-[10px] text-slate-400">
                          修改 {fieldLabel(log.field)}
                        </span>
                      </div>
                      {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-2">
                      <span>{log.changedBy}</span>
                      <span>·</span>
                      <span>{formatDateTime(log.changedAt)}</span>
                    </div>
                    {expanded && (
                      <div className="mt-2 p-2 rounded bg-white border border-slate-100 space-y-1.5">
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">修改前</div>
                          <div className="text-[11px] text-red-600 bg-red-50 px-2 py-1 rounded font-mono-data line-through decoration-red-400/50">
                            {String(log.oldValue).slice(0, 120)}
                            {String(log.oldValue).length > 120 && '...'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400 uppercase tracking-wide mb-0.5">修改后</div>
                          <div className="text-[11px] text-tundra-green-dark bg-tundra-green/5 px-2 py-1 rounded font-mono-data">
                            {String(log.newValue).slice(0, 120)}
                            {String(log.newValue).length > 120 && '...'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showAddNote && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-warning/10 to-transparent">
              <h3 className="font-bold font-serif-cn text-slate-800">新增病理备注</h3>
              <button onClick={() => setShowAddNote(false)} className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">关联样本</label>
                <select
                  value={formNote.sampleId}
                  onChange={(e) => setFormNote({ ...formNote, sampleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean bg-white"
                >
                  <option value="">-- 请选择 --</option>
                  {store.samples.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} · {s.species}/{s.variety}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">备注内容</label>
                <textarea
                  value={formNote.content}
                  onChange={(e) => setFormNote({ ...formNote, content: e.target.value })}
                  rows={5}
                  placeholder="描述病理观察、检测结果、异常情况等..."
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">记录人</label>
                <input
                  value={formNote.createdBy}
                  onChange={(e) => setFormNote({ ...formNote, createdBy: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean"
                  placeholder="如：赵实验员"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowAddNote(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={handleSubmitNote} disabled={!formNote.sampleId || !formNote.content} className="btn-primary text-sm">
                保存备注
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddConclusion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-tundra-green/10 to-transparent">
              <h3 className="font-bold font-serif-cn text-slate-800">签发最终结论</h3>
              <button onClick={() => setShowAddConclusion(false)} className="w-8 h-8 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">关联样本</label>
                <select
                  value={formConclusion.sampleId}
                  onChange={(e) => {
                    setFormConclusion({ ...formConclusion, sampleId: e.target.value, noteIds: [] });
                  }}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean bg-white"
                >
                  <option value="">-- 请选择 --</option>
                  {store.samples.map((s) => (
                    <option key={s.id} value={s.id}>{s.id} · {s.species}/{s.variety}</option>
                  ))}
                </select>
              </div>
              {formConclusion.sampleId && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                    关联病理备注 (建立双向锚点)
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto p-2 border border-slate-100 rounded-md">
                    {store.getNotesBySample(formConclusion.sampleId).length === 0 && (
                      <div className="text-xs text-slate-400 italic py-2 text-center">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        该样本暂无病理备注，建议先创建备注再签发结论
                      </div>
                    )}
                    {store.getNotesBySample(formConclusion.sampleId).map((n) => (
                      <label key={n.id} className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formConclusion.noteIds.includes(n.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...formConclusion.noteIds, n.id]
                              : formConclusion.noteIds.filter((x) => x !== n.id);
                            setFormConclusion({ ...formConclusion, noteIds: ids });
                          }}
                          className="mt-1 rounded border-slate-300"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono-data text-[10px] font-bold text-amber-warning bg-amber-warning/10 px-1 rounded">
                              {n.id}
                            </span>
                            <span className="text-[10px] text-slate-400">{n.createdBy}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{n.content}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">最终判定</label>
                <textarea
                  value={formConclusion.judgment}
                  onChange={(e) => setFormConclusion({ ...formConclusion, judgment: e.target.value })}
                  rows={4}
                  placeholder="【通过/有条件通过/驳回】+ 具体判定依据 + 后续建议"
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean resize-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">签发人</label>
                <input
                  value={formConclusion.issuer}
                  onChange={(e) => setFormConclusion({ ...formConclusion, issuer: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm focus:outline-none focus:border-deep-ocean"
                  placeholder="如：首席育种师-刘主任"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50">
              <button onClick={() => setShowAddConclusion(false)} className="btn-secondary text-sm">取消</button>
              <button onClick={handleSubmitConclusion} disabled={!formConclusion.sampleId || !formConclusion.judgment || !formConclusion.issuer} className="btn-success text-sm">
                签发结论 (自动建立双向锚点)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
