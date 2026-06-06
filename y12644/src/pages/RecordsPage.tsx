import { useState } from 'react';
import { Search, Plus, AlertTriangle, RefreshCw, Power, PowerOff } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import {
  getStatusLabel,
  getTypeLabel,
  getStatusColor,
  formatDateTime,
} from '../utils/coordinateUtils';
import { RecordStatus, RecordType } from '../types';

export default function RecordsPage() {
  const {
    records,
    devices,
    changeRecordStatus,
    addDevice,
    updateDevice,
    filterOptions,
    setFilter,
    getFilteredRecords,
  } = useAppStore();

  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceLocation, setNewDeviceLocation] = useState('');
  const [activeTab, setActiveTab] = useState<'records' | 'devices' | 'scores'>('records');

  const filteredRecords = getFilteredRecords();

  const handleAddDevice = () => {
    if (!newDeviceName.trim()) return;
    addDevice({
      name: newDeviceName.trim(),
      location: newDeviceLocation.trim() || '未设置位置',
      status: 'active',
    });
    setNewDeviceName('');
    setNewDeviceLocation('');
    setShowDeviceForm(false);
  };

  const toggleDeviceStatus = (deviceId: string) => {
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return;
    updateDevice({
      ...device,
      status: device.status === 'active' ? 'inactive' : 'active',
    });
  };

  const getDeviceName = (deviceId?: string) => {
    if (!deviceId) return '-';
    return devices.find((d) => d.id === deviceId)?.name || '-';
  };

  const averageScore =
    records.length > 0
      ? (records.reduce((sum, r) => sum + (r.score ?? 0), 0) / records.length).toFixed(1)
      : '0.0';

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">记录管理</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            共 {records.length} 条记录 · {devices.length} 台设备 · 平均评分 {averageScore}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-soft border border-gray-100">
          {[
            { key: 'records', label: '记录列表' },
            { key: 'devices', label: '设备清单' },
            { key: 'scores', label: '评分表' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-500 text-white shadow-soft'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'records' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-3 mb-4 flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="input-field pl-9"
                placeholder="搜索记录标签或备注内容..."
                value={filterOptions.searchText || ''}
                onChange={(e) => setFilter({ searchText: e.target.value || undefined })}
              />
            </div>
            <select
              className="input-field w-36"
              value={filterOptions.status || ''}
              onChange={(e) => setFilter({ status: (e.target.value as RecordStatus) || undefined })}
            >
              <option value="">全部状态</option>
              <option value="success">{getStatusLabel('success')}</option>
              <option value="pending">{getStatusLabel('pending')}</option>
              <option value="error">{getStatusLabel('error')}</option>
            </select>
            <select
              className="input-field w-36"
              value={filterOptions.type || ''}
              onChange={(e) => setFilter({ type: (e.target.value as RecordType) || undefined })}
            >
              <option value="">全部类型</option>
              <option value="guide">{getTypeLabel('guide')}</option>
              <option value="warning">{getTypeLabel('warning')}</option>
              <option value="info">{getTypeLabel('info')}</option>
            </select>
            <select
              className="input-field w-32"
              value={filterOptions.isFlipped === undefined ? '' : String(filterOptions.isFlipped)}
              onChange={(e) => {
                const v = e.target.value;
                setFilter({ isFlipped: v === '' ? undefined : v === 'true' });
              }}
            >
              <option value="">全部坐标</option>
              <option value="true">仅翻转</option>
              <option value="false">仅正常</option>
            </select>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin">
            <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      记录名称
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      坐标
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      关联设备
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      评分
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRecords.map((record) => {
                    const color = getStatusColor(record.status, record.isFlipped);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="font-medium text-gray-800">{record.label}</span>
                            {record.isFlipped && (
                              <AlertTriangle className="w-3.5 h-3.5 text-accent-500" />
                            )}
                          </div>
                          {record.annotation && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {record.annotation.content}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{getTypeLabel(record.type)}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-gray-700">
                            ({record.xCoordinate.toFixed(0)}, {record.yCoordinate.toFixed(0)})
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="status-badge"
                            style={{ backgroundColor: color + '15', color }}
                          >
                            {record.isFlipped ? '坐标翻转' : getStatusLabel(record.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {getDeviceName(record.deviceId)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-sm font-semibold tabular-nums ${
                              (record.score ?? 0) >= 80
                                ? 'text-success-600'
                                : (record.score ?? 0) >= 50
                                ? 'text-warning-600'
                                : 'text-danger-600'
                            }`}
                          >
                            {record.score ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 focus:outline-none focus:border-primary-400"
                            value={record.status}
                            onChange={(e) =>
                              changeRecordStatus(record.id, e.target.value as RecordStatus)
                            }
                          >
                            <option value="success">顺利</option>
                            <option value="pending">待确认</option>
                            <option value="error">坏数据</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredRecords.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  <p className="text-sm">暂无符合条件的记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'devices' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">
              补录设备清单后，画布状态将自动同步更新（停用设备会自动将关联记录标记为待确认）
            </p>
            <button onClick={() => setShowDeviceForm(!showDeviceForm)} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              补录设备
            </button>
          </div>

          {showDeviceForm && (
            <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 mb-4 animate-slide-up">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  className="input-field"
                  placeholder="设备名称（如：A区闸机群-03）"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="所在位置（如：站厅东南侧）"
                  value={newDeviceLocation}
                  onChange={(e) => setNewDeviceLocation(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddDevice} className="btn-primary flex-1 text-xs">
                    确认补录
                  </button>
                  <button
                    onClick={() => {
                      setShowDeviceForm(false);
                      setNewDeviceName('');
                      setNewDeviceLocation('');
                    }}
                    className="btn-secondary flex-1 text-xs"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto scrollbar-thin">
            <div className="grid grid-cols-2 gap-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 animate-fade-in"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-800">{device.name}</h4>
                      <p className="text-xs text-gray-500 mt-0.5">{device.location}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        关联记录：{records.filter((r) => r.deviceId === device.id).length} 条
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`status-badge ${
                          device.status === 'active' ? 'status-success' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {device.status === 'active' ? '运行中' : '已停用'}
                      </span>
                      <button
                        onClick={() => toggleDeviceStatus(device.id)}
                        className="text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all hover:bg-gray-100 text-gray-600"
                      >
                        {device.status === 'active' ? (
                          <>
                            <PowerOff className="w-3 h-3" />
                            停用
                          </>
                        ) : (
                          <>
                            <Power className="w-3 h-3" />
                            启用
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scores' && (
        <div className="flex-1 overflow-auto scrollbar-thin">
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">评分总览</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  颜色规则、评分表与撤销后状态同步已纳入本轮复核
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600 tabular-nums">{averageScore}</p>
                  <p className="text-xs text-gray-500">平均分</p>
                </div>
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    记录名称
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    得分
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    评分条
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    最近更新
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((record) => {
                  const score = record.score ?? 0;
                  const color = getStatusColor(record.status, record.isFlipped);
                  return (
                    <tr key={record.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 font-medium text-gray-800">{record.label}</td>
                      <td className="px-4 py-3">
                        <span
                          className="status-badge text-[10px]"
                          style={{ backgroundColor: color + '15', color }}
                        >
                          {record.isFlipped ? '翻转' : getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold tabular-nums ${
                            score >= 80
                              ? 'text-success-600'
                              : score >= 50
                              ? 'text-warning-600'
                              : 'text-danger-600'
                          }`}
                        >
                          {score}
                        </span>
                        <span className="text-xs text-gray-400">/100</span>
                      </td>
                      <td className="px-4 py-3 w-48">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${score}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(record.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
