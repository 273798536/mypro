import { useState } from 'react';
import { Clock, ArrowRight, AlertTriangle, FileText, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import { LateAttachmentImpact, ComplaintRecord, Material } from '../types';
import { Card, SectionHeader, Badge, Alert } from './ui';
import { getMaterialTypeLabel } from '../services/dataParser';

interface LateAttachmentPanelProps {
  impacts: LateAttachmentImpact[];
  materials: Material[];
  complaints: ComplaintRecord[];
}

export function LateAttachmentPanel({ impacts, materials, complaints }: LateAttachmentPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(impacts[0]?.attachmentId || null);

  if (impacts.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border-orange-300 bg-orange-50/50">
      <SectionHeader
        title="晚到附件影响分析"
        icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
        description="晚到附件可能改变复核结论，以下是详细影响链分析"
        badge={<Badge severity="error">{impacts.length}份晚到附件</Badge>}
      />

      <div className="space-y-4">
        {impacts.map(impact => {
          const isExpanded = expandedId === impact.attachmentId;
          const material = materials.find(m => m.versions.some(v => v.id === impact.attachmentId));
          const affectedComplaints = complaints.filter(c => impact.affectedRecords.includes(c.id));

          return (
            <div
              key={impact.id}
              className="border border-orange-200 rounded-lg overflow-hidden bg-white"
            >
              <div
                className="p-4 cursor-pointer hover:bg-orange-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : impact.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-gray-900">{impact.attachmentTitle}</span>
                      <Badge severity="warning">
                        <Clock className="w-3 h-3 mr-1" />
                        延迟 {impact.uploadDelayHours} 小时
                      </Badge>
                      {material && (
                        <Badge severity="info">{getMaterialTypeLabel(material.type)}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      影响 {impact.affectedRecords.length} 条记录：
                      {affectedComplaints.slice(0, 2).map(c => `${c.street}${c.intersection ? '-' + c.intersection : ''}`).join('、')}
                      {affectedComplaints.length > 2 && ` 等${affectedComplaints.length}处`}
                    </p>
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
                <div className="border-t border-orange-100 p-4">
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Link2 className="w-4 h-4" />
                      影响链分析
                    </h5>
                    <div className="relative pl-6">
                      <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-orange-200" />
                      {impact.impactChain.map((step, idx) => (
                        <div key={idx} className="relative mb-3 last:mb-0">
                          <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-orange-500 border-2 border-white flex items-center justify-center">
                            <span className="text-[10px] text-white font-bold">{step.step}</span>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                            <p className="text-sm text-gray-800">{step.description}</p>
                            {step.beforeValue && step.afterValue && (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono">
                                  {step.beforeValue}
                                </span>
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono">
                                  {step.afterValue}
                                </span>
                                {step.affectedField && (
                                  <span className="text-xs text-gray-500">
                                    字段：{step.affectedField}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Alert severity="warning" title="结论变化说明">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-gray-500">原结论：</span>
                        <p className="text-sm">{impact.originalConclusion}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">修正结论：</span>
                        <p className="text-sm">{impact.revisedConclusion}</p>
                      </div>
                    </div>
                  </Alert>

                  {affectedComplaints.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">受影响的投诉记录</h5>
                      <div className="text-xs text-gray-600 space-y-1">
                        {affectedComplaints.map(c => (
                          <div key={c.id} className="flex items-center gap-2">
                            <Badge severity="info">{c.street}</Badge>
                            <span>{c.complaintType}：{c.description.slice(0, 30)}...</span>
                            <span className="text-gray-400">
                              (原始行: {c.rawReference.lineNumber || '未知'})
                            </span>
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
