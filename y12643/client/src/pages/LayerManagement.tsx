import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getStatusLabel, getRecordTypeLabel } from '@/utils/colorRules';
import { formatDateTime } from '@/utils/helpers';
import { RecordStatus } from '@/types';
import { Layers, AlertTriangle, Clock, Map, ChevronRight, Activity } from 'lucide-react';

export function LayerManagement() {
  const { layers, fetchLayers, fetchCanvasOverview, canvasOverview, fetchExceptions, exceptions, loading } = useAppStore();

  useEffect(() => {
    fetchLayers();
    fetchCanvasOverview();
    fetchExceptions();
  }, [fetchLayers, fetchCanvasOverview, fetchExceptions]);

  const layerTypeColors: Record<string, string> = {
    trajectory: 'bg-blue-50 border-blue-200',
    device_list: 'bg-purple-50 border-purple-200',
    scale_error: 'bg-amber-50 border-amber-200'
  };

  const statusColorMap: Record<string, string> = {
    active: 'text-green-600 bg-green-50',
    inactive: 'text-gray-500 bg-gray-100',
    warning: 'text-amber-600 bg-amber-50'
  };

  const statusLabelMap: Record<string, string> = {
    active: '正常',
    inactive: '停用',
    warning: '存在异常'
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">图层管理</h2>
        <p className="text-sm text-gray-500 mt-1">日常入口 · 管理所有数据图层，查看画布状态</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">图层总数</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {canvasOverview?.summary.layerCount || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">正常图层</p>
              <p className="text-2xl font-semibold text-gray-800 mt-1">
                {canvasOverview?.summary.activeLayers || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Map size={20} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">异常记录总数</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">
                {canvasOverview?.summary.totalExceptions || 0}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">待处理</p>
              <p className="text-2xl font-semibold text-amber-600 mt-1">
                {(canvasOverview?.summary.statusCounts?.pending || 0) +
                  (canvasOverview?.summary.statusCounts?.offline_missing || 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity size={16} className="text-gray-500" />
            画布状态概览
          </h3>
          <span className="text-xs text-gray-400">
            更新时间：{canvasOverview?.summary.generatedAt ? formatDateTime(canvasOverview.summary.generatedAt) : '-'}
          </span>
        </div>

        {canvasOverview && (
          <div className="flex flex-wrap gap-3">
            {Object.entries(canvasOverview.summary.statusCounts || {}).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-gray-100 bg-gray-50"
              >
                <StatusBadge status={status as RecordStatus} size="sm" />
                <span className="text-sm font-medium text-gray-700">{count} 条</span>
              </div>
            ))}
            {Object.keys(canvasOverview.summary.statusCounts || {}).length === 0 && (
              <p className="text-sm text-gray-400">暂无数据</p>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">图层列表</h3>
          <span className="text-xs text-gray-400">{layers.length} 个图层</span>
        </div>

        {loading.layers ? (
          <div className="p-8 text-center text-gray-400">加载中...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {layers.map(layer => (
              <div key={layer.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${layerTypeColors[layer.type] || 'bg-gray-50 border-gray-200'}`}>
                      <Layers size={18} className="text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-800">{layer.name}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColorMap[layer.status] || ''}`}>
                          {statusLabelMap[layer.status] || layer.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{getRecordTypeLabel(layer.type)}</span>
                        <span>·</span>
                        <span>画布状态：{layer.canvasStatus}</span>
                        <span>·</span>
                        <span>更新：{formatDateTime(layer.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {layer.stats && (
                      <div className="flex items-center gap-2">
                        {Object.entries(layer.stats).map(([status, count]) => (
                          <div key={status} className="flex items-center gap-1">
                            <StatusBadge status={status as RecordStatus} size="sm" />
                            <span className="text-xs text-gray-600">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Link
                      to={`/exceptions?layer=${layer.id}`}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      查看异常
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {layers.length === 0 && (
              <div className="p-8 text-center text-gray-400">暂无图层</div>
            )}
          </div>
        )}
      </div>

      {exceptions.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">最新异常记录</h3>
            <Link to="/exceptions" className="text-xs text-blue-600 hover:text-blue-700">
              查看全部 →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {exceptions.slice(0, 5).map(exception => (
              <Link
                key={exception.id}
                to={`/exceptions/${exception.id}`}
                className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={exception.status} size="sm" />
                  <div>
                    <p className="text-sm text-gray-800">{exception.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getRecordTypeLabel(exception.recordType)} · {exception.source?.fileName || '未知来源'}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDateTime(exception.createdAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
