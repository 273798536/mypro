import {
  AlertTriangle,
  FileText,
  Database,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Link,
  Unlink,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, getConflictColor } from '../utils/heatColor';
import { Conflict } from '../types';

export function ConflictsPage() {
  const {
    conflicts,
    dataSources,
    resolveConflict,
    unresolveConflict,
    locations,
    skus,
    inOutRecords,
  } = useStore();

  const getConflictTypeLabel = (type: string) => {
    switch (type) {
      case 'duplicate':
        return '货位重复';
      case 'occlusion':
        return '高度遮挡';
      case 'mismatch':
        return '数据不匹配';
      default:
        return '未知';
    }
  };

  const getSourceFileName = (sourceId: string) => {
    const source = dataSources.find((s) => s.id === sourceId);
    return source?.fileName || '未知文件';
  };

  const getLocationCode = (locationId: string) => {
    const location = locations.find((l) => l.id === locationId);
    return location?.code || locationId;
  };

  const duplicateConflicts = conflicts.filter((c) => c.type === 'duplicate');
  const occlusionConflicts = conflicts.filter((c) => c.type === 'occlusion');
  const mismatchConflicts = conflicts.filter((c) => c.type === 'mismatch');

  const ConflictCard = ({ conflict }: { conflict: Conflict }) => (
    <div
      className={`bg-gray-900 rounded-lg border p-4 transition-all ${
        conflict.resolved
          ? 'border-gray-700 opacity-60'
          : 'border-gray-600 hover:border-gray-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: getConflictColor(conflict.type, 0.2) }}
          >
            <AlertTriangle size={20} style={{ color: getConflictColor(conflict.type) }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white">
                {getLocationCode(conflict.locationId)}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: getConflictColor(conflict.type, 0.2),
                  color: getConflictColor(conflict.type),
                }}
              >
                {getConflictTypeLabel(conflict.type)}
              </span>
              {conflict.resolved && (
                <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle size={12} />
                  已解决
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-2">{conflict.description}</p>

            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-2">问题来源材料：</div>
              <div className="flex flex-wrap items-center gap-2">
                {conflict.sourceIds.map((sid, idx) => (
                  <div key={sid} className="flex items-center gap-1">
                    {idx > 0 && <ArrowRight size={12} className="text-gray-600" />}
                    <span className="text-xs bg-gray-800 text-yellow-400 px-2 py-1 rounded flex items-center gap-1">
                      <FileText size={12} />
                      {getSourceFileName(sid)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() =>
            conflict.resolved
              ? unresolveConflict(conflict.id)
              : resolveConflict(conflict.id)
          }
          className={`p-2 rounded transition-colors ${
            conflict.resolved
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
          }`}
          title={conflict.resolved ? '标记未解决' : '标记已解决'}
        >
          {conflict.resolved ? <XCircle size={18} /> : <CheckCircle size={18} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle size={28} className="text-red-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">货位冲突检测</h1>
              <p className="text-gray-400 text-sm">
                检测货位重复、高度遮挡和数据不匹配问题
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors">
            <RefreshCw size={18} />
            重新检测
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl border border-red-800 p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <Database size={20} />
              <span className="font-bold">货位重复</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {duplicateConflicts.filter((c) => !c.resolved).length}
              <span className="text-sm text-gray-500 font-normal ml-2">
                / {duplicateConflicts.length}
              </span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-orange-800 p-4">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <Unlink size={20} />
              <span className="font-bold">高度遮挡</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {occlusionConflicts.filter((c) => !c.resolved).length}
              <span className="text-sm text-gray-500 font-normal ml-2">
                / {occlusionConflicts.length}
              </span>
            </div>
          </div>
          <div className="bg-gray-900 rounded-xl border border-purple-800 p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Link size={20} />
              <span className="font-bold">数据不匹配</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {mismatchConflicts.filter((c) => !c.resolved).length}
              <span className="text-sm text-gray-500 font-normal ml-2">
                / {mismatchConflicts.length}
              </span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Database size={18} className="text-red-400" />
            货位重复
            <span className="text-sm font-normal text-gray-500">
              - 同一货位被分配给多个SKU
            </span>
          </h2>
          <div className="space-y-3">
            {duplicateConflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Unlink size={18} className="text-orange-400" />
            高度遮挡
            <span className="text-sm font-normal text-gray-500">
              - 货位被前排遮挡影响拣货效率
            </span>
          </h2>
          <div className="space-y-3">
            {occlusionConflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Link size={18} className="text-purple-400" />
            数据不匹配
            <span className="text-sm font-normal text-gray-500">
              - 货架、货位、记录三方数据不一致
            </span>
          </h2>
          <div className="space-y-3">
            {mismatchConflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">数据对齐状态</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">货架模型</span>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{locations.length}</div>
              <div className="text-xs text-gray-500">个货位定义</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">SKU主数据</span>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{skus.length}</div>
              <div className="text-xs text-gray-500">种商品</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">出入库记录</span>
                <CheckCircle size={16} className="text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">{inOutRecords.length}</div>
              <div className="text-xs text-gray-500">条操作记录</div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gray-900 rounded-xl border border-gray-700 p-6">
          <h2 className="text-lg font-bold text-white mb-4">导入材料清单</h2>
          <div className="space-y-3">
            {dataSources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-blue-400" />
                  <div>
                    <div className="text-white text-sm font-medium">
                      {source.fileName}
                    </div>
                    <div className="text-gray-500 text-xs">
                      {source.type === 'rack'
                        ? '货架模型'
                        : source.type === 'location'
                        ? '货位编号'
                        : source.type === 'sku'
                        ? 'SKU数据'
                        : '出入库记录'}{' '}
                      · {formatDate(source.importTime)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">{source.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
