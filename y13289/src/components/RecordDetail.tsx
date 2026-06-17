import { useState, useEffect } from 'react';
import { X, Edit3, MapPin, Clock, Truck, Package, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import type { DeliveryRecord, HistoryRecord } from '@shared/types';
import { api } from '@/utils/api';
import { getStatusLabel, getIssueTypeLabel, getSeverityColor, formatDateTime, getSourceLabel } from '@/utils/helpers';
import { useStore } from '@/store/useStore';

interface Props {
  record: DeliveryRecord;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RecordDetail({ record, onClose, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [editNote, setEditNote] = useState('');
  const [formData, setFormData] = useState(record);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const data = await api.history.get(record.id);
        setHistory(data as HistoryRecord[]);
      } catch (e) {
        // ignore
      }
    };
    loadHistory();
  }, [record.id]);

  const handleSave = async () => {
    if (!editNote.trim()) {
      setError('请填写修改备注');
      return;
    }

    setLoading(true);
    try {
      const updates: Partial<DeliveryRecord> = {};
      if (formData.marketName !== record.marketName) updates.marketName = formData.marketName;
      if (formData.location !== record.location) updates.location = formData.location;
      if (formData.deliveryTime !== record.deliveryTime) updates.deliveryTime = formData.deliveryTime;
      if (formData.truckNumber !== record.truckNumber) updates.truckNumber = formData.truckNumber;
      if (formData.goodsType !== record.goodsType) updates.goodsType = formData.goodsType;
      if (formData.status !== record.status) updates.status = formData.status;
      if (formData.coordinates.lat !== record.coordinates.lat || formData.coordinates.lng !== record.coordinates.lng) {
        updates.coordinates = formData.coordinates;
      }

      if (Object.keys(updates).length > 0) {
        await api.records.update(record.id, updates, editNote);
        onUpdate();
      }
      setEditing(false);
      setEditNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveIssue = async (issueId: string) => {
    try {
      await api.issues.resolve(issueId);
      onUpdate();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const statusInfo = getStatusLabel(record.status);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex animate-fade-in-up">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h3 className="text-lg font-serif font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                记录详情
                <span className={`px-2 py-0.5 text-xs border rounded ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                记录编号：{record.recordId} · {getSourceLabel(record.source)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                {editing ? '取消编辑' : '编辑'}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">菜场名称</label>
                  <div className="flex gap-2">
                    {editing ? (
                      <input
                        type="text"
                        value={formData.marketName}
                        onChange={(e) => setFormData({ ...formData, marketName: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    ) : (
                      <div className="flex-1 px-3 py-2 bg-gray-50 rounded-md">
                        <span className="font-medium">{record.marketName}</span>
                      </div>
                    )}
                  </div>
                  {record.marketName !== record.marketNameRaw && (
                    <p className="text-xs text-gray-500 mt-1">
                      原始值：{record.marketNameRaw}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    卸货地点
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">{record.location}</div>
                  )}
                  {record.location !== record.locationRaw && (
                    <p className="text-xs text-gray-500 mt-1">原始值：{record.locationRaw}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">坐标</label>
                  <div className="flex gap-2">
                    {editing ? (
                      <>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.coordinates.lat}
                          onChange={(e) => setFormData({ ...formData, coordinates: { ...formData.coordinates, lat: parseFloat(e.target.value) } })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="纬度"
                        />
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.coordinates.lng}
                          onChange={(e) => setFormData({ ...formData, coordinates: { ...formData.coordinates, lng: parseFloat(e.target.value) } })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="经度"
                        />
                      </>
                    ) : (
                      <div className="flex-1 px-3 py-2 bg-gray-50 rounded-md">
                        {record.coordinates.lat}, {record.coordinates.lng}
                      </div>
                    )}
                  </div>
                  {(record.coordinates.lat !== record.coordinatesRaw.lat || record.coordinates.lng !== record.coordinatesRaw.lng) && (
                    <p className="text-xs text-gray-500 mt-1">
                      原始值：{record.coordinatesRaw.lat}, {record.coordinatesRaw.lng}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    卸货时间
                  </label>
                  {editing ? (
                    <input
                      type="datetime-local"
                      value={formData.deliveryTime.replace(' ', 'T').slice(0, 16)}
                      onChange={(e) => setFormData({ ...formData, deliveryTime: e.target.value.replace('T', ' ') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {record.deliveryTime || '-'}
                    </div>
                  )}
                  {record.deliveryTime !== record.deliveryTimeRaw && (
                    <p className="text-xs text-gray-500 mt-1">原始值：{record.deliveryTimeRaw}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Truck className="w-4 h-4 inline mr-1" />
                    车牌号
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.truckNumber}
                      onChange={(e) => setFormData({ ...formData, truckNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {record.truckNumber || '-'}
                    </div>
                  )}
                  {record.truckNumber !== record.truckNumberRaw && (
                    <p className="text-xs text-gray-500 mt-1">原始值：{record.truckNumberRaw}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    货物类型
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.goodsType}
                      onChange={(e) => setFormData({ ...formData, goodsType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {record.goodsType || '-'}
                    </div>
                  )}
                  {record.goodsType !== record.goodsTypeRaw && (
                    <p className="text-xs text-gray-500 mt-1">原始值：{record.goodsTypeRaw}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                  {editing ? (
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="pending">待处理</option>
                      <option value="cleaned">已清洗</option>
                      <option value="conflict">有冲突</option>
                      <option value="merged">已归并</option>
                    </select>
                  ) : (
                    <div className="px-3 py-2 bg-gray-50 rounded-md">
                      {statusInfo.label}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {record.sourceFile && (
              <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-md">
                来源文件：{record.sourceFile}
              </div>
            )}

            {record.mergeEvidence && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-800 mb-2">归并证据</h4>
                <p className="text-sm text-blue-700">
                  已归并：{record.mergeEvidence.mergedNames.join('、')}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  原因：{record.mergeEvidence.reason}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  操作人：{record.mergeEvidence.operator} · {formatDateTime(record.mergeEvidence.operateTime)}
                </p>
              </div>
            )}

            {editing && (
              <div className="bg-warning-50 border border-warning-200 rounded-md p-4">
                <label className="block text-sm font-medium text-warning-800 mb-2">
                  修改备注（必填）
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="请说明修改原因..."
                  className="w-full px-3 py-2 border border-warning-300 rounded-md focus:outline-none focus:ring-2 focus:ring-warning-500"
                  rows={2}
                />
              </div>
            )}

            {editing && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setEditing(false); setFormData(record); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  保存修改
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 border-l border-gray-200 overflow-y-auto scrollbar-thin bg-gray-50">
          <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-4 py-3 z-10">
            <h4 className="font-serif font-semibold text-gray-800">问题与历史</h4>
          </div>

          <div className="p-4 space-y-4">
            {record.issues.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-warning-500" />
                  数据问题 ({record.issues.filter(i => !i.resolved).length} 项未解决)
                </h5>
                <div className="space-y-2">
                  {record.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`border rounded-md p-3 ${getSeverityColor(issue.severity)} ${!issue.resolved ? 'animate-border-pulse' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium">
                          {getIssueTypeLabel(issue.type)}
                        </span>
                        {!issue.resolved ? (
                          <button
                            onClick={() => handleResolveIssue(issue.id)}
                            className="text-xs hover:underline"
                          >
                            标记解决
                          </button>
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm mt-1">{issue.description}</p>
                      <p className="text-xs mt-2 opacity-80">
                        <strong>下一步：</strong>{issue.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">修改历史</h5>
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">暂无修改记录</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
                  {history.map((item, idx) => (
                    <div key={item.id} className="relative animate-fade-in-left" style={{ animationDelay: `${idx * 0.05}s` }}>
                      <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-primary-500 border-2 border-white" />
                      <div className="bg-white rounded-md p-3 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{item.operator}</span>
                          <span>{formatDateTime(item.operateTime)}</span>
                        </div>
                        <p className="text-sm mt-1">
                          <span className="font-medium text-gray-700">{item.field}：</span>
                          <span className="text-red-600 line-through">{item.oldValue || '(空)'}</span>
                          <span className="mx-1">→</span>
                          <span className="text-green-600">{item.newValue || '(空)'}</span>
                        </p>
                        {item.note && (
                          <p className="text-xs text-gray-500 mt-1">备注：{item.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
