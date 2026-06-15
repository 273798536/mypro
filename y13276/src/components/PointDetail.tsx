import { useState } from 'react';
import { usePointStore } from '@/store/usePointStore';
import SourceTimeline from './SourceTimeline';
import { statusLabels, sourceTypeLabels } from '@/types';
import type { PointStatus } from '@/types';
import { X, AlertTriangle, Check, Clock, MapPin, Edit3, Save } from 'lucide-react';

const statusColors = {
  normal: 'bg-green-100 text-green-700 border-green-200',
  abnormal: 'bg-red-100 text-red-700 border-red-200',
  confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
};

const statusIcons = {
  abnormal: AlertTriangle,
  pending: Clock,
  confirmed: Check,
  normal: MapPin,
};

export default function PointDetail() {
  const {
    selectedPointId,
    selectPoint,
    getPointSources,
    getPointConflicts,
    updatePointStatus,
    updatePointRemark,
    points,
  } = usePointStore();

  const point = points.find((p) => p.id === selectedPointId);
  const sources = selectedPointId ? getPointSources(selectedPointId) : [];
  const conflicts = selectedPointId ? getPointConflicts(selectedPointId) : [];

  const [isEditing, setIsEditing] = useState(false);
  const [editRemark, setEditRemark] = useState('');

  if (!point) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 h-full flex items-center justify-center">
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">点击左侧点位查看详情</p>
          <p className="text-slate-400 text-xs mt-1">
            可查看多源数据对比和原始说法
          </p>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[point.status];

  const handleStatusChange = (status: PointStatus) => {
    updatePointStatus(point.id, status);
  };

  const startEditRemark = () => {
    setEditRemark(point.remark);
    setIsEditing(true);
  };

  const saveRemark = () => {
    updatePointRemark(point.id, editRemark);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-medium text-slate-800">点位详情</h3>
        <button
          onClick={() => selectPoint(null)}
          className="p-1 hover:bg-slate-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-bold text-lg text-slate-800">{point.name}</h4>
            <span
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${statusColors[point.status]}`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusLabels[point.status]}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-3">{point.address}</p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 rounded p-2">
              <p className="text-slate-500 mb-0.5">当前口径</p>
              <p className="font-medium text-slate-800">{point.currentValue}</p>
            </div>
            <div className="bg-slate-50 rounded p-2">
              <p className="text-slate-500 mb-0.5">数据来源</p>
              <p className="font-medium text-slate-800">{sources.length} 个</p>
            </div>
            <div className="bg-slate-50 rounded p-2">
              <p className="text-slate-500 mb-0.5">经度</p>
              <p className="font-mono text-slate-800">{point.lng.toFixed(4)}</p>
            </div>
            <div className="bg-slate-50 rounded p-2">
              <p className="text-slate-500 mb-0.5">纬度</p>
              <p className="font-mono text-slate-800">{point.lat.toFixed(4)}</p>
            </div>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="p-4 border-b border-slate-100 bg-red-50">
            <h5 className="font-medium text-sm text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              冲突检测 ({conflicts.length} 处)
            </h5>
            <div className="space-y-2">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.id}
                  className="bg-white rounded border border-red-200 p-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                      {conflict.conflictField}
                    </span>
                    <span className="text-xs text-slate-500">
                      涉及 {conflict.conflictingSourceIds.length} 个来源
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{conflict.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-b border-slate-100">
          <h5 className="font-medium text-sm text-slate-800 mb-3">多源数据对比</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 font-medium text-slate-600">字段</th>
                  {sources.map((s) => (
                    <th key={s.id} className="text-left p-2 font-medium text-slate-600">
                      {sourceTypeLabels[s.type]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2 text-slate-500">口径</td>
                  {sources.map((s) => {
                    const allValues = sources.map((src) => src.value);
                    const hasConflict = allValues.some((v) => v !== s.value);
                    return (
                      <td
                        key={s.id}
                        className={`p-2 font-medium ${
                          hasConflict ? 'text-red-600 bg-red-50' : 'text-slate-800'
                        }`}
                      >
                        {s.value}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">位置描述</td>
                  {sources.map((s) => (
                    <td key={s.id} className="p-2 text-slate-700">
                      {s.position
                        ? `${s.position.lng.toFixed(4)}, ${s.position.lat.toFixed(4)}`
                        : '无坐标'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 text-slate-500">记录人</td>
                  {sources.map((s) => (
                    <td key={s.id} className="p-2 text-slate-700">
                      {s.recorder}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <h5 className="font-medium text-sm text-slate-800 mb-3">原始说法追溯</h5>
          <SourceTimeline sources={sources} />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-sm text-slate-800">复核备注</h5>
            {!isEditing ? (
              <button
                onClick={startEditRemark}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <Edit3 className="w-3 h-3" />
                编辑
              </button>
            ) : (
              <button
                onClick={saveRemark}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Save className="w-3 h-3" />
                保存
              </button>
            )}
          </div>
          {isEditing ? (
            <textarea
              value={editRemark}
              onChange={(e) => setEditRemark(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded focus:outline-none focus:border-slate-400 resize-none"
              rows={3}
            />
          ) : (
            <p className="text-sm text-slate-600 bg-slate-50 rounded p-2">
              {point.remark || '暂无备注'}
            </p>
          )}
        </div>

        <div className="p-4 pt-0">
          <h5 className="font-medium text-sm text-slate-800 mb-3">标记状态</h5>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(statusLabels) as PointStatus[]).map((status) => {
              const Icon = statusIcons[status];
              const isActive = point.status === status;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`flex flex-col items-center gap-1 p-2 rounded border text-xs transition-colors ${
                    isActive
                      ? statusColors[status]
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {statusLabels[status]}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
