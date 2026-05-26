import React from 'react';
import { X, RotateCcw, Clock, User, FileText } from 'lucide-react';
import { VersionRecord } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface VersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRevert: (versionId: string) => void;
}

const VersionPanel: React.FC<VersionPanelProps> = ({
  isOpen,
  onClose,
  onRevert,
}) => {
  const { versions, annotations } = useAppStore();

  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="absolute top-4 right-4 bottom-14 w-80 bg-slate-900 border border-slate-700 rounded-lg shadow-xl flex flex-col z-20">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <h3 className="text-sm font-medium text-white">版本历史</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <X size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {versions.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <FileText size={20} className="text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">暂无版本记录</p>
            <p className="text-slate-500 text-xs mt-1">点击"保存版本"创建快照</p>
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="p-3 bg-slate-800 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs text-blue-400 font-medium">
                      v{versions.length - index}
                    </span>
                    <span className="text-xs text-slate-500 mx-2">·</span>
                    <span className="text-xs text-slate-400">
                      {formatDate(version.timestamp)}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-white mb-2 line-clamp-2">
                  {version.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                  <span className="flex items-center gap-1">
                    <User size={10} />
                    {version.author}
                  </span>
                  <span>{version.annotations.length} 标注</span>
                  <span>{version.pointclouds.length} 点云</span>
                </div>

                <button
                  onClick={() => onRevert(version.id)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>恢复此版本</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-slate-700 text-xs text-slate-500 text-center">
        共 {versions.length} 个版本 · 当前 {annotations.length} 标注
      </div>
    </div>
  );
};

export default VersionPanel;
