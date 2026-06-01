import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/common/Header';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useLicenseStore } from '@/store/useLicenseStore';
import { useTrackStore } from '@/store/useTrackStore';
import { useSampleStore } from '@/store/useSampleStore';
import { formatDate, getDaysUntilExpiry } from '@/utils/dateUtils';
import { Plus, Filter, ArrowLeft, Save, FileCheck, Calendar, User, Eye, AlertTriangle, Edit3 } from 'lucide-react';

export const Licenses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { licenses, getLicenseById, addLicense, updateLicense, addManualEdit } = useLicenseStore();
  const { tracks } = useTrackStore();
  const { getSampleById } = useSampleStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'Commercial',
    startDate: '',
    endDate: '',
    trackIds: [] as string[],
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');

  const filteredLicenses = licenses.filter((license) =>
    license.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (id === 'new') {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const newLicense = {
        id: 'l_' + Date.now(),
        ...formData,
        status: 'active' as const,
        createdBy: '音乐制作人',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        versions: [],
        manualEdits: [],
      };
      addLicense(newLicense);
      navigate('/licenses');
    };

    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="授权报告库" />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/licenses')}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <h2 className="text-2xl font-bold text-white">新增授权报告</h2>
            </div>

            <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
              <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    授权名称 *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:border-accent/50 transition-colors"
                    placeholder="输入授权名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    授权类型
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors"
                  >
                    <option value="Commercial">Commercial</option>
                    <option value="Royalty Free">Royalty Free</option>
                    <option value="Standard">Standard</option>
                    <option value="Exclusive">Exclusive</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      开始日期 *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      结束日期 *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    关联曲目
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto bg-primary/30 rounded-lg p-3">
                    {tracks.map((track) => (
                      <label key={track.id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.trackIds.includes(track.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, trackIds: [...formData.trackIds, track.id] });
                            } else {
                              setFormData({ ...formData, trackIds: formData.trackIds.filter((id) => id !== track.id) });
                            }
                          }}
                          className="rounded border-white/20 bg-primary/50 text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-white">{track.name}</span>
                        <span className="text-xs text-gray-400">({track.artist})</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/licenses')}
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
    const license = getLicenseById(id);
    if (!license) {
      return (
        <div className="flex-1 flex flex-col min-h-screen">
          <Header title="授权报告库" />
          <main className="flex-1 p-6 overflow-auto">
            <p className="text-gray-400">授权不存在</p>
          </main>
        </div>
      );
    }

    const relatedTracks = tracks.filter((t) => license.trackIds.includes(t.id));
    const daysLeft = getDaysUntilExpiry(license.endDate);

    const handleManualEdit = () => {
      if (!editField || !editReason) return;

      const oldValue = (license as any)[editField];
      addManualEdit(license.id, {
        id: 'me_' + Date.now(),
        field: editField,
        oldValue,
        newValue: editValue,
        editedBy: '音乐制作人',
        editedAt: new Date().toISOString().split('T')[0],
        reason: editReason,
      });

      updateLicense(license.id, { [editField]: editValue } as any);
      setShowEditModal(false);
      setEditField('');
      setEditValue('');
      setEditReason('');
    };

    return (
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title="授权报告库" />
        <main className="flex-1 p-6 overflow-auto">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate('/licenses')}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
                <h2 className="text-2xl font-bold text-white">{license.name}</h2>
                <StatusBadge status={license.status} />
              </div>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                手动修改
              </button>
            </div>

            {showEditModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-secondary rounded-xl p-6 w-full max-w-md border border-white/10">
                  <h3 className="text-lg font-semibold text-white mb-4">手动修改授权信息</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        选择字段
                      </label>
                      <select
                        value={editField}
                        onChange={(e) => setEditField(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors"
                      >
                        <option value="">请选择</option>
                        <option value="endDate">到期日期</option>
                        <option value="type">授权类型</option>
                        <option value="name">授权名称</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        新值
                      </label>
                      <input
                        type={editField === 'endDate' ? 'date' : 'text'}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        修改原因 *
                      </label>
                      <textarea
                        value={editReason}
                        onChange={(e) => setEditReason(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg bg-primary/50 border border-white/10 text-white focus:outline-none focus:border-accent/50 transition-colors resize-none"
                        rows={3}
                        placeholder="请说明修改原因..."
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        onClick={() => setShowEditModal(false)}
                        className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleManualEdit}
                        className="flex-1 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
                      >
                        确认修改
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-6">
                <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">授权信息</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">授权名称</p>
                        <p className="text-sm text-white">{license.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FileCheck className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">授权类型</p>
                        <p className="text-sm text-white">{license.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">开始日期</p>
                        <p className="text-sm text-white">{formatDate(license.startDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">结束日期</p>
                        <p className="text-sm text-white">{formatDate(license.endDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">创建人</p>
                        <p className="text-sm text-white">{license.createdBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-accent" />
                      <div>
                        <p className="text-xs text-gray-400">剩余天数</p>
                        <p className={`text-sm ${daysLeft < 0 ? 'text-danger' : daysLeft <= 30 ? 'text-warning' : 'text-white'}`}>
                          {daysLeft < 0 ? '已过期' : `${daysLeft} 天`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {license.manualEdits.length > 0 && (
                  <div className="bg-warning/10 border border-warning/30 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-warning">人工修改记录</p>
                        <p className="text-xs text-gray-400">该授权存在人工修改记录，请谨慎核验</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {license.manualEdits.map((edit) => (
                        <div key={edit.id} className="bg-primary/30 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-sm text-white">
                                <span className="text-gray-400">字段：</span>{edit.field}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                原值：{String(edit.oldValue)} → 新值：{String(edit.newValue)}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                原因：{edit.reason}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">{edit.editedBy}</p>
                              <p className="text-xs text-gray-500">{formatDate(edit.editedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">关联曲目</h3>
                  {relatedTracks.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无关联曲目</p>
                  ) : (
                    <div className="space-y-3">
                      {relatedTracks.map((track) => (
                        <div
                          key={track.id}
                          className="p-3 rounded-lg bg-primary/50 hover:bg-primary/70 cursor-pointer transition-colors"
                          onClick={() => navigate(`/tracks/${track.id}`)}
                        >
                          <p className="text-sm font-medium text-white">{track.name}</p>
                          <p className="text-xs text-gray-400">{track.artist}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-secondary/50 rounded-xl p-6 border border-white/10">
                  <h3 className="text-lg font-semibold mb-4 text-white">关联采样素材</h3>
                  {(() => {
                    const sampleIds = new Set(relatedTracks.flatMap((t) => t.sampleIds));
                    if (sampleIds.size === 0) return <p className="text-sm text-gray-400">暂无关联素材</p>;
                    return (
                      <div className="space-y-3">
                        {Array.from(sampleIds).map((sid) => {
                          const sample = getSampleById(sid);
                          if (!sample) return null;
                          return (
                            <div
                              key={sample.id}
                              className="p-3 rounded-lg bg-primary/50 hover:bg-primary/70 cursor-pointer transition-colors"
                              onClick={() => navigate(`/samples/${sample.id}`)}
                            >
                              <p className="text-sm font-medium text-white">{sample.name}</p>
                              <p className="text-xs text-gray-400">{sample.source}</p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
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
      <Header title="授权报告库" />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索授权..."
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
            onClick={() => navigate('/licenses/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新增授权
          </button>
        </div>

        <div className="bg-secondary/50 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-primary/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  授权名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  开始日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  结束日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  曲目数量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  人工修改
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredLicenses.map((license) => (
                <tr
                  key={license.id}
                  className="hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => navigate(`/licenses/${license.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-white">{license.name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{license.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{formatDate(license.startDate)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{formatDate(license.endDate)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-300">{license.trackIds.length} 个</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={license.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {license.manualEdits.length > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
                        {license.manualEdits.length} 次
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
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
