import { useState } from 'react';
import { Layers, Target, CheckCircle, AlertTriangle, XCircle, Image, Video, PenTool, Eye, EyeOff } from 'lucide-react';
import type { LayerRecord, HitRecord } from '@/types';
import { cn } from '@/lib/utils';
import { MATERIAL_TYPE_TEXT, UPLOAD_STATUS_TEXT } from '@/utils/mockData';

interface LayerHitPanelProps {
  layers: LayerRecord[];
  hits: HitRecord[];
}

const uploadStatusIcons = {
  uploaded: CheckCircle,
  missing: XCircle,
  damaged: AlertTriangle,
};

const uploadStatusColors = {
  uploaded: 'text-green-600 bg-green-50 border-green-200',
  missing: 'text-red-600 bg-red-50 border-red-200',
  damaged: 'text-amber-600 bg-amber-50 border-amber-200',
};

const materialIcons = {
  screenshot: Image,
  video: Video,
  mark: PenTool,
};

export function LayerHitPanel({ layers, hits }: LayerHitPanelProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'hits'>('layers');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  const sortedLayers = [...layers].sort((a, b) => a.layerOrder - b.layerOrder);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('layers')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
            activeTab === 'layers'
              ? 'bg-slate-50 text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          )}
        >
          <Layers className="w-4 h-4" />
          图层管理 ({layers.length})
        </button>
        <button
          onClick={() => setActiveTab('hits')}
          className={cn(
            'flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
            activeTab === 'hits'
              ? 'bg-slate-50 text-blue-700 border-b-2 border-blue-600'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          )}
        >
          <Target className="w-4 h-4" />
          命中检测 ({hits.length})
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                点击图层可查看命中关联
              </div>
            </div>
            {sortedLayers.map((layer) => {
              const MaterialIcon = materialIcons[layer.materialType];
              const StatusIcon = uploadStatusIcons[layer.uploadStatus];
              const isSelected = selectedLayerId === layer.id;
              const hasMissingMaterial = layer.uploadStatus !== 'uploaded';

              const relatedHits = hits.filter((h) => {
                const areaHit = layer.layerName.includes('骨架') && h.hitArea.includes('髂前上棘');
                const markHit = layer.layerName.includes('标记') && h.confidence > 0.9;
                return areaHit || markHit;
              });

              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(isSelected ? null : layer.id)}
                  className={cn(
                    'border rounded-lg p-3 cursor-pointer transition-all',
                    isSelected
                      ? 'border-blue-400 bg-blue-50/50 shadow-sm'
                      : hasMissingMaterial
                      ? 'border-red-200 bg-red-50/30 hover:bg-red-50/50'
                      : layer.hasOcclusion
                      ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded border',
                        hasMissingMaterial
                          ? 'bg-red-100 border-red-200 text-red-600'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      )}>
                        <MaterialIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-800">
                            图层 {layer.layerOrder}：{layer.layerName}
                          </span>
                          {layer.hasOcclusion && (
                            <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded border border-amber-200">
                              遮挡
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          类型：{MATERIAL_TYPE_TEXT[layer.materialType]}
                        </div>
                        {layer.hasOcclusion && (
                          <div className="text-xs text-amber-600 mt-1">
                            {layer.occlusionDesc}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium',
                      uploadStatusColors[layer.uploadStatus]
                    )}>
                      <StatusIcon className="w-3 h-3" />
                      {UPLOAD_STATUS_TEXT[layer.uploadStatus]}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        关联命中记录 {relatedHits.length > 0 ? `(${relatedHits.length}条)` : '(无)'}
                      </div>
                      {relatedHits.length > 0 ? (
                        <div className="space-y-2">
                          {relatedHits.map((hit) => (
                            <div
                              key={hit.id}
                              className="bg-white border border-slate-200 rounded p-2 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-slate-700">{hit.hitArea}</span>
                                <span className="text-slate-500">{hit.hitTime}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                  <div
                                    className={cn(
                                      'h-1.5 rounded-full',
                                      hit.confidence > 0.9 ? 'bg-green-500' : hit.confidence > 0.75 ? 'bg-amber-500' : 'bg-red-500'
                                    )}
                                    style={{ width: `${hit.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-slate-500 font-mono">
                                  {(hit.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="mt-1 text-slate-500">结果：{hit.result}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <EyeOff className="w-3 h-3" />
                          该图层无命中记录
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'hits' && (
          <div className="space-y-2">
            {hits.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">因素材缺失，暂无比对数据</p>
              </div>
            ) : (
              hits.map((hit) => {
                const sourceLayer = sortedLayers.find((l) => {
                  const areaMatch = l.layerName.includes('骨架') && hit.hitArea.includes('髂前上棘');
                  const markMatch = l.layerName.includes('标记') && hit.confidence > 0.9;
                  return areaMatch || markMatch;
                });

                return (
                  <div
                    key={hit.id}
                    className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-sm text-slate-800">{hit.hitArea}</span>
                          <span className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded',
                            hit.result === '正常'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          )}>
                            {hit.result}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          命中时间：{hit.hitTime}
                        </div>
                        {sourceLayer && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            来源：{sourceLayer.layerName}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-800">
                          {(hit.confidence * 100).toFixed(0)}%
                        </div>
                        <div className="text-xs text-slate-400">置信度</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-2">
                          <div
                            className={cn(
                              'h-2 rounded-full transition-all',
                              hit.confidence > 0.9 ? 'bg-green-500' : hit.confidence > 0.75 ? 'bg-amber-500' : 'bg-red-500'
                            )}
                            style={{ width: `${hit.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        图层管理与命中检测共用同一批处理记录，确保数据一致性
      </div>
    </div>
  );
}
