import { MaterialRecord } from '../types';
import { materialRecords } from '../data/examples';

export const MaterialPanel = () => {
  const getStatusIcon = (status: MaterialRecord['status']) => {
    switch (status) {
      case 'available': return '✅';
      case 'missing': return '❌';
      case 'corrupted': return '⚠️';
      case 'outdated': return '🗓️';
      default: return '❓';
    }
  };

  const getStatusColor = (status: MaterialRecord['status']) => {
    switch (status) {
      case 'available': return 'bg-green-50 text-green-700 border-green-200';
      case 'missing': return 'bg-red-50 text-red-700 border-red-200';
      case 'corrupted': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'outdated': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusLabel = (status: MaterialRecord['status']) => {
    switch (status) {
      case 'available': return '正常';
      case 'missing': return '找不到了';
      case 'corrupted': return '打不开了';
      case 'outdated': return '版本旧了';
      default: return '未知';
    }
  };

  const getTypeLabel = (type: MaterialRecord['type']) => {
    switch (type) {
      case 'image': return '图片';
      case 'sound': return '音效';
      case 'sprite': return '角色';
      default: return '其他';
    }
  };

  const getTypeIcon = (type: MaterialRecord['type']) => {
    switch (type) {
      case 'image': return '🖼️';
      case 'sound': return '🔊';
      case 'sprite': return '🎭';
      default: return '📄';
    }
  };

  const issues = materialRecords.filter(m => m.status !== 'available');

  return (
    <div className="bg-white rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-bold text-gray-800 mb-3">📦 素材管理</h3>

      {issues.length > 0 && (
        <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 text-orange-600">
            <span className="text-xl">⚠️</span>
            <span className="font-medium text-sm">检测到 {issues.length} 个素材有问题</span>
          </div>
          <p className="text-xs text-orange-500 mt-1">不是技术错误提示，下面用大白话告诉你怎么回事</p>
        </div>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {materialRecords.map((material) => (
          <div
            key={material.id}
            className={`p-3 rounded-lg border ${getStatusColor(material.status)}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0">{getTypeIcon(material.type)}</span>
                <span className="font-medium text-sm truncate">{material.name}</span>
                <span className="text-xs px-2 py-0.5 bg-white/70 rounded flex-shrink-0">
                  {getTypeLabel(material.type)}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span>{getStatusIcon(material.status)}</span>
                <span className="text-xs">{getStatusLabel(material.status)}</span>
              </div>
            </div>

            {material.humanReadableError && (
              <div className="text-xs mt-2 p-2 bg-white/60 rounded">
                <div className="flex items-start gap-1">
                  <span className="flex-shrink-0">💡</span>
                  <span className="font-medium">怎么回事：</span>
                  <span>{material.humanReadableError}</span>
                </div>
              </div>
            )}

            {material.fixSuggestion && (
              <div className="text-xs mt-1 p-2 bg-blue-50/60 rounded text-blue-700">
                <div className="flex items-start gap-1">
                  <span className="flex-shrink-0">🔧</span>
                  <span className="font-medium">怎么修：</span>
                  <span>{material.fixSuggestion}</span>
                </div>
              </div>
            )}

            {material.errorMessage && !material.humanReadableError && (
              <div className="text-xs mt-1 text-gray-500 italic">
                （技术提示：{material.errorMessage}）
              </div>
            )}

            {material.note && (
              <div className="text-xs mt-1 text-gray-500">
                📝 {material.note}
              </div>
            )}

            {material.resolution && (
              <div className="text-xs mt-1 text-gray-500">
                尺寸: {material.resolution}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>共 {materialRecords.length} 个素材</span>
          <span className="text-green-600">正常: {materialRecords.filter(m => m.status === 'available').length}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span className="text-red-600">找不到: {materialRecords.filter(m => m.status === 'missing').length}</span>
          <span className="text-yellow-600">损坏/旧版: {materialRecords.filter(m => m.status === 'corrupted' || m.status === 'outdated').length}</span>
        </div>
      </div>
    </div>
  );
};
