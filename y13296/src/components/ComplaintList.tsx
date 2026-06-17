import { useState } from 'react';
import { FileText, MapPin, Clock, User, AlertCircle, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { ComplaintRecord, Material } from '../types';
import { Card, SectionHeader, Badge } from './ui';

interface ComplaintListProps {
  complaints: ComplaintRecord[];
  materials: Material[];
  highlightAnomaly?: boolean;
}

export function ComplaintList({ complaints, materials, highlightAnomaly = true }: ComplaintListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'anomaly' | 'normal'>('all');

  const filteredComplaints = complaints.filter(c => {
    if (filter === 'anomaly') return c.isAnomaly;
    if (filter === 'normal') return !c.isAnomaly;
    return true;
  });

  const getMaterial = (materialId: string) => materials.find(m => m.id === materialId);

  return (
    <Card className="p-6">
      <SectionHeader
        title="投诉记录"
        icon={<FileText className="w-5 h-5 text-blue-500" />}
        description={`共 ${complaints.length} 条记录，其中 ${complaints.filter(c => c.isAnomaly).length} 条存在异常`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-park-100 text-park-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部 ({complaints.length})
            </button>
            <button
              onClick={() => setFilter('anomaly')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'anomaly'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              异常 ({complaints.filter(c => c.isAnomaly).length})
            </button>
            <button
              onClick={() => setFilter('normal')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'normal'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              正常 ({complaints.filter(c => !c.isAnomaly).length})
            </button>
          </div>
        }
      />

      {filteredComplaints.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          <p>暂无符合条件的投诉记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredComplaints.map(complaint => {
            const isExpanded = expandedId === complaint.id;
            const material = getMaterial(complaint.materialId);
            const isAbnormal = highlightAnomaly && complaint.isAnomaly;

            return (
              <div
                key={complaint.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  isAbnormal
                    ? 'border-red-200 bg-red-50/30'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {complaint.street}
                          {complaint.intersection && ` · ${complaint.intersection}`}
                        </span>
                        <Badge severity="info">{complaint.complaintType}</Badge>
                        {isAbnormal && (
                          <Badge severity="error">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {complaint.anomalyNote || '存在异常'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{complaint.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {complaint.reporter}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {complaint.reportedTime.toLocaleString('zh-CN')}
                        </span>
                        {complaint.seatCount !== undefined && (
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {complaint.seatCount}个座椅
                          </span>
                        )}
                        {material && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            {material.title}
                          </span>
                        )}
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
                  <div className="border-t border-gray-200 p-4 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">详细信息</h5>
                        <div className="space-y-2 text-sm">
                          <div className="flex">
                            <span className="w-20 text-gray-500">街道：</span>
                            <span>{complaint.street}</span>
                          </div>
                          <div className="flex">
                            <span className="w-20 text-gray-500">路口：</span>
                            <span>{complaint.intersection || '未填写'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-20 text-gray-500">类型：</span>
                            <span>{complaint.complaintType}</span>
                          </div>
                          <div className="flex">
                            <span className="w-20 text-gray-500">投诉人：</span>
                            <span>{complaint.reporter}</span>
                          </div>
                          <div className="flex">
                            <span className="w-20 text-gray-500">时间：</span>
                            <span>{complaint.reportedTime.toLocaleString('zh-CN')}</span>
                          </div>
                          <div className="flex">
                            <span className="w-20 text-gray-500">座椅数：</span>
                            <span>{complaint.seatCount !== undefined ? complaint.seatCount + '个' : '未填写'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 mb-2">原始数据溯源</h5>
                        <div className="bg-gray-100 rounded-lg p-3 text-xs font-mono">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <FileText className="w-3 h-3" />
                            <span>来源：{complaint.rawReference.source}</span>
                          </div>
                          <div className="text-gray-600 mb-1">
                            位置：第{complaint.rawReference.lineNumber || '未知'}行
                            {complaint.rawReference.fieldName && ` · 字段：${complaint.rawReference.fieldName}`}
                          </div>
                          <div className="text-gray-800 bg-white p-2 rounded border border-gray-200 mt-2">
                            原始值："{complaint.rawReference.originalValue}"
                          </div>
                        </div>
                        {complaint.isAnomaly && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                            <div className="text-sm font-medium text-red-800 mb-1">异常信息</div>
                            <div className="text-xs text-red-700">
                              类型：{complaint.anomalyType}
                              {complaint.anomalyNote && ` · ${complaint.anomalyNote}`}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
