import { useState, useEffect } from 'react';
import { AlertTriangle, Search, User, Music, MapPin, Clock, CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Loading from '../components/Loading';
import RiskBadge from '../components/RiskBadge';
import Toast from '../components/Toast';
import Modal from '../components/Modal';
import { CONFLICT_TYPE_LABELS, RISK_LEVEL_LABELS } from '../../shared/types';
import type { Conflict, MatchResult, Song, Copyright, RiskLevel } from '../../shared/types';
import { cn, formatDate } from '../lib/utils';

export default function Conflicts() {
  const navigate = useNavigate();
  const {
    conflicts,
    loading,
    error,
    pagination,
    fetchConflicts,
    resolveConflict,
    setError,
  } = useStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<(Conflict & { matchResult?: MatchResult & { song?: Song; copyright?: Copyright } }) | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveChoice, setResolveChoice] = useState<'playlist' | 'copyright' | 'custom'>('playlist');
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    fetchConflicts({ status: statusFilter || undefined });
  }, [statusFilter]);

  const getConflictIcon = (type: Conflict['type']) => {
    switch (type) {
      case 'name_mismatch':
        return <Music className="w-4 h-4" />;
      case 'artist_mismatch':
        return <User className="w-4 h-4" />;
      case 'region_conflict':
        return <MapPin className="w-4 h-4" />;
      case 'license_expired':
        return <Clock className="w-4 h-4" />;
      case 'cover_version':
        return <Music className="w-4 h-4" />;
    }
  };

  const getConflictColor = (type: Conflict['type']) => {
    switch (type) {
      case 'name_mismatch':
        return 'text-purple-600 bg-purple-50';
      case 'artist_mismatch':
        return 'text-blue-600 bg-blue-50';
      case 'region_conflict':
        return 'text-orange-600 bg-orange-50';
      case 'license_expired':
        return 'text-red-600 bg-red-50';
      case 'cover_version':
        return 'text-amber-600 bg-amber-50';
    }
  };

  const getStatusBadge = (status: Conflict['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
            <AlertTriangle className="w-3 h-3" />
            待处理
          </span>
        );
      case 'resolved_playlist':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            <CheckCircle className="w-3 h-3" />
            以点歌单为准
          </span>
        );
      case 'resolved_copyright':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
            <CheckCircle className="w-3 h-3" />
            以版权库为准
          </span>
        );
      case 'resolved_custom':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
            <CheckCircle className="w-3 h-3" />
            自定义处理
          </span>
        );
    }
  };

  const handleResolve = async () => {
    if (!selectedConflict) return;
    setResolving(true);
    try {
      const statusMap = {
        playlist: 'resolved_playlist',
        copyright: 'resolved_copyright',
        custom: 'resolved_custom',
      };
      await resolveConflict(selectedConflict.id, {
        status: statusMap[resolveChoice],
        resolution: resolveNote || `选择以${resolveChoice === 'playlist' ? '点歌单' : resolveChoice === 'copyright' ? '版权库' : '自定义'}为准`,
      });
      setToast({ message: '冲突已解决', type: 'success' });
      setShowResolveModal(false);
      setSelectedConflict(null);
      setResolveNote('');
    } catch (e) {
      setToast({ message: '处理失败，请重试', type: 'error' });
    } finally {
      setResolving(false);
    }
  };

  const filteredConflicts = conflicts.filter(c => {
    if (!search) return true;
    const matchResult = c.matchResult as MatchResult & { song?: Song; copyright?: Copyright } | undefined;
    const songName = matchResult?.song?.name?.toLowerCase() || '';
    const artist = matchResult?.song?.artist?.toLowerCase() || '';
    return songName.includes(search.toLowerCase()) || artist.includes(search.toLowerCase());
  });

  return (
    <div className="p-6">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">冲突处理</h1>
          <p className="text-slate-500 mt-1">点歌单与版权库数据冲突，人工选择处理方案</p>
        </div>
        <div className="text-sm text-slate-500">
          待处理: <span className="font-semibold text-orange-600">{conflicts.filter(c => c.status === 'pending').length}</span> 条
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索歌曲或歌手..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">全部状态</option>
              <option value="pending">待处理</option>
              <option value="resolved_playlist">以点歌单为准</option>
              <option value="resolved_copyright">以版权库为准</option>
              <option value="resolved_custom">自定义处理</option>
            </select>
          </div>
        </div>

        {loading && filteredConflicts.length === 0 ? (
          <div className="p-12">
            <Loading text="加载中..." />
          </div>
        ) : filteredConflicts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无冲突记录</h3>
            <p className="text-slate-500">所有数据匹配一致，无需人工干预</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {filteredConflicts.map((conflict, index) => {
                const matchResult = conflict.matchResult as MatchResult & { song?: Song; copyright?: Copyright } | undefined;
                return (
                  <div
                    key={conflict.id}
                    className={cn(
                      'p-6 hover:bg-slate-50 transition-colors',
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          getConflictColor(conflict.type)
                        )}>
                          {getConflictIcon(conflict.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-slate-900">
                              {matchResult?.song?.name || '未知歌曲'}
                            </h3>
                            {getStatusBadge(conflict.status)}
                            {matchResult?.riskLevel && (
                              <RiskBadge level={matchResult.riskLevel as RiskLevel} />
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mb-2">
                            歌手: {matchResult?.song?.artist || '未知'} · {CONFLICT_TYPE_LABELS[conflict.type]}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>冲突ID: {conflict.id.slice(0, 8)}</span>
                            <span>·</span>
                            <span>{formatDate(conflict.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/song/${conflict.matchResultId}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          查看详情
                        </button>
                        {conflict.status === 'pending' && (
                          <button
                            onClick={() => {
                              setSelectedConflict(conflict);
                              setShowResolveModal(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            处理冲突
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-700">点歌单数据</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-red-600 font-medium">歌名:</span>{' '}
                            <span className="text-slate-700">{(conflict.playlistData as Partial<Song>).name || '-'}</span>
                          </p>
                          <p>
                            <span className="text-red-600 font-medium">歌手:</span>{' '}
                            <span className="text-slate-700">{(conflict.playlistData as Partial<Song>).artist || '-'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                          <XCircle className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-semibold text-blue-700">版权库数据</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="text-blue-600 font-medium">歌名:</span>{' '}
                            <span className="text-slate-700">{(conflict.copyrightData as Partial<Copyright>).songName || '-'}</span>
                          </p>
                          <p>
                            <span className="text-blue-600 font-medium">歌手:</span>{' '}
                            <span className="text-slate-700">{(conflict.copyrightData as Partial<Copyright>).artist || '-'}</span>
                          </p>
                          {(conflict.copyrightData as Partial<Copyright>).authorizedRegions && (
                            <p>
                              <span className="text-blue-600 font-medium">授权地区:</span>{' '}
                              <span className="text-slate-700">{(conflict.copyrightData as Partial<Copyright>).authorizedRegions?.join(', ') || '-'}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {conflict.status !== 'pending' && conflict.resolution && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium text-slate-700">处理结果:</span> {conflict.resolution}
                        </p>
                        {conflict.resolvedAt && (
                          <p className="text-xs text-slate-400 mt-1">
                            处理时间: {formatDate(conflict.resolvedAt)} · 处理人: {conflict.resolvedBy || '管理员'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                共 {pagination.conflicts.total} 条记录，第 {pagination.conflicts.page} /{' '}
                {pagination.conflicts.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.conflicts.page <= 1}
                  onClick={() =>
                    fetchConflicts({
                      page: pagination.conflicts.page - 1,
                      status: statusFilter || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={pagination.conflicts.page >= pagination.conflicts.totalPages}
                  onClick={() =>
                    fetchConflicts({
                      page: pagination.conflicts.page + 1,
                      status: statusFilter || undefined,
                    })
                  }
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={showResolveModal}
        onClose={() => !resolving && setShowResolveModal(false)}
        title="处理冲突"
      >
        {selectedConflict && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                请仔细核对两边数据，选择以哪一方为准或自定义处理方案。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setResolveChoice('playlist')}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  resolveChoice === 'playlist'
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-200 hover:border-red-300'
                )}
              >
                <div className="font-semibold text-red-700 mb-1">以点歌单为准</div>
                <p className="text-xs text-slate-600">
                  歌名: {(selectedConflict.playlistData as Partial<Song>).name}<br />
                  歌手: {(selectedConflict.playlistData as Partial<Song>).artist}
                </p>
              </button>

              <button
                onClick={() => setResolveChoice('copyright')}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  resolveChoice === 'copyright'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300'
                )}
              >
                <div className="font-semibold text-blue-700 mb-1">以版权库为准</div>
                <p className="text-xs text-slate-600">
                  歌名: {(selectedConflict.copyrightData as Partial<Copyright>).songName}<br />
                  歌手: {(selectedConflict.copyrightData as Partial<Copyright>).artist}
                </p>
              </button>
            </div>

            <button
              onClick={() => setResolveChoice('custom')}
              className={cn(
                'w-full p-4 rounded-lg border-2 text-left transition-all',
                resolveChoice === 'custom'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-slate-200 hover:border-purple-300'
              )}
            >
              <div className="font-semibold text-purple-700 mb-1">自定义处理</div>
              <p className="text-xs text-slate-600">
                不选择任何一方，手动标注处理结果（如需下线、联系版权方等）
              </p>
            </button>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                处理备注（可选）
              </label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                placeholder="请输入处理备注说明..."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowResolveModal(false)}
                disabled={resolving}
                className="px-5 py-2.5 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                disabled={resolving}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {resolving ? <Loading size="sm" /> : null}
                {resolving ? '处理中...' : '确认处理'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
