import React, { useState } from 'react';
import { AlertTriangle, Users, Music, Megaphone, CheckCircle, Clock, FileText, X, MessageSquare } from 'lucide-react';
import { TraceChain } from '../components/TraceChain';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { Conflict, Severity } from '../types';

const conflictTypeConfig = {
  artist_repeat: {
    label: '同艺人连播',
    icon: Users,
    color: 'danger',
    bgClass: 'bg-danger-50',
    borderClass: 'border-danger-200',
    textClass: 'text-danger-600',
  },
  ad_clash: {
    label: '广告撞歌',
    icon: Megaphone,
    color: 'warning',
    bgClass: 'bg-warning-50',
    borderClass: 'border-warning-200',
    textClass: 'text-warning-600',
  },
  new_song_dense: {
    label: '新歌过密',
    icon: Music,
    color: 'warning',
    bgClass: 'bg-warning-50',
    borderClass: 'border-warning-200',
    textClass: 'text-warning-600',
  },
};

const severityConfig: Record<Severity, { label: string; class: string }> = {
  low: { label: '轻微', class: 'bg-surface-100 text-surface-600' },
  medium: { label: '中等', class: 'bg-warning-100 text-warning-700' },
  high: { label: '严重', class: 'bg-danger-100 text-danger-700' },
};

export const ConflictsPage: React.FC = () => {
  const {
    conflicts,
    selectedConflict,
    setSelectedConflict,
    resolveConflict,
    addCorrection,
    getTraceChain,
    corrections,
    currentPlaylist,
  } = usePlaylistStore();

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'artist_repeat' | 'ad_clash' | 'new_song_dense'>('all');
  const [showResolved, setShowResolved] = useState(true);

  const filteredConflicts = conflicts.filter((c) => {
    if (filterType !== 'all' && c.type !== filterType) return false;
    if (!showResolved && c.resolved) return false;
    return true;
  });

  const handleResolve = () => {
    if (selectedConflict && resolveNote) {
      resolveConflict(selectedConflict.id, resolveNote);
      addCorrection(selectedConflict.id, resolveNote, 'resolve');
      setShowResolveModal(false);
      setResolveNote('');
    }
  };

  const getRelatedSongs = (conflict: Conflict) => {
    return currentPlaylist?.items.filter((item) =>
      conflict.relatedItemIds.includes(item.id)
    );
  };

  const relatedCorrections = selectedConflict
    ? corrections.filter((c) => c.conflictId === selectedConflict.id)
    : [];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-3xl font-bold text-surface-800 font-display">
          冲突检测
        </h1>
        <p className="text-surface-500 mt-1">
          查看所有检测到的冲突，追溯问题根源，进行人工修正
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-surface-600 hover:bg-surface-50'
            }`}
          >
            全部 ({conflicts.length})
          </button>
          <button
            onClick={() => setFilterType('artist_repeat')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'artist_repeat'
                ? 'bg-danger-600 text-white'
                : 'bg-white text-surface-600 hover:bg-surface-50'
            }`}
          >
            同艺人连播
          </button>
          <button
            onClick={() => setFilterType('new_song_dense')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'new_song_dense'
                ? 'bg-warning-600 text-white'
                : 'bg-white text-surface-600 hover:bg-surface-50'
            }`}
          >
            新歌过密
          </button>
          <button
            onClick={() => setFilterType('ad_clash')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === 'ad_clash'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-surface-600 hover:bg-surface-50'
            }`}
          >
            广告撞歌
          </button>
        </div>
        <label className="flex items-center gap-2 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="w-4 h-4 rounded border-surface-300"
          />
          <span className="text-sm text-surface-600">显示已处理</span>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {filteredConflicts.map((conflict, index) => {
            const config = conflictTypeConfig[conflict.type];
            const Icon = config.icon;
            const isSelected = selectedConflict?.id === conflict.id;
            const songs = getRelatedSongs(conflict);

            return (
              <div
                key={conflict.id}
                className={`card p-5 cursor-pointer transition-all duration-300 animate-slide-up ${
                  isSelected ? 'ring-2 ring-primary-400 shadow-lg' : ''
                } ${conflict.resolved ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms`, opacity: isSelected ? 1 : undefined }}
                onClick={() => setSelectedConflict(conflict)}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${config.bgClass} ${config.textClass}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-surface-800 truncate">
                        {config.label}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig[conflict.severity].class}`}
                      >
                        {severityConfig[conflict.severity].label}
                      </span>
                      {conflict.resolved && (
                        <span className="flex items-center gap-1 text-xs text-success-600">
                          <CheckCircle className="w-3 h-3" />
                          已处理
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-surface-500 mt-1">
                      位置：第 {conflict.position + 1} 首歌附近
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-surface-400">
                      <FileText className="w-3 h-3" />
                      <span>触发：{conflict.triggeredBy.material}</span>
                    </div>
                    {songs && songs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {songs.slice(0, 3).map((song) => (
                          <span
                            key={song.id}
                            className="px-2 py-1 bg-surface-100 text-surface-600 text-xs rounded"
                          >
                            {song.song?.title}
                          </span>
                        ))}
                        {songs.length > 3 && (
                          <span className="px-2 py-1 text-surface-400 text-xs">
                            +{songs.length - 3} 首
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredConflicts.length === 0 && (
            <div className="card p-12 text-center">
              <CheckCircle className="w-12 h-12 text-success-400 mx-auto mb-4" />
              <p className="text-surface-600 font-medium">没有检测到冲突</p>
              <p className="text-sm text-surface-400 mt-1">
                所有歌单约束均已满足
              </p>
            </div>
          )}
        </div>

        <div>
          {selectedConflict ? (
            <div className="card p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-surface-800 font-display">
                  冲突详情
                </h3>
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="p-1 hover:bg-surface-100 rounded"
                >
                  <X className="w-5 h-5 text-surface-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-surface-500 mb-3">
                    问题溯源链
                  </h4>
                  <TraceChain nodes={getTraceChain(selectedConflict)} />
                </div>

                {relatedCorrections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      处理记录
                    </h4>
                    <div className="space-y-2">
                      {relatedCorrections.map((corr) => (
                        <div
                          key={corr.id}
                          className="p-3 bg-success-50 border border-success-200 rounded-lg"
                        >
                          <p className="text-sm text-success-700">{corr.content}</p>
                          <p className="text-xs text-success-500 mt-1">
                            {corr.createdBy} · {new Date(corr.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedConflict.resolved && (
                  <div className="pt-4 border-t border-surface-200">
                    <button
                      onClick={() => setShowResolveModal(true)}
                      className="w-full btn-primary flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      标记为已处理
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card p-12 text-center sticky top-6">
              <AlertTriangle className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <p className="text-surface-500 font-medium">选择一个冲突查看详情</p>
              <p className="text-sm text-surface-400 mt-1">
                点击左侧列表中的冲突卡片
              </p>
            </div>
          )}
        </div>
      </div>

      {showResolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">
              标记冲突已处理
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-600 mb-2">
                处理说明
              </label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="请输入处理说明，例如：已调整歌单顺序，将歌曲分散到不同时段..."
                className="w-full px-4 py-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none h-32"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveNote('');
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolveNote.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                确认处理
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
