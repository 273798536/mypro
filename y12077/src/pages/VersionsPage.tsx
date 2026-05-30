import { useState } from 'react';
import {
  History,
  Lock,
  Unlock,
  Trash2,
  Plus,
  Eye,
  FileText,
  Calendar,
  User,
  X,
  Check,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate } from '../utils/heatColor';

export function VersionsPage() {
  const {
    heatmapVersions,
    selectedVersionId,
    setSelectedVersionId,
    lockVersion,
    unlockVersion,
    deleteVersion,
    createNewVersion,
  } = useStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionRemark, setNewVersionRemark] = useState('');

  const handleCreateVersion = () => {
    if (newVersionName.trim()) {
      createNewVersion(newVersionName, newVersionRemark);
      setNewVersionName('');
      setNewVersionRemark('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <History size={28} className="text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">热图版本管理</h1>
              <p className="text-gray-400 text-sm">管理和对比不同版本的货位热图分析</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Plus size={18} />
            创建新版本
          </button>
        </div>

        <div className="grid gap-4">
          {heatmapVersions
            .slice()
            .reverse()
            .map((version, index) => (
              <div
                key={version.id}
                className={`bg-gray-900 rounded-xl border transition-all ${
                  selectedVersionId === version.id
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          version.isLocked
                            ? 'bg-yellow-900/50 text-yellow-400'
                            : 'bg-blue-900/50 text-blue-400'
                        }`}
                      >
                        {version.isLocked ? <Lock size={24} /> : <FileText size={24} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            {version.name}
                          </h3>
                          {version.isLocked && (
                            <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded">
                              已锁定
                            </span>
                          )}
                          {index === 0 && (
                            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
                              最新
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          {version.remark}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(version.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {version.createdBy}
                          </span>
                          <span>
                            {version.locationHeats.length} 个货位数据
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedVersionId(version.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                          selectedVersionId === version.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <Eye size={14} />
                        {selectedVersionId === version.id ? '使用中' : '查看'}
                      </button>
                      {version.isLocked ? (
                        <button
                          onClick={() => unlockVersion(version.id)}
                          className="p-1.5 rounded bg-gray-800 text-yellow-400 hover:bg-yellow-900/50 transition-colors"
                          title="解锁"
                        >
                          <Unlock size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => lockVersion(version.id)}
                          className="p-1.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors"
                          title="锁定版本"
                        >
                          <Lock size={16} />
                        </button>
                      )}
                      {!version.isLocked && (
                        <button
                          onClick={() => deleteVersion(version.id)}
                          className="p-1.5 rounded bg-gray-800 text-gray-400 hover:bg-red-900/50 hover:text-red-400 transition-colors"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">创建新版本</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded hover:bg-gray-800 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">版本名称</label>
                <input
                  type="text"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                  placeholder="例如：v6 - 优化版"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">版本说明</label>
                <textarea
                  value={newVersionRemark}
                  onChange={(e) => setNewVersionRemark(e.target.value)}
                  placeholder="描述这个版本的特点..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!newVersionName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={16} />
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
