import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { useTrackStore } from '@/store/useTrackStore';
import { useSampleStore } from '@/store/useSampleStore';
import { useLicenseStore } from '@/store/useLicenseStore';
import { formatDate } from '@/utils/dateUtils';
import { Plus, Filter, ArrowLeft, Save, Disc, User, Calendar, Eye, AlertTriangle } from 'lucide-react';

export const Tracks = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tracks, getTrackById, addTrack } = useTrackStore();
  const { samples } = useSampleStore();
  const { licenses } = useLicenseStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    artist: '',
    album: '',
    sampleIds: [] as string[],
  });

  const filteredTracks = tracks.filter((track) =>
    track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (id === 'new') {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newTrack = {
        id: 't_' + Date.now(),
        ...formData,
        createdBy: '音乐制作人',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        versions: [],
      };
      addTrack(newTrack);
      navigate('/tracks');
    };

    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="曲目项目库" />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/tracks')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <h2 className="text-2xl font-bold text-white">新增曲目项目</h2>
            </div>

            <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    曲目名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="输入曲目名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    艺术家 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="输入艺术家名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    专辑
                  </label>
                  <input
                    type="text"
                    value={formData.album}
                    onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="输入专辑名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    关联采样素材
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-primary/30 rounded-lg p-3">
                    {samples.map((sample) => (
                      <label key={sample.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.sampleIds.includes(sample.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, sampleIds: [...formData.sampleIds, sample.id] });
                            } else {
                              setFormData({ ...formData, sampleIds: formData.sampleIds.filter((id) => id !== sample.id) });
                            }
                          }}
                          className="rounded border-white/20 bg-primary/50 text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-white">{sample.name}</span>
                        <span className="text-xs text-gray-400">({sample.source})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/tracks')}
                    className="px-6 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (id) {
    const track = getTrackById(id);
    if (!track) {
      return (
        <div className="flex-1 flex flex-col min-h-screen">
          <Header title="曲目项目库" />
          <main className="flex-1 p-6 overflow-auto">
            <p className="text-gray-400">曲目不存在</p>
          </main>
        </div>
      );
    }

    const relatedSamples = samples.filter((s) => track.sampleIds.includes(s.id));
    const relatedLicenses = licenses.filter((l) => l.trackIds.includes(id));

    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="曲目项目库" />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/tracks')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <h2 className="text-2xl font-bold text-white">{track.name}</h2>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">曲目信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Disc className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">曲目名称</p>
                        <p className="text-sm text-white">{track.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">艺术家</p>
                        <p className="text-sm text-white">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Disc className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">专辑</p>
                        <p className="text-sm text-white">{track.album || '-'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">创建日期</p>
                        <p className="text-sm text-white">{formatDate(track.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {track.isMissingLicense && (
                  <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-danger mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-danger">授权缺失警告</p>
                        <p className="text-xs text-gray-400 mt-1">
                          该曲目尚未关联任何授权报告，请尽快补全授权信息
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">使用的采样素材</h3>
                  {relatedSamples.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无关联素材</p>
                  ) : (
                    <div className="space-y-3">
                      {relatedSamples.map((sample) => (
                        <div
                          key={sample.id}
                          className="p-3 rounded-lg bg-primary/50 hover:bg-primary/70 cursor-pointer transition-colors"
                          onClick={() => navigate(`/samples/${sample.id}`)}
                        >
                          <p className="text-sm font-medium text-white">{sample.name}</p>
                          <p className="text-xs text-gray-400">{sample.source}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">关联授权</h3>
                  {relatedLicenses.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无关联授权</p>
                  ) : (
                    <div className="space-y-3">
                      {relatedLicenses.map((license) => (
                        <div
                          key={license.id}
                          className="p-3 rounded-lg bg-primary/50 hover:bg-primary/70 cursor-pointer transition-colors"
                          onClick={() => navigate(`/licenses/${license.id}`)}
                        >
                          <p className="text-sm font-medium text-white">{license.name}</p>
                          <p className="text-xs text-gray-400">{license.type}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Header title="曲目项目库" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索曲目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-lg bg-secondary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 w-64 transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
              <Filter className="w-4 h-4" />
              筛选
            </button>
          </div>
          <button
            onClick={() => navigate('/tracks/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增曲目
          </button>
        </div>

        <div className="bg-secondary/50 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  曲目名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  艺术家
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  专辑
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  素材数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  创建日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredTracks.map((track) => (
                <tr
                  key={track.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/tracks/${track.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">{track.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{track.artist}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{track.album || '-'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{track.sampleIds.length} 个</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{formatDate(track.createdAt)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {track.isMissingLicense ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-danger/20 text-danger">
                        授权缺失
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
                        正常
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Eye className="w-4 h-4 text-accent inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};
