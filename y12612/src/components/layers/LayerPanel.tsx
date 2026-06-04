import { useState } from 'react';
import { useBatchStore } from '@/stores/useBatchStore';
import { Eye, EyeOff, Filter, Layers, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getDeviceTypeLabel, getRiskLevelColor } from '@/utils/helpers';
import type { RiskLevel } from '@/types';

export function LayerPanel() {
  const { layers, devices, toggleLayer, setFilter, confirmCoordinateFlip } = useBatchStore();
  const [expandedLayer, setExpandedLayer] = useState<string | null>('layer-equipment');
  const [filterField, setFilterField] = useState('riskLevel');
  const [filterValue, setFilterValue] = useState('');

  const handleFilterApply = (layerId: string) => {
    if (filterValue) {
      setFilter(layerId, {
        field: filterField,
        operator: 'eq',
        value: filterValue,
      });
    } else {
      setFilter(layerId, undefined);
    }
  };

  const getDevicesInLayer = (layerId: string) => {
    return devices.filter((d) => d.layerId === layerId);
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-bold text-[#1e3a5f] flex items-center gap-2">
          <Layers size={18} />
          图层管理
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.map((layer) => {
          const layerDevices = getDevicesInLayer(layer.id);
          const isExpanded = expandedLayer === layer.id;

          return (
            <div key={layer.id} className="border-b border-gray-100">
              <div
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronUp size={16} className="text-gray-400" />
                  )}
                  <span
                    className={`font-medium text-sm ${
                      layer.visible ? 'text-gray-800' : 'text-gray-400'
                    }`}
                  >
                    {layer.name}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {layerDevices.length}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLayer(layer.id);
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    layer.visible
                      ? 'text-[#1e3a5f] hover:bg-blue-50'
                      : 'text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {layer.id === 'layer-equipment' && (
                    <div className="flex gap-1.5 mb-2">
                      <select
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      >
                        <option value="riskLevel">风险等级</option>
                        <option value="type">设备类型</option>
                        <option value="name">设备名称</option>
                      </select>
                      <select
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                        className="flex-1 text-xs px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#1e3a5f]"
                      >
                        <option value="">全部</option>
                        {filterField === 'riskLevel' && (
                          <>
                            <option value="safe">安全</option>
                            <option value="warning">警示</option>
                            <option value="danger">危险</option>
                          </>
                        )}
                        {filterField === 'type' && (
                          <>
                            <option value="crane">塔吊</option>
                            <option value="scaffold">脚手架</option>
                            <option value="fire_extinguisher">灭火器</option>
                            <option value="electrical">电气设备</option>
                          </>
                        )}
                      </select>
                      <button
                        onClick={() => handleFilterApply(layer.id)}
                        className="px-2 py-1.5 bg-[#1e3a5f] text-white rounded text-xs hover:bg-[#2a4a7a] transition-colors"
                      >
                        <Filter size={14} />
                      </button>
                    </div>
                  )}

                  {layer.filter && (
                    <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded flex items-center justify-between">
                      <span>
                        筛选: {layer.filter.field} {layer.filter.operator}{' '}
                        {layer.filter.value}
                      </span>
                      <button
                        onClick={() => setFilter(layer.id, undefined)}
                        className="text-amber-600 hover:text-amber-800"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {layerDevices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getRiskLevelColor(device.riskLevel) }}
                          />
                          <span className="truncate text-gray-700">{device.name}</span>
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {getDeviceTypeLabel(device.type)}
                        </span>
                      </div>
                    ))}
                    {layerDevices.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-2">
                        暂无设备
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>设备总数</span>
            <span className="font-medium text-gray-700">{devices.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-600">● 安全</span>
            <span className="font-medium text-gray-700">
              {devices.filter((d) => d.riskLevel === 'safe').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-orange-500">● 警示</span>
            <span className="font-medium text-gray-700">
              {devices.filter((d) => d.riskLevel === 'warning').length}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-red-500">● 危险</span>
            <span className="font-medium text-gray-700">
              {devices.filter((d) => d.riskLevel === 'danger').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
