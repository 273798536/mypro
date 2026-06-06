import { useState } from 'react';
import { BatchData } from '../useAppState';
import { Status } from '../types';

interface Props {
  batchData: BatchData | null;
  onUpdateConflict: (conflictId: string, status: Status, notes?: string) => void;
}

export default function HitDetection({ batchData, onUpdateConflict }: Props) {
  const [editingConflict, setEditingConflict] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  if (!batchData) {
    return (
      <div className="text-center py-12 text-gray-500">
        请从左侧选择一个批次查看
      </div>
    );
  }

  const { devices, conflicts, coordRecords } = batchData;

  const getDeviceCoords = (deviceId: string) => {
    const coords = coordRecords.filter(c => c.deviceId === deviceId);
    const base = coords.find(c => c.source === '底图坐标');
    const track = coords.find(c => c.source === '轨迹记录');
    return { base, track };
  };

  const handleMarkStatus = (conflictId: string, status: Status) => {
    if (status !== '通过' && (!notes || notes.trim() === '')) {
      setValidationError('标记为"待确认"或"失败"时必须填写备注说明，请补充处理原因或讲解备注。');
      return;
    }
    onUpdateConflict(conflictId, status, notes || undefined);
    setEditingConflict(null);
    setNotes('');
    setValidationError('');
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">设备清单</h3>
          <span className="text-sm text-gray-500">共 {devices.length} 台设备</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">设备名称</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">位置</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">底图坐标</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">轨迹坐标</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">冲突状态</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => {
                const { base, track } = getDeviceCoords(device.id);
                const deviceConflict = conflicts.find(c => c.deviceId === device.id);
                const conflictStatus = deviceConflict?.status || (base && track ? '待确认' : '通过');
                return (
                  <tr key={device.id}>
                    <td className="px-4 py-2 text-sm font-medium">{device.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{device.type}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{device.location}</td>
                    <td className="px-4 py-2 text-sm font-mono text-blue-600">
                      {base ? `(${base.x}, ${base.y})` : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-green-600">
                      {track ? `(${track.x}, ${track.y})` : '-'}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        conflictStatus === '通过' ? 'bg-green-100 text-green-700' :
                        conflictStatus === '待确认' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {conflictStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            冲突明细 ({conflicts.length})
          </h3>
          {conflicts.length > 0 && (
            <div className="flex space-x-2 text-xs">
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                待确认: {conflicts.filter(c => c.status === '待确认').length}
              </span>
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                已解决: {conflicts.filter(c => c.status === '通过').length}
              </span>
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded">
                失败: {conflicts.filter(c => c.status === '失败').length}
              </span>
            </div>
          )}
        </div>
        {conflicts.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-green-600 text-lg mb-2">✓</div>
            <p className="text-green-700 font-medium">底图坐标与轨迹记录一致，暂无冲突</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conflicts.map((conflict) => {
              const { base, track } = getDeviceCoords(conflict.deviceId);
              return (
                <div key={conflict.id} className={`border rounded-lg p-4 ${
                  conflict.status === '失败' ? 'border-red-200 bg-red-50' :
                  conflict.status === '通过' ? 'border-green-200 bg-green-50' :
                  'border-yellow-200 bg-yellow-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900">{conflict.deviceName}</h4>
                        <span className={`text-xs px-2 py-1 rounded ${
                          conflict.status === '通过' ? 'bg-green-100 text-green-700' :
                          conflict.status === '待确认' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {conflict.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{conflict.reason}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm">
                        {base && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">
                            底图: ({base.x}, {base.y})
                          </span>
                        )}
                        {track && (
                          <span className="bg-green-50 text-green-700 px-2 py-1 rounded font-mono">
                            轨迹: ({track.x}, {track.y})
                          </span>
                        )}
                        {base && track && (
                          <span className="text-gray-500">
                            偏差: Δx={Math.abs(track.x - base.x)}, Δy={Math.abs(track.y - base.y)}
                          </span>
                        )}
                      </div>
                      {conflict.notes && (
                        <div className="mt-3 bg-white p-3 rounded border text-sm text-gray-700">
                          <span className="font-medium text-gray-500">备注: </span>
                          {conflict.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {editingConflict === conflict.id ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          处理备注 <span className="text-red-500">*（标记为待确认/失败时必填）</span>
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => {
                            setNotes(e.target.value);
                            if (validationError) setValidationError('');
                          }}
                          placeholder="请填写处理说明，例如: 已核对现场照片，底图标注位置有误，以轨迹记录为准更新底图..."
                          className="w-full border rounded p-2 text-sm"
                          rows={3}
                        />
                        {validationError && (
                          <p className="mt-1 text-sm text-red-600">{validationError}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleMarkStatus(conflict.id, '通过')}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          ✓ 标记通过
                        </button>
                        <button
                          onClick={() => handleMarkStatus(conflict.id, '待确认')}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          ⚠ 标记待确认
                        </button>
                        <button
                          onClick={() => handleMarkStatus(conflict.id, '失败')}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium"
                        >
                          ✕ 标记失败
                        </button>
                        <button
                          onClick={() => {
                            setEditingConflict(null);
                            setNotes('');
                            setValidationError('');
                          }}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingConflict(conflict.id);
                        setNotes(conflict.notes || '');
                        setValidationError('');
                      }}
                      className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      → 处理冲突
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
