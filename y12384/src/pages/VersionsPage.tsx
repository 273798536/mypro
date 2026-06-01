import React, { useState } from 'react';
import { 
  GitCompare, Clock, User, FileText, Plus, Minus, Edit3, 
  CheckCircle, ChevronRight, ArrowLeftRight 
} from 'lucide-react';
import { usePlaylistStore } from '../store/usePlaylistStore';
import { Version } from '../types';

const changeTypeConfig = {
  add: { icon: Plus, color: 'text-success-600 bg-success-50', label: '添加' },
  remove: { icon: Minus, color: 'text-danger-600 bg-danger-50', label: '删除' },
  modify: { icon: Edit3, color: 'text-warning-600 bg-warning-50', label: '修改' },
  resolve: { icon: CheckCircle, color: 'text-primary-600 bg-primary-50', label: '解决' },
};

export const VersionsPage: React.FC = () => {
  const { versions, saveVersion } = usePlaylistStore();
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [compareVersion, setCompareVersion] = useState<Version | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');

  const handleSave = () => {
    if (saveNotes) {
      saveVersion(saveNotes);
      setShowSaveModal(false);
      setSaveNotes('');
    }
  };

  const getVersionChain = (version: Version): Version[] => {
    const chain: Version[] = [version];
    let current = version;
    while (current.parentVersionId) {
      const parent = versions.find((v) => v.id === current.parentVersionId);
      if (parent) {
        chain.unshift(parent);
        current = parent;
      } else {
        break;
      }
    }
    return chain;
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-800 font-display">
            版本历史
          </h1>
          <p className="text-surface-500 mt-1">
            追踪歌单的修改历史，对比不同版本差异
          </p>
        </div>
        <button
          onClick={() => setShowSaveModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <GitCompare className="w-4 h-4" />
          保存新版本
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-surface-800 mb-4 font-display">
              版本时间线
            </h3>
            <div className="relative">
              <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-surface-200" />
              <div className="space-y-6">
                {[...versions].reverse().map((version, index) => (
                  <div
                    key={version.id}
                    className="relative pl-10 cursor-pointer group"
                    onClick={() => setSelectedVersion(version)}
                  >
                    <div
                      className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        selectedVersion?.id === version.id
                          ? 'bg-primary-600 text-white scale-110'
                          : 'bg-white border-2 border-surface-300 group-hover:border-primary-400'
                      }`}
                    >
                      <span className="text-xs font-bold">
                        {version.versionNumber.split('.')[1]}
                      </span>
                    </div>
                    <div
                      className={`p-4 rounded-lg transition-all ${
                        selectedVersion?.id === version.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-surface-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-surface-800">
                          {version.versionNumber}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-600 text-xs rounded-full">
                            当前
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-surface-500 mt-1 line-clamp-2">
                        {version.notes}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-surface-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {version.modifiedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(version.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedVersion ? (
            <>
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-surface-800 font-display">
                      {selectedVersion.versionNumber} 版本详情
                    </h3>
                    <p className="text-sm text-surface-500 mt-1">
                      {selectedVersion.notes}
                    </p>
                  </div>
                  <button
                    onClick={() => setCompareVersion(selectedVersion)}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    对比
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-surface-50 rounded-lg">
                    <p className="text-sm text-surface-500">修改人</p>
                    <p className="font-semibold text-surface-800 mt-1">
                      {selectedVersion.modifiedBy}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 rounded-lg">
                    <p className="text-sm text-surface-500">创建时间</p>
                    <p className="font-semibold text-surface-800 mt-1">
                      {new Date(selectedVersion.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-surface-50 rounded-lg">
                    <p className="text-sm text-surface-500">变更数量</p>
                    <p className="font-semibold text-surface-800 mt-1">
                      {selectedVersion.changes.length} 项
                    </p>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-surface-500 mb-3">
                  变更记录
                </h4>
                <div className="space-y-3">
                  {selectedVersion.changes.map((change, index) => {
                    const config = changeTypeConfig[change.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-surface-50 rounded-lg"
                      >
                        <div
                          className={`p-2 rounded-lg ${config.color.split(' ')[1]}`}
                        >
                          <Icon
                            className={`w-4 h-4 ${config.color.split(' ')[0]}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-medium ${config.color.split(' ')[0]}`}
                            >
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-surface-700 mt-1">
                            {change.description}
                          </p>
                          {change.oldValue && change.newValue && (
                            <div className="mt-2 text-xs">
                              <span className="text-danger-500 line-through">
                                {change.oldValue}
                              </span>
                              <span className="mx-2 text-surface-400">→</span>
                              <span className="text-success-600">
                                {change.newValue}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {getVersionChain(selectedVersion).length > 1 && (
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-surface-800 mb-4 font-display">
                    版本演变链
                  </h3>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {getVersionChain(selectedVersion).map((v, index) => (
                      <React.Fragment key={v.id}>
                        <div
                          className={`flex-shrink-0 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                            v.id === selectedVersion.id
                              ? 'bg-primary-600 text-white'
                              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                          }`}
                          onClick={() => setSelectedVersion(v)}
                        >
                          <span className="font-semibold">{v.versionNumber}</span>
                        </div>
                        {index < getVersionChain(selectedVersion).length - 1 && (
                          <ChevronRight className="w-5 h-5 text-surface-400 flex-shrink-0" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card p-12 text-center">
              <GitCompare className="w-12 h-12 text-surface-300 mx-auto mb-4" />
              <p className="text-surface-500 font-medium">选择一个版本查看详情</p>
              <p className="text-sm text-surface-400 mt-1">
                点击左侧时间线中的版本卡片
              </p>
            </div>
          )}
        </div>
      </div>

      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-surface-800 mb-4">
              保存新版本
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-surface-600 mb-2">
                版本说明
              </label>
              <textarea
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                placeholder="请输入本次修改的说明..."
                className="w-full px-4 py-3 border border-surface-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none h-32"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveNotes('');
                }}
                className="flex-1 btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!saveNotes.trim()}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
