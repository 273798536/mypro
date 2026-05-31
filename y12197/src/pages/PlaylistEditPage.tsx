import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Save,
  ShieldCheck,
  Lock,
  Unlock,
  Trash2,
  Plus,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/store';
import { generateId, formatDateTime } from '@/utils/helpers';
import { cn } from '@/lib/utils';
import type { Song } from '@/types';
import PageContainer from '@/components/layout/PageContainer';

type EditableField = 'title' | 'artist' | 'year' | 'genre' | 'language' | 'region';

export default function PlaylistEditPage() {
  const { id } = useParams<{ id: string }>();
  const {
    playlists,
    operationLogs,
    updateSong,
    deleteSong,
    lockPlaylist,
    unlockPlaylist,
    addSongs,
    saveToStorage,
  } = useStore();

  const playlist = playlists.find((p) => p.id === id);

  const [editing, setEditing] = useState<{
    songId: string;
    field: EditableField;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', artist: '', year: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    songId: string;
    songTitle: string;
  } | null>(null);
  const [deleteRemark, setDeleteRemark] = useState('');
  const [newTag, setNewTag] = useState('');

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editing]);

  const artistCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    playlist?.songs.forEach((s) => {
      counts[s.artist] = (counts[s.artist] || 0) + 1;
    });
    return counts;
  }, [playlist?.songs]);

  const editedFields = useMemo(() => {
    const set = new Set<string>();
    operationLogs.forEach((log) => {
      if (log.operationType === 'update' && log.songId && log.field) {
        set.add(`${log.songId}:${log.field}`);
      }
    });
    return set;
  }, [operationLogs]);

  const getEditLog = (songId: string, field: string) =>
    operationLogs
      .filter(
        (log) =>
          log.operationType === 'update' &&
          log.songId === songId &&
          log.field === field
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

  const selectedSong = playlist?.songs.find((s) => s.id === selectedSongId);

  const songLogs = useMemo(() => {
    if (!selectedSongId) return [];
    return operationLogs
      .filter((log) => log.songId === selectedSongId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  }, [selectedSongId, operationLogs]);

  const handleStartEdit = (
    songId: string,
    field: EditableField,
    value: string | number
  ) => {
    if (playlist?.isLocked) return;
    setEditing({ songId, field });
    setEditValue(String(value));
  };

  const handleSaveEdit = () => {
    if (!editing || !id) return;
    const updates: Partial<Song> = {};
    if (editing.field === 'year') {
      updates.year = parseInt(editValue, 10) || 0;
    } else {
      (updates as Record<string, unknown>)[editing.field] = editValue;
    }
    updateSong(id, editing.songId, updates);
    setEditing(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditing(null);
  };

  const handleDelete = () => {
    if (!deleteConfirm || !id) return;
    deleteSong(id, deleteConfirm.songId, deleteRemark || undefined);
    setDeleteConfirm(null);
    setDeleteRemark('');
    if (selectedSongId === deleteConfirm.songId) {
      setSelectedSongId(null);
    }
  };

  const handleAddSong = () => {
    if (!id || !addForm.title || !addForm.artist || !addForm.year) return;
    const song: Song = {
      id: generateId(),
      title: addForm.title,
      artist: addForm.artist,
      year: parseInt(addForm.year, 10),
      tags: [],
      genre: '',
      language: '',
      region: '',
      source: { filename: '手动添加', rowNumber: 0, importBatchId: generateId() },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addSongs(id, [song], `手动添加歌曲「${song.title}」`);
    setAddForm({ title: '', artist: '', year: '' });
    setShowAddForm(false);
  };

  const handleAddTag = () => {
    if (!selectedSong || !newTag.trim() || !id) return;
    if (selectedSong.tags.includes(newTag.trim())) return;
    updateSong(id, selectedSong.id, { tags: [...selectedSong.tags, newTag.trim()] });
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!selectedSong || !id) return;
    updateSong(id, selectedSong.id, {
      tags: selectedSong.tags.filter((t) => t !== tag),
    });
  };

  if (!playlist) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-96 text-muted text-lg">
          歌单不存在
        </div>
      </PageContainer>
    );
  }

  const renderEditableCell = (
    song: Song,
    field: EditableField,
    isCritical: boolean
  ) => {
    const isEditing = editing?.songId === song.id && editing?.field === field;
    const value = String(song[field]);
    const isEdited = editedFields.has(`${song.id}:${field}`);
    const editLog = isEdited ? getEditLog(song.id, field) : null;

    if (isEditing) {
      return (
        <input
          ref={editInputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="w-full px-1 py-0.5 border border-navy rounded text-sm bg-white outline-none"
        />
      );
    }

    return (
      <div
        className={cn(
          'group relative',
          isEdited && !isCritical && 'edited-cell',
          !playlist.isLocked && 'cursor-pointer'
        )}
        onDoubleClick={() => handleStartEdit(song.id, field, song[field])}
      >
        <span className={cn(isCritical && 'text-white')}>{value}</span>
        {isEdited && isCritical && (
          <span className="absolute top-0 right-0 w-0 h-0 border-t-[6px] border-t-blue-500 border-l-[6px] border-l-transparent" />
        )}
        {isEdited && editLog && (
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-50 bg-charcoal text-white text-xs rounded px-2 py-1.5 whitespace-nowrap shadow-lg">
            <div>
              {editLog.operator} · {formatDateTime(editLog.timestamp)}
            </div>
            <div>
              {editLog.oldValue} → {editLog.newValue}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageContainer className="p-0">
      <div className="flex h-screen">
        <div className="flex-1 min-w-0 p-6 overflow-y-auto scrollbar-thin">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-navy">{playlist.name}</h1>
              <span className="px-2 py-0.5 text-sm bg-navy/10 text-navy rounded">
                v{playlist.version} {playlist.versionName}
              </span>
              {playlist.isLocked && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-sm bg-alert/10 text-alert rounded">
                  <Lock size={14} /> 已锁定
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveToStorage()}
                className="flex items-center gap-1 px-3 py-1.5 bg-navy text-white rounded hover:bg-navy/90 text-sm"
              >
                <Save size={14} /> 保存
              </button>
              <Link
                to={`/validate/${id}`}
                className="flex items-center gap-1 px-3 py-1.5 bg-forest text-white rounded hover:bg-forest/90 text-sm"
              >
                <ShieldCheck size={14} /> 校验
              </Link>
              <button
                onClick={() =>
                  playlist.isLocked ? unlockPlaylist(id!) : lockPlaylist(id!)
                }
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded text-sm',
                  playlist.isLocked
                    ? 'bg-amber text-white hover:bg-amber/90'
                    : 'bg-charcoal text-white hover:bg-charcoal/90'
                )}
              >
                {playlist.isLocked ? (
                  <>
                    <Unlock size={14} /> 解锁
                  </>
                ) : (
                  <>
                    <Lock size={14} /> 锁定
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-pale text-charcoal">
                    <th className="px-3 py-2 text-left w-10">#</th>
                    <th className="px-3 py-2 text-left w-28">来源</th>
                    <th className="px-3 py-2 text-left">歌曲名</th>
                    <th className="px-3 py-2 text-left">歌手</th>
                    <th className="px-3 py-2 text-left w-16">年代</th>
                    <th className="px-3 py-2 text-left w-20">流派</th>
                    <th className="px-3 py-2 text-left w-20">语言</th>
                    <th className="px-3 py-2 text-left w-20">地区</th>
                    <th className="px-3 py-2 text-left">标签</th>
                    <th className="px-3 py-2 text-center w-16">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {playlist.songs.map((song, index) => {
                    const isCritical = artistCounts[song.artist] > 2;
                    return (
                      <tr
                        key={song.id}
                        className={cn(
                          'border-t border-pale hover:bg-cream/50 cursor-pointer transition-colors',
                          isCritical && 'issue-row-critical',
                          selectedSongId === song.id &&
                            !isCritical &&
                            'bg-edited/40'
                        )}
                        onClick={() =>
                          setSelectedSongId(
                            selectedSongId === song.id ? null : song.id
                          )
                        }
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            {isCritical && (
                              <AlertTriangle size={12} className="text-white" />
                            )}
                            <span className={cn(isCritical && 'text-white')}>
                              {index + 1}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="source-badge">
                            {song.source.filename}
                          </span>
                        </td>
                        <td className="px-3 py-2 overflow-visible">
                          {renderEditableCell(song, 'title', isCritical)}
                        </td>
                        <td className="px-3 py-2 overflow-visible">
                          {renderEditableCell(song, 'artist', isCritical)}
                        </td>
                        <td className="px-3 py-2 overflow-visible">
                          {renderEditableCell(song, 'year', isCritical)}
                        </td>
                        <td className="px-3 py-2 overflow-visible">
                          {renderEditableCell(song, 'genre', isCritical)}
                        </td>
                        <td className="px-3 py-2 overflow-visible">
                          {renderEditableCell(song, 'language', isCritical)}
                        </td>
                        <td className="px-3 py-2 overflow-visible">
                          {renderEditableCell(song, 'region', isCritical)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {song.tags.map((tag) => (
                              <span
                                key={tag}
                                className={cn(
                                  'px-1.5 py-0.5 text-xs rounded',
                                  isCritical
                                    ? 'bg-white/20 text-white'
                                    : 'bg-navy/10 text-navy'
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm({
                                songId: song.id,
                                songTitle: song.title,
                              });
                            }}
                            className="p-1 text-alert hover:bg-alert/10 rounded"
                            disabled={playlist.isLocked}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-pale p-3">
              {showAddForm ? (
                <div className="flex items-center gap-2">
                  <input
                    placeholder="歌曲名 *"
                    value={addForm.title}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="px-2 py-1 border border-pale rounded text-sm flex-1"
                  />
                  <input
                    placeholder="歌手 *"
                    value={addForm.artist}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, artist: e.target.value }))
                    }
                    className="px-2 py-1 border border-pale rounded text-sm flex-1"
                  />
                  <input
                    placeholder="年代 *"
                    value={addForm.year}
                    onChange={(e) =>
                      setAddForm((f) => ({ ...f, year: e.target.value }))
                    }
                    className="px-2 py-1 border border-pale rounded text-sm w-20"
                    type="number"
                  />
                  <button
                    onClick={handleAddSong}
                    className="px-3 py-1 bg-forest text-white rounded text-sm hover:bg-forest/90"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="p-1 text-muted hover:text-charcoal"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1 text-sm text-navy hover:text-navy/80"
                  disabled={playlist.isLocked}
                >
                  <Plus size={16} /> 添加歌曲
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedSong && (
          <div className="w-80 border-l border-pale bg-white overflow-y-auto scrollbar-thin flex-shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-charcoal">歌曲详情</h3>
                <button
                  onClick={() => setSelectedSongId(null)}
                  className="text-muted hover:text-charcoal"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-sm mb-6">
                <div>
                  <span className="text-muted">歌曲名：</span>
                  {selectedSong.title}
                </div>
                <div>
                  <span className="text-muted">歌手：</span>
                  {selectedSong.artist}
                </div>
                <div>
                  <span className="text-muted">年代：</span>
                  {selectedSong.year}
                </div>
                <div>
                  <span className="text-muted">流派：</span>
                  {selectedSong.genre}
                </div>
                <div>
                  <span className="text-muted">语言：</span>
                  {selectedSong.language}
                </div>
                <div>
                  <span className="text-muted">地区：</span>
                  {selectedSong.region}
                </div>
                <div>
                  <span className="text-muted">来源：</span>
                  {selectedSong.source.filename} #{selectedSong.source.rowNumber}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-charcoal mb-2 text-sm">标签</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedSong.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-navy/10 text-navy rounded text-xs"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-alert"
                        disabled={playlist.isLocked}
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                {!playlist.isLocked && (
                  <div className="flex gap-1">
                    <input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="添加标签"
                      className="flex-1 px-2 py-1 border border-pale rounded text-xs"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-2 py-1 bg-navy text-white rounded text-xs hover:bg-navy/90"
                    >
                      添加
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium text-charcoal mb-2 text-sm">
                  修改历史
                </h4>
                {songLogs.length === 0 ? (
                  <p className="text-muted text-xs">暂无修改记录</p>
                ) : (
                  <div className="space-y-2">
                    {songLogs.map((log) => (
                      <div key={log.id} className="text-xs p-2 bg-cream rounded">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-medium text-charcoal">
                            {log.operator}
                          </span>
                          <span className="text-muted">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        <div className="text-muted">
                          {log.operationType === 'update' && log.field && (
                            <span>
                              {log.field}：{log.oldValue} → {log.newValue}
                            </span>
                          )}
                          {log.operationType === 'delete' && (
                            <span className="text-alert">删除</span>
                          )}
                          {log.remark && (
                            <span className="ml-1">({log.remark})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-charcoal/40 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-lg p-6 w-96 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-charcoal mb-2">
              确认删除
            </h3>
            <p className="text-sm text-muted mb-4">
              确定要删除「{deleteConfirm.songTitle}」吗？此操作不可撤销。
            </p>
            <textarea
              value={deleteRemark}
              onChange={(e) => setDeleteRemark(e.target.value)}
              placeholder="请输入删除原因（必填）"
              className="w-full px-3 py-2 border border-pale rounded text-sm mb-4 resize-none h-20"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-1.5 text-sm text-muted hover:text-charcoal"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={!deleteRemark.trim()}
                className="px-4 py-1.5 text-sm bg-alert text-white rounded hover:bg-alert/90 disabled:opacity-50"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
