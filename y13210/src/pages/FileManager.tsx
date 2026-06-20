import { useState } from 'react';
import {
  FolderOpen,
  Music,
  Paperclip,
  Clock,
  Plus,
  Send,
  FileAudio,
  History,
  Image,
  User,
  ChevronDown,
  ChevronRight,
  Pin,
  Search,
} from 'lucide-react';
import { useReviewStore } from '../store/reviewStore';
import { VOICE_LABELS, VOICE_COLORS, VoiceType } from '../types';
import { formatSeconds } from '../data/mockData';

export default function FileManager() {
  const batches = useReviewStore((s) => s.batches);
  const activeBatchId = useReviewStore((s) => s.activeBatchId);
  const activeSongId = useReviewStore((s) => s.activeSongId);
  const setActiveSong = useReviewStore((s) => s.setActiveSong);
  const addNote = useReviewStore((s) => s.addNote);
  const openDrawer = useReviewStore((s) => s.openDrawer);

  const [noteText, setNoteText] = useState('');
  const [authorName, setAuthorName] = useState('王老师');
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const batch = batches.find((b) => b.id === activeBatchId);
  if (!batch) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-ink-500">请先选择一个复核批次</p>
      </div>
    );
  }

  const currentSongId = activeSongId ?? batch.songs[0]?.id;
  const song = batch.songs.find((s) => s.id === currentSongId)!;

  const toggleExpand = (fileId: string) =>
    setExpandedFiles((prev) => ({ ...prev, [fileId]: !prev[fileId] }));

  const submitNote = () => {
    if (!noteText.trim() || !song.audioFiles[0]) return;
    addNote(song.audioFiles[song.audioFiles.length - 1].id, noteText.trim(), authorName);
    setNoteText('');
  };

  const filteredHistory = song.history.filter((h) =>
    searchTerm === ''
      ? true
      : h.description.includes(searchTerm) ||
        (h.noteContent?.includes(searchTerm) ?? false) ||
        h.operator.includes(searchTerm)
  );

  const historyTypeIcons: Record<string, { icon: string; label: string; color: string }> = {
    upload: { icon: '🎙️', label: '文件上传', color: 'bg-forest-50 text-forest-700 border-forest-200' },
    note_added: { icon: '📌', label: '备注追加', color: 'bg-copper-50 text-copper-700 border-copper-200' },
    screenshot_added: { icon: '📷', label: '截图归档', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    review_marker: { icon: '🔍', label: '复核标记', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
    name_change: { icon: '✏️', label: '名称修改', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  };

  return (
    <div className="space-y-6">
      {/* 曲面包屑 */}
      <div className="page-card !p-4">
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="flex items-center gap-1.5 text-ink-500">
            <FolderOpen size={14} />
            {batch.folderPath}
          </span>
          <ChevronRight size={14} className="text-ink-300" />
          {batch.songs.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSong(s.id)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-all ${
                s.id === currentSongId
                  ? 'bg-forest-500 text-white shadow-sm'
                  : 'text-ink-700 hover:bg-ink-50'
              }`}
            >
              <Music size={13} />
              《{s.name}》
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索备注/操作…"
                className="input-field !py-2 !pl-8 !pr-3 !w-52 !text-xs"
              />
            </div>
            <button
              onClick={() => openDrawer('file')}
              className="btn-secondary !py-2 !px-3 !text-xs"
            >
              <History size={14} /> 时间轴视图
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左：文件列表 */}
        <div className="lg:col-span-3 page-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">
              <FileAudio size={18} className="text-forest-500" />
              《{song.name}》音频文件列表 · 共 {song.audioFiles.length} 个版本
            </h3>
          </div>
          <div className="space-y-2.5">
            {song.audioFiles.map((af, idx) => {
              const isLatest = idx === song.audioFiles.length - 1;
              const fileHistory = song.history.filter((h) => h.audioFileId === af.id);
              const expandKey = af.id;
              const expanded = expandedFiles[expandKey] ?? isLatest;
              return (
                <div
                  key={af.id}
                  className={`rounded-xl border transition-all ${
                    isLatest
                      ? 'border-copper-200 bg-copper-50/40 shadow-sm'
                      : 'border-ink-100 bg-white/60 hover:bg-white'
                  }`}
                >
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => toggleExpand(expandKey)}>
                    <button className="w-8 h-8 rounded-lg bg-ink-50 flex items-center justify-center text-ink-500 shrink-0">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${VOICE_COLORS[(['soprano','alto','tenor','bass'] as VoiceType[])[idx % 4]]}30, ${VOICE_COLORS[(['soprano','alto','tenor','bass'] as VoiceType[])[idx % 4]]}10)`,
                      }}
                    >
                      <FileAudio size={18} style={{ color: VOICE_COLORS[(['soprano','alto','tenor','bass'] as VoiceType[])[idx % 4]] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-ink-900 truncate">{af.fileName}</p>
                        {isLatest && (
                          <span className="tag bg-copper-100 text-copper-800 border-copper-200 !text-[10px]">
                            当前使用版本
                          </span>
                        )}
                        <span className="tag bg-ink-50 text-ink-600 border-ink-200 !text-[10px]">
                          {af.versionTag}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-500 mt-1 truncate font-mono">
                        {af.filePath}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-0.5">
                      <p className="text-xs text-ink-700 font-medium">
                        {formatSeconds(af.duration)}
                      </p>
                      <p className="text-[10px] text-ink-500">{af.createdAt.slice(5, 16)}</p>
                    </div>
                  </div>

                  {expanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-ink-100/60 ml-11 pl-3">
                      <div className="flex items-center gap-3 text-[11px] text-ink-500 mb-3 mt-3">
                        <span className="flex items-center gap-1">
                          <Paperclip size={12} /> 本文件相关操作记录（{fileHistory.length}条）
                        </span>
                      </div>
                      {fileHistory.length === 0 ? (
                        <p className="text-xs text-ink-400">暂无记录</p>
                      ) : (
                        <div className="space-y-2">
                          {fileHistory.map((h) => {
                            const meta = historyTypeIcons[h.type] ?? historyTypeIcons.upload;
                            return (
                              <div
                                key={h.id}
                                className={`p-3 rounded-xl border ${meta.color}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base">{meta.icon}</span>
                                    <span className="font-medium text-xs">{h.description}</span>
                                    <span className="tag !text-[9px] opacity-70 !py-0">
                                      {meta.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] opacity-70">{h.timestamp.slice(5, 16)}</span>
                                </div>
                                <p className="text-[11px] opacity-80 flex items-center gap-1 mb-1">
                                  <User size={11} /> {h.operator}
                                </p>
                                {h.noteContent && (
                                  <blockquote className="mt-2 pl-3 border-l-2 border-current/30 text-[12px] leading-relaxed font-serif italic opacity-90">
                                    "{h.noteContent}"
                                  </blockquote>
                                )}
                                {h.screenshotUrl && (
                                  <div className="mt-2 flex items-start gap-2">
                                    <img
                                      src={h.screenshotUrl}
                                      alt="历史截图"
                                      className="w-36 h-20 object-cover rounded-lg border border-white/60 shadow-sm hover:shadow-md transition-all cursor-zoom-in"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] flex items-center gap-1 opacity-80">
                                        <Image size={11} /> 旧版本波形对比截图
                                      </p>
                                      <p className="text-[10px] opacity-60 mt-1">
                                        点击可放大对比，所有截图永久保留
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 右：追加备注 + 声部信息 */}
        <div className="space-y-6 lg:col-span-2">
          <div className="page-card">
            <h3 className="section-title mb-0 !text-base">
              <Pin size={16} className="text-copper-500" />
              追加备注（不可删除，只可追加）
            </h3>
            <p className="text-[11px] text-ink-500 mt-1 mb-4">
              备注会永久写入历史时间轴，演出/发行同事交接时也能看到
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-500 w-14 shrink-0">备注人</span>
                <select
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="input-field !py-2 !text-xs flex-1"
                >
                  <option>阿蓝</option>
                  <option>王老师</option>
                  <option>李老师</option>
                  <option>张老师</option>
                </select>
              </div>
              <div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="例：女高音第2小节进拍有进步，比上次稳很多…"
                  rows={4}
                  className="input-field !text-sm resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-ink-400">
                  写人话，别写技术参数。交接时给同事看的就是这些。
                </p>
                <button
                  onClick={submitNote}
                  disabled={!noteText.trim()}
                  className="btn-copper !py-2 !px-4 !text-xs"
                >
                  <Plus size={14} />
                  追加到历史
                </button>
              </div>
            </div>

            <div className="divider-dashed" />

            <h3 className="section-title mb-3 !text-base">
              <Image size={16} className="text-blue-500" />
              上传旧版本截图
            </h3>
            <div className="border-2 border-dashed border-ink-200 rounded-xl p-4 text-center hover:border-forest-300 hover:bg-forest-50/30 transition-all cursor-pointer">
              <Image size={22} className="mx-auto text-ink-400 mb-2" />
              <p className="text-xs text-ink-600 font-medium">拖入或点击上传截图</p>
              <p className="text-[10px] text-ink-500 mt-1">
                PNG / JPG · 用于存档对比，不替代原始音频
              </p>
            </div>
          </div>

          <div className="page-card">
            <h3 className="section-title mb-3 !text-base">
              <Clock size={16} className="text-forest-500" />
              最近历史操作摘要
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredHistory.slice().reverse().slice(0, 10).map((h) => {
                const meta = historyTypeIcons[h.type] ?? historyTypeIcons.upload;
                return (
                  <div
                    key={h.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-ink-50 transition-all"
                  >
                    <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-ink-800">
                          {h.description}
                        </span>
                        <span className={`tag ${meta.color} !text-[9px] !py-0`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        {h.operator} · {h.timestamp.slice(5, 16)}
                      </p>
                      {h.noteContent && (
                        <p className="text-[11px] text-ink-600 mt-1 font-serif italic line-clamp-2">
                          {h.noteContent}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="page-card">
            <h3 className="section-title mb-3 !text-base">
              <Music size={16} className="text-forest-500" />
              声部结构
            </h3>
            <div className="space-y-2">
              {song.voiceTracks.map((vt) => {
                const exCount = batch.exceptions.filter(
                  (e) =>
                    e.songId === song.id &&
                    song.voiceTracks.find((v) => v.id === e.voiceTrackId)?.voiceType ===
                      vt.voiceType
                ).length;
                return (
                  <div
                    key={vt.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-ink-100 hover:bg-ink-50/50 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: VOICE_COLORS[vt.voiceType] }}
                      />
                      <div>
                        <p className="text-sm font-medium text-ink-900">
                          {VOICE_LABELS[vt.voiceType]}
                        </p>
                        <p className="text-[10px] text-ink-500">
                          共 {vt.energyCurve.length} 个数据采样点
                        </p>
                      </div>
                    </div>
                    {exCount > 0 ? (
                      <span className="tag bg-copper-50 text-copper-700 border-copper-200 !text-[10px]">
                        {exCount} 处异常
                      </span>
                    ) : (
                      <span className="tag bg-forest-50 text-forest-700 border-forest-200 !text-[10px]">
                        ✓ 状态良好
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
