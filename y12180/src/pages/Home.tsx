import { useState, useEffect, useRef } from 'react';
import { Plus, Upload, Trash2, Play, Search, Filter } from 'lucide-react';
import { useStore } from '../store/useStore';
import Loading from '../components/Loading';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import { cn } from '../lib/utils';
import { formatDuration } from '../lib/utils';

export default function Home() {
  const {
    songs,
    loading,
    error,
    pagination,
    fetchSongs,
    addSong,
    importSongs,
    deleteSong,
    setError,
  } = useStore();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSong, setNewSong] = useState({ name: '', artist: '', duration: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSongs({ search: search || undefined });
  }, [search]);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSong.name.trim() || !newSong.artist.trim()) {
      setToast({ message: '请填写歌曲名称和歌手', type: 'error' });
      return;
    }
    await addSong({
      name: newSong.name.trim(),
      artist: newSong.artist.trim(),
      duration: newSong.duration ? parseInt(newSong.duration) : undefined,
    });
    setShowAddModal(false);
    setNewSong({ name: '', artist: '', duration: '' });
    setToast({ message: '歌曲添加成功', type: 'success' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await importSongs(file);
    if (result.errors.length > 0) {
      setToast({ message: `导入完成：成功 ${result.imported} 条，失败 ${result.errors.length} 条`, type: 'info' });
    } else {
      setToast({ message: `成功导入 ${result.imported} 首歌曲`, type: 'success' });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`确定要删除歌曲「${name}」吗？`)) {
      await deleteSong(id);
      setToast({ message: '删除成功', type: 'success' });
    }
  };

  return (
    <div className="p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {error && (
        <Toast message={error} type="error" onClose={() => setError(null)} />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">点歌单列表</h1>
        <p className="text-slate-500 mt-1">管理直播点歌单，导入歌曲并进行版权过滤</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索歌曲名称或歌手..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button className="p-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Filter className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium"
            >
              <Upload className="w-5 h-5" />
              导入Excel
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm shadow-blue-600/20"
            >
              <Plus className="w-5 h-5" />
              添加歌曲
            </button>
          </div>
        </div>

        {loading && songs.length === 0 ? (
          <div className="p-12">
            <Loading text="加载中..." />
          </div>
        ) : songs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无歌曲</h3>
            <p className="text-slate-500 mb-4">点击「添加歌曲」或「导入Excel」开始添加点歌单</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              添加歌曲
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      歌曲名称
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      歌手
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      时长
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      来源
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      添加时间
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {songs.map((song, index) => (
                    <tr
                      key={song.id}
                      className={cn(
                        'hover:bg-slate-50 transition-colors',
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{song.name}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{song.artist}</td>
                      <td className="px-6 py-4 text-slate-600">{formatDuration(song.duration)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {song.source === 'playlist' ? '点歌单' : '曲库'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(song.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(song.id, song.name)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                共 {pagination.songs.total} 条记录，第 {pagination.songs.page} / {pagination.songs.totalPages} 页
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={pagination.songs.page <= 1}
                  onClick={() => fetchSongs({ page: pagination.songs.page - 1, search: search || undefined })}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                >
                  上一页
                </button>
                <button
                  disabled={pagination.songs.page >= pagination.songs.totalPages}
                  onClick={() => fetchSongs({ page: pagination.songs.page + 1, search: search || undefined })}
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
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="添加歌曲"
      >
        <form onSubmit={handleAddSong} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              歌曲名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newSong.name}
              onChange={(e) => setNewSong({ ...newSong, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入歌曲名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              歌手 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newSong.artist}
              onChange={(e) => setNewSong({ ...newSong, artist: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入歌手名称"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              时长（秒）
            </label>
            <input
              type="number"
              value={newSong.duration}
              onChange={(e) => setNewSong({ ...newSong, duration: e.target.value })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入歌曲时长（秒）"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2.5 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              添加
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
