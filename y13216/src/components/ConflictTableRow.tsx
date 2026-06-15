import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  CalendarDays,
  User,
  Image as ImageIcon,
  Clock,
  PencilLine,
  FilePlus,
  CheckCheck,
  Play,
  AlertCircle,
  X,
  ZoomIn,
  MessageSquare,
} from 'lucide-react';
import type { ConflictRecord, ConflictStatus, ScreenshotPlaceholder } from '@/types';
import { STATUS_LABEL } from '@/types';
import { useConflictStore } from '@/store/conflictStore';
import { cn } from '@/lib/utils';

interface Props {
  record: ConflictRecord;
  onOpenOverride: (r: ConflictRecord) => void;
  onOpenNote: (r: ConflictRecord) => void;
  onShowHistory: (r: ConflictRecord) => void;
}

const statusBadge = (status: ConflictStatus) => {
  switch (status) {
    case 'resolved':
      return { cls: 'status-badge status-resolved animate-slide-in', icon: <CheckCircle2 className="w-3.5 h-3.5" /> };
    case 'pending_evidence':
      return { cls: 'status-badge status-evidence animate-slide-in', icon: <AlertTriangle className="w-3.5 h-3.5" /> };
    case 'pending_confirm':
      return { cls: 'status-badge status-confirm animate-slide-in', icon: <AlertOctagon className="w-3.5 h-3.5" /> };
  }
};

