import { useState } from "react";
import { useStore } from "@/store";
import { FileKey, Send, ChevronDown, ChevronUp } from "lucide-react";

export default function AuthorizationNoteInput() {
  const { authorizationNotes, addAuthorizationNote, changeRecords } = useStore();
  const [content, setContent] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!content.trim()) return;
    addAuthorizationNote(content, "录音师老许");
    setContent("");
  };

  const relatedChanges = (noteId: string) =>
    changeRecords.filter((c) => c.type === "authorization" && c.sourceLine === noteId);

  return (
    <div className="bg-surface-800 rounded-lg border border-surface-600 mt-4">
      <div className="px-4 py-3 border-b border-surface-600 flex items-center gap-2">
        <FileKey className="w-4 h-4 text-amber" />
        <h3 className="font-mono text-sm font-semibold text-zinc-100">授权备注</h3>
      </div>

      <div className="px-4 py-3">
        <div className="flex gap-2 mb-3">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="补入授权备注（如：音频文件夹备注）..."
            className="flex-1 bg-surface-700 border border-surface-500 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber font-mono"
          />
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="flex items-center gap-1 text-xs text-surface-900 bg-amber hover:bg-amber-light disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 rounded font-medium transition-colors"
          >
            <Send className="w-3 h-3" />
            提交
          </button>
        </div>

        {authorizationNotes.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">已提交的授权备注</p>
            {authorizationNotes.map((note) => {
              const changes = relatedChanges(note.id);
              const isExpanded = expandedNote === note.id;
              return (
                <div key={note.id} className="bg-surface-700/30 rounded overflow-hidden">
                  <button
                    onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                    className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-amber">{note.id}</span>
                      <span className="text-sm text-zinc-300 truncate max-w-[300px]">{note.content}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">{new Date(note.createdAt).toLocaleString("zh-CN")}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3 text-zinc-500" /> : <ChevronDown className="w-3 h-3 text-zinc-500" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-surface-600">
                      <div className="pt-2">
                        <p className="text-xs text-zinc-500 mb-1">判断变更清单</p>
                        {changes.length > 0 ? (
                          changes.map((ch) => (
                            <div key={ch.id} className="bg-surface-800 rounded p-2 mb-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-zinc-500 line-through">{ch.beforeValue}</span>
                                <span className="text-zinc-400">→</span>
                                <span className="text-emerald">{ch.afterValue}</span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ch.impactScope.map((s) => (
                                  <span key={s} className="text-xs bg-amber/10 text-amber px-1.5 py-0.5 rounded">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-zinc-500">无关联变更</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">受影响文件</p>
                        <div className="flex flex-wrap gap-1">
                          {note.affectedFiles.map((f) => (
                            <span key={f} className="text-xs bg-surface-600 text-zinc-300 px-1.5 py-0.5 rounded font-mono">
                              {f}
                            </span>
                          ))}
                          {note.affectedFiles.length === 0 && <span className="text-xs text-zinc-500">无</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">受影响曲目表</p>
                        <div className="flex flex-wrap gap-1">
                          {note.affectedTracks.map((t) => (
                            <span key={t} className="text-xs bg-surface-600 text-zinc-300 px-1.5 py-0.5 rounded">
                              {t}
                            </span>
                          ))}
                          {note.affectedTracks.length === 0 && <span className="text-xs text-zinc-500">无</span>}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">受影响清单</p>
                        <div className="flex flex-wrap gap-1">
                          {note.affectedChecklist.map((c) => (
                            <span key={c} className="text-xs bg-surface-600 text-zinc-300 px-1.5 py-0.5 rounded">
                              {c}
                            </span>
                          ))}
                          {note.affectedChecklist.length === 0 && <span className="text-xs text-zinc-500">无</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
