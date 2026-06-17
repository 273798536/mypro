import { useState } from 'react';
import { History, ArrowRight, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Material } from '../types';
import { Card, SectionHeader, Badge } from './ui';
import { getAllVersionDiffs } from '../services/versionTracker';

interface VersionHistoryProps {
  materials: Material[];
}

export function VersionHistory({ materials }: VersionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const materialsWithHistory = materials.filter(m => m.versions.length > 1);

  const getImpactSeverity = (impact: 'low' | 'medium' | 'high'): 'info' | 'warning' | 'error' => {
    if (impact === 'high') return 'error';
    if (impact === 'medium') return 'warning';
    return 'info';
  };

  const getImpactLabel = (impact: 'low' | 'medium' | 'high') => {
    return { low: '影响较小', medium: '影响中等', high: '影响较大' }[impact];
  };

  if (materialsWithHistory.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <SectionHeader
        title="版本变更历史"
        icon={<History className="w-5 h-5 text-purple-500" />}
        description="追踪每份材料的修改历史，检测口径变化"
        badge={<Badge severity="warning">{materialsWithHistory.length}份材料有变更</Badge>}
      />

      <div className="space-y-4">
        {materialsWithHistory.map(material => {
          const isExpanded = expandedId === material.id;
          const diffs = getAllVersionDiffs(material);
          const hasHighImpact = diffs.some(d => d.overallImpact === 'high');

          return (
            <div
              key={material.id}
              className={`border rounded-lg overflow-hidden ${
                hasHighImpact ? 'border-red-200' : 'border-gray-200'
              }`}
            >
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : material.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{material.title}</span>
                        <Badge severity="info">v{material.currentVersion}</Badge>
                        {hasHighImpact && (
                          <Badge severity="error">高影响变更</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        共{material.versions.length}个版本，{diffs.length}次变更
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <div className="p-4 border-b border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-3">版本时间线</h5>
                    <div className="relative pl-6">
                      <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-gray-300" />
                      {material.versions.map((version, idx) => (
                        <div key={version.id} className="relative mb-4 last:mb-0">
                          <div className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white ${
                            version.isLateArrival ? 'bg-orange-500' : 
                            idx === material.versions.length - 1 ? 'bg-park-500' : 'bg-gray-400'
                          }`} />
                          <div className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">v{version.version}</span>
                              {version.isLateArrival && (
                                <Badge severity="error">晚到附件</Badge>
                              )}
                              {idx === material.versions.length - 1 && (
                                <Badge severity="success">当前版本</Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mb-1">
                              {version.uploader} · {version.uploadTime.toLocaleString('zh-CN')}
                            </div>
                            {version.note && (
                              <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                                备注：{version.note}
                              </div>
                            )}
                            <div className="text-xs font-mono text-gray-600 mt-2 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto">
                              {version.content.slice(0, 100)}...
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {diffs.length > 0 && (
                    <div className="p-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-3">变更详情</h5>
                      <div className="space-y-3">
                        {diffs.map((diff, idx) => (
                          <div key={idx} className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  v{diff.versionFrom} → v{diff.versionTo}
                                </span>
                                <Badge severity={getImpactSeverity(diff.overallImpact)}>
                                  {getImpactLabel(diff.overallImpact)}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{diff.summary}</p>
                            <div className="space-y-2">
                              {diff.changedFields.map((field, fIdx) => (
                                <div key={fIdx} className="text-sm flex items-center gap-2">
                                  <span className="text-gray-500 w-24 flex-shrink-0">{field.field}：</span>
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono text-xs">
                                    {field.oldValue}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-gray-400" />
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono text-xs">
                                    {field.newValue}
                                  </span>
                                  <Badge severity={getImpactSeverity(field.impact)} className="ml-auto">
                                    {getImpactLabel(field.impact)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