function ScreenshotLightbox({ shot, onClose }: { shot: ScreenshotPlaceholder; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 text-white">
          <div>
            <div className="font-bold">{shot.name}</div>
            <div className="text-xs opacity-80 mt-0.5">
              来源：{shot.sourceGroup}　·　{shot.timestamp}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${shot.gradient} flex items-center justify-center shadow-2xl border-4 border-white/20 overflow-hidden relative`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_30%,white,transparent_60%)]" />
          <div className="relative z-10 text-center">
            <div className="text-8xl mb-4 drop-shadow-lg">{shot.icon}</div>
            <div className="text-white text-xl font-bold mb-1 drop-shadow-lg">{shot.name}</div>
            <div className="text-white/90 text-sm">{shot.description}</div>
            <div className="mt-6 bg-white/25 backdrop-blur-md rounded-xl px-5 py-2.5 inline-block">
              <div className="text-white/90 text-xs">排练群消息截图 · 模拟占位</div>
              <div className="text-white font-mono text-sm mt-0.5">{shot.timestamp}</div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-white/70 text-sm italic bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm">
          💡 说明：此处为排练群截图的占位展示。正式交付时请将实际图片放入对应目录。
        </div>
      </div>
    </div>
  );
}

export default function ConflictTableRow({ record, onOpenOverride, onOpenNote, onShowHistory }: Props) {
  const { expandedRowId, setExpandedRowId, flashingRowId, clearFlash, changeStatus, confirmPending } = useConflictStore();
  const isExpanded = expandedRowId === record.id;
  const badge = statusBadge(record.status);
  const [lightboxShot, setLightboxShot] = useState<ScreenshotPlaceholder | null>(null);
  const [flashTriggered, setFlashTriggered] = useState(false);

  useEffect(() => {
    if (flashingRowId === record.id && !flashTriggered) {
      setFlashTriggered(true);
      const t = setTimeout(() => {
        clearFlash();
        setFlashTriggered(false);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [flashingRowId, record.id, flashTriggered, clearFlash]);

  const toggleExpand = () => setExpandedRowId(isExpanded ? null : record.id);

  return (
    <>
      <div
        className={cn(
          'group border-b border-gray-100 transition-all duration-200',
          flashingRowId === record.id ? 'animate-flash-red' : '',
          record.status === 'pending_confirm' ? 'bg-status-confirmBg/30 hover:bg-status-confirmBg/50' : '',
          !isExpanded ? 'hover:bg-brand-50/40' : 'bg-white'
        )}
      >
        <div className="px-6 py-4 cursor-pointer" onClick={toggleExpand}>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-brand-700" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-brand-600 transition-colors" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-800 text-base">{record.title}</span>
                <span className={badge.cls} key={record.status}>
                  {badge.icon}
                  {STATUS_LABEL[record.status]}
                </span>
                {record.status === 'pending_confirm' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold animate-pulse">
                    <AlertCircle className="w-3 h-3" />
                    现场老师请确认
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1 truncate">{record.conflictSummary}</div>
            </div>

            <div className="hidden md:flex items-center gap-5 text-xs text-gray-500 flex-shrink-0">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="font-mono">{record.date.slice(5)}</span>
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {record.handler}
              </span>
              <span className="flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5" />
                {record.screenshots.length}
              </span>
              <span className="flex items-center gap-1 max-w-[150px]">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono truncate">{record.updatedAt.slice(5, 16)}</span>
              </span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-6 pb-6 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
              <div className="paper-section">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-4 h-4 text-brand-700" />
                  <h4 className="font-bold text-sm text-gray-800">排练群截图占位</h4>
                  <span className="ml-auto text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    {record.screenshots.length} 张
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {record.screenshots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setLightboxShot(s)}
                      className="group relative aspect-[3/2] rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg hover:border-brand-300 transition-all"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient}`} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-3xl mb-1 drop-shadow">{s.icon}</span>
                        <span className="text-[10px] text-gray-800/80 font-semibold leading-tight line-clamp-1">
                          {s.name}
                        </span>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-2 py-1">
                        <div className="text-[10px] text-white truncate">{s.sourceGroup}</div>
                        <div className="text-[9px] text-white/80 font-mono">{s.timestamp.slice(5, 16)}</div>
                      </div>
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="paper-section flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-4 h-4 text-brand-700" />
                  <h4 className="font-bold text-sm text-gray-800">处理记录</h4>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="p-3 rounded-lg bg-white border border-brand-100">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-resolved" />
                      <span className="text-[11px] font-bold text-status-resolved">正常记录</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{record.normalRecord}</p>
                  </div>

                  <div className="p-3 rounded-lg bg-white border border-status-evidence/30">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-evidence" />
                      <span className="text-[11px] font-bold text-status-evidence">当前备注</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {record.currentRemark || <span className="italic text-gray-400">（暂未填写备注）</span>}
                    </p>
                  </div>

                  {record.supplementaryNotes.length > 0 && (
                    <div className="p-3 rounded-lg bg-white border border-paper-200">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-brand-600" />
                        <span className="text-[11px] font-bold text-brand-700">后补说明 · {record.supplementaryNotes.length} 条</span>
                      </div>
                      <ul className="space-y-2">
                        {record.supplementaryNotes.map((n) => (
                          <li key={n.id} className="text-xs text-gray-600 border-l-2 border-brand-200 pl-2.5 py-0.5">
                            <div className="font-semibold text-gray-700">
                              {n.operator} · <span className="font-mono">{n.timestamp.slice(5, 16)}</span>
                            </div>
                            <div className="mt-0.5 leading-relaxed">{n.content}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="paper-section flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <Play className="w-4 h-4 text-brand-700" />
                  <h4 className="font-bold text-sm text-gray-800">操作区</h4>
                </div>

                <div className="flex-1 space-y-2">
                  <button
                    onClick={() => onOpenOverride(record)}
                    className="w-full btn-danger text-xs justify-start"
                  >
                    <PencilLine className="w-4 h-4" />
                    批注 / 修改备注（覆盖则自动挂起）
                  </button>
                  <button
                    onClick={() => onOpenNote(record)}
                    className="w-full btn-secondary text-xs justify-start"
                  >
                    <FilePlus className="w-4 h-4" />
                    追加后补说明
                  </button>

                  <div className="h-px bg-gray-200 my-2" />

                  <button
                    onClick={() => changeStatus(record.id, 'resolved', '证据全部补齐，标记已处理', '林姐')}
                    className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md bg-status-resolvedBg text-status-resolved text-xs font-semibold border border-status-resolved/30 hover:bg-status-resolved hover:text-white transition-all"
                  >
                    <CheckCheck className="w-4 h-4" />
                    标记为已处理 ✓
                  </button>
                  <button
                    onClick={() => changeStatus(record.id, 'pending_evidence', '新发现需补充证据材料', '林姐')}
                    className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-md bg-status-evidenceBg text-status-evidence text-xs font-semibold border border-status-evidence/30 hover:bg-status-evidence hover:text-white transition-all"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    标记为需补证据
                  </button>

                  {record.status === 'pending_confirm' && (
                    <>
                      <div className="h-px bg-status-confirm/20 my-2" />
                      <div className="p-3 rounded-lg bg-status-confirmBg border border-status-confirm/30">
                        <div className="text-xs font-bold text-status-confirm mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          现场老师二次确认区
                        </div>
                        <p className="text-[11px] text-status-confirm/80 leading-relaxed mb-3">
                          此条因批注覆盖旧判断被自动挂起，请现场老师人工确认备注内容无误后解除挂起。
                        </p>
                        <button
                          onClick={() => confirmPending(record.id, '林姐')}
                          className="w-full btn-primary text-xs justify-center !py-2"
                        >
                          ✓ 我已人工复核，解除挂起（转需补证据）
                        </button>
                      </div>
                    </>
                  )}

                  <div className="mt-auto pt-3">
                    <button
                      onClick={() => onShowHistory(record)}
                      className="w-full btn-ghost justify-center border border-gray-200 hover:border-brand-200"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      查看完整变更历史（{record.history.length} 条）
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {lightboxShot && <ScreenshotLightbox shot={lightboxShot} onClose={() => setLightboxShot(null)} />}
    </>
  );
}
