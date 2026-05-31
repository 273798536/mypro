import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Lock,
  Unlock,
  Pencil,
  Shield,
  History,
  FileText,
  Trash2,
  X,
  Music,
} from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { useStore } from '@/store';
import { formatDateTime } from '@/utils/helpers';

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-forest' : score >= 60 ? 'text-amber' : 'text-alert';
  const bg =
    score >= 80
      ? 'bg-forest/10'
      : score >= 60
        ? 'bg-amber/10'
        : 'bg-alert/10';
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-sm font-semibold ${color} ${bg}`}
    >
      {score}分
    </span>
  );
}

export default function PlaylistListPage() {
  const navigate = useNavigate();
  const playlists = useStore((s) => s.playlists);
  const createPlaylist = useStore((s) => s.createPlaylist);
  const deletePlaylist = useStore((s) => s.deletePlaylist);
  const validatePlaylist = useStore((s) => s.validatePlaylist);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    const results: Record<string, number> = {};
    playlists.forEach((pl) => {
      results[pl.id] = validatePlaylist(pl.id).score;
    });
    setScores(results);
  }, [playlists, validatePlaylist]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const playlist = createPlaylist(newName.trim(), newDesc.trim(), []);
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
    navigate(`/playlist/${playlist.id}`);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定删除该歌单？')) {
      deletePlaylist(id);
    }
  };

  return (
    <PageContainer title="歌单管理">
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-medium text-cream hover:bg-navy/90"
        >
          <Plus className="h-4 w-4" />
          新建歌单
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50">
          <div className="w-full max-w-md rounded-lg bg-cream p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-charcoal">新建歌单</h2>
              <button onClick={() => setShowCreate(false)}>
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="歌单名称"
              className="mb-3 w-full rounded border border-pale bg-white px-3 py-2 text-charcoal placeholder:text-muted"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="歌单描述（可选）"
              className="mb-4 w-full rounded border border-pale bg-white px-3 py-2 text-charcoal placeholder:text-muted"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded px-4 py-2 text-sm text-muted hover:text-charcoal"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="rounded bg-navy px-4 py-2 text-sm font-medium text-cream hover:bg-navy/90"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {playlists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted">
          <Music className="mb-4 h-12 w-12" />
          <p className="text-lg">暂无歌单</p>
          <p className="mt-1 text-sm">点击「新建歌单」开始创建</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {playlists.map((pl) => (
          <div
            key={pl.id}
            className="rounded-lg border border-pale bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-charcoal">{pl.name}</h3>
              {pl.isLocked ? (
                <Lock className="h-4 w-4 shrink-0 text-alert" />
              ) : (
                <Unlock className="h-4 w-4 shrink-0 text-forest" />
              )}
            </div>

            {pl.description && (
              <p className="mb-3 line-clamp-2 text-sm text-muted">
                {pl.description}
              </p>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span>{pl.songs.length} 首歌曲</span>
              <span>·</span>
              <span>v{pl.version}</span>
              <span>·</span>
              <ScoreBadge score={scores[pl.id] ?? 0} />
            </div>

            <div className="mb-4 text-xs text-muted">
              <span>{pl.createdBy}</span>
              <span className="mx-1">·</span>
              <span>{formatDateTime(pl.createdAt)}</span>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-pale pt-3">
              <Link
                to={`/playlist/${pl.id}`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-navy hover:bg-navy/10"
              >
                <Pencil className="h-3 w-3" />
                编辑
              </Link>
              <Link
                to={`/playlist/${pl.id}/validate`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-navy hover:bg-navy/10"
              >
                <Shield className="h-3 w-3" />
                校验
              </Link>
              <Link
                to={`/playlist/${pl.id}/history`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-navy hover:bg-navy/10"
              >
                <History className="h-3 w-3" />
                历史
              </Link>
              <Link
                to={`/playlist/${pl.id}/report`}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-navy hover:bg-navy/10"
              >
                <FileText className="h-3 w-3" />
                报告
              </Link>
              <button
                onClick={() => handleDelete(pl.id)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-alert hover:bg-alert/10"
              >
                <Trash2 className="h-3 w-3" />
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
