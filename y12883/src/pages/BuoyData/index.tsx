import { useState } from 'react';
import {
  Database,
  Search,
  Filter,
  Upload,
  Plus,
  Edit3,
  Trash2,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileDown,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { formatDateTime, generateId } from '@/utils/formatters';
import type { BuoyDataStatus, BuoyData } from '@/types';
import { BUOY_STATUS_LABELS } from '@/types';

export default function BuoyDataPage() {
  const { buoyData, updateBuoyStatus, deleteBuoyData, addBuoyData, importBuoyData, isFirstVisit, addCorrectionRecord } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedData, setSelectedData] = useState<BuoyData | null>(null);
  const [importResult, setImportResult] = useState<{ added: number; updated: number; duplicates: number } | null>(null);

  const [formData, setFormData] = useState({
    stationName: '东海一号浮标',
    timestamp: new Date().toISOString().slice(0, 16),
    windSpeed: 8,
    windDirection: 180,
    waveHeight: 1.0,
    wavePeriod: 6,
    visibility: 2000,
    status: 'available' as BuoyDataStatus,
    dataSource: '手动录入',
  });

  const [editFormData, setEditFormData] = useState({
    fieldName: 'windSpeed',
    fieldLabel: '风速',
    newValue: 0,
    reason: '',
    operator: '科研助理',
    unit: 'm/s',
  });

  const stations = Array.from(new Set(buoyData.map((d) => d.stationName)));

  const filteredData = buoyData.filter((data) => {
    const matchesSearch =
      data.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      data.dataSource.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || data.status === statusFilter;
    const matchesStation = stationFilter === 'all' || data.stationName === stationFilter;
    return matchesSearch && matchesStatus && matchesStation;
  });

  const handleAddData = () => {
    addBuoyData({
      stationName: formData.stationName,
      timestamp: new Date(formData.timestamp).toISOString(),
      windSpeed: formData.windSpeed,
      windDirection: formData.windDirection,
      waveHeight: formData.waveHeight,
      wavePeriod: formData.wavePeriod,
      visibility: formData.visibility,
      status: formData.status,
      dataSource: formData.dataSource,
    });
    setShowAddModal(false);
  };

  const handleOpenEdit = (data: BuoyData) => {
    setSelectedData(data);
    setEditFormData({
      fieldName: 'windSpeed',
      fieldLabel: '风速',
      newValue: data.windSpeed,
      reason: '',
      operator: '科研助理',
      unit: 'm/s',
    });
    setShowEditModal(true);
  };

  const fieldOptions = [
    { value: 'windSpeed', label: '风速', unit: 'm/s' },
    { value: 'waveHeight', label: '浪高', unit: 'm' },
    { value: 'visibility', label: '能见度', unit: 'm' },
    { value: 'windDirection', label: '风向', unit: '°' },
    { value: 'wavePeriod', label: '浪周期', unit: 's' },
  ];

  const handleFieldChange = (value: string) => {
    const field = fieldOptions.find((f) => f.value === value);
    if (field && selectedData) {
      const oldValue = (selectedData as any)[field.value] as number;
      setEditFormData({
        fieldName: field.value,
        fieldLabel: field.label,
        newValue: oldValue,
        unit: field.unit,
        reason: '',
        operator: '科研助理',
      });
    }
  };

  const handleSubmitCorrection = () => {
    if (!selectedData) return;
    
    const oldValue = (selectedData as any)[editFormData.fieldName] as number;
    if (oldValue === editFormData.newValue) {
      alert('数值未发生变化');
      return;
    }

    addCorrectionRecord({
      buoyDataId: selectedData.id,
      fieldName: editFormData.fieldName,
      fieldLabel: editFormData.fieldLabel,
      oldValue,
      newValue: editFormData.newValue,
      unit: editFormData.unit,
      reason: editFormData.reason,
      operator: editFormData.operator,
    });

    setShowEditModal(false);
    setSelectedData(null);
  };

  const handleImport = () => {
    const sampleImport = generateSampleImportData();
    const result = importBuoyData(sampleImport);
    setImportResult(result);
  };

  const generateSampleImportData = (): Omit<BuoyData, 'id' | 'createdAt' | 'updatedAt'>[] => {
    const now = new Date();
    return [
      {
        stationName: '东海一号浮标',
        timestamp: now.toISOString(),
        windSpeed: 7.2,
        windDirection: 135,
        waveHeight: 0.9,
        wavePeriod: 5.5,
        visibility: 2500,
        status: 'available',
        dataSource: '批量导入',
      },
      {
        stationName: '南海二号浮标',
        timestamp: new Date(now.getTime() - 3600000).toISOString(),
        windSpeed: 9.5,
        windDirection: 200,
        waveHeight: 1.3,
        wavePeriod: 7.2,
        visibility: 1200,
        status: 'pending',
        dataSource: '批量导入',
      },
      {
        stationName: buoyData[0]?.stationName || '黄海三号浮标',
        timestamp: buoyData[0]?.timestamp || new Date().toISOString(),
        windSpeed: 8.0,
        windDirection: 180,
        waveHeight: 1.1,
        wavePeriod: 6.0,
        visibility: 1800,
        status: 'available',
        dataSource: '批量导入',
      },
    ];
  };

  if (isFirstVisit) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white font-display mb-1">浮标数据管理</h1>
          <p className="text-gray-400 text-sm">数据状态标记、导入补录、去重校验</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-gray-300 text-sm hover:bg-white/10 transition-colors"
          >
            <Upload size={16} />
            导入/补录
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-ocean-500 to-ocean-600 text-white text-sm font-medium
                     hover:from-ocean-400 hover:to-ocean-500 transition-all shadow-lg shadow-ocean-500/20"
          >
            <Plus size={16} />
            新增数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '数据总数', value: buoyData.length, color: 'text-ocean-400', icon: Database },
          {
            label: '可用数据',
            value: buoyData.filter((d) => d.status === 'available').length,
            color: 'text-emerald-400',
            icon: CheckCircle,
          },
          {
            label: '暂缓数据',
            value: buoyData.filter((d) => d.status === 'pending').length,
            color: 'text-amber-400',
            icon: AlertCircle,
          },
          {
            label: '需重采',
            value: buoyData.filter((d) => d.status === 'recollect').length,
            color: 'text-red-400',
            icon: XCircle,
          },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-white/10 bg-white/5"
              style={{
                opacity: 0,
                animation: `fadeInUp 0.4s ease-out ${index * 50}ms forwards`,
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5">
                  <Icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="搜索站点名称、数据源..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     placeholder:text-gray-600 focus:outline-none focus:border-ocean-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:border-ocean-500/50"
          >
            <option value="all">全部状态</option>
            {Object.entries(BUOY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={stationFilter}
            onChange={(e) => setStationFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                     focus:outline-none focus:border-ocean-500/50"
          >
            <option value="all">全部站点</option>
            {stations.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">站点名称</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">风速</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">风向</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">浪高</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">周期</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">能见度</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">来源</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((data, index) => (
                <tr
                  key={data.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  style={{
                    opacity: 0,
                    animation: `fadeInUp 0.3s ease-out ${index * 30}ms forwards`,
                  }}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{data.stationName}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {formatDateTime(data.timestamp)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      data.windSpeed > 10.8 ? 'text-red-400' :
                      data.windSpeed > 8 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.windSpeed.toFixed(1)} m/s
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">
                    {data.windDirection}°
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      data.waveHeight > 1.5 ? 'text-red-400' :
                      data.waveHeight > 1.0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.waveHeight.toFixed(2)} m
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-300">
                    {data.wavePeriod.toFixed(1)}s
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${
                      data.visibility < 1000 ? 'text-red-400' :
                      data.visibility < 1500 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {data.visibility} m
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center">
                      <select
                        value={data.status}
                        onChange={(e) => updateBuoyStatus(data.id, e.target.value as BuoyDataStatus)}
                        className="px-2 py-1 rounded-lg bg-transparent border-0 text-xs font-medium focus:outline-none cursor-pointer"
                        style={{
                          color: data.status === 'available' ? '#34d399' :
                                 data.status === 'pending' ? '#fbbf24' : '#f87171'
                        }}
                      >
                        {Object.entries(BUOY_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-deep-700">
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-gray-500">{data.dataSource}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(data)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-ocean-400 hover:bg-white/10 transition-colors"
                        title="人工修正"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('确定删除这条数据吗？')) {
                            deleteBuoyData(data.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/10 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="py-12 text-center">
            <Database size={48} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-500">暂无匹配的数据</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="新增浮标数据"
        footer={
          <>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAddData}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-ocean-500 to-ocean-600 text-white text-sm font-medium"
            >
              添加
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">站点名称</label>
            <input
              type="text"
              value={formData.stationName}
              onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                       focus:outline-none focus:border-ocean-500/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">风速 (m/s)</label>
              <input
                type="number"
                value={formData.windSpeed}
                onChange={(e) => setFormData({ ...formData, windSpeed: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-ocean-500/50"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">风向 (°)</label>
              <input
                type="number"
                value={formData.windDirection}
                onChange={(e) => setFormData({ ...formData, windDirection: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-ocean-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">浪高 (m)</label>
              <input
                type="number"
                value={formData.waveHeight}
                onChange={(e) => setFormData({ ...formData, waveHeight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-ocean-500/50"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">周期 (s)</label>
              <input
                type="number"
                value={formData.wavePeriod}
                onChange={(e) => setFormData({ ...formData, wavePeriod: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-ocean-500/50"
                step="0.1"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">能见度 (m)</label>
              <input
                type="number"
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-ocean-500/50"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">状态</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as BuoyDataStatus })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                         focus:outline-none focus:border-ocean-500/50"
              >
                {Object.entries(BUOY_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">采集时间</label>
            <input
              type="datetime-local"
              value={formData.timestamp}
              onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                       focus:outline-none focus:border-ocean-500/50"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedData(null);
        }}
        title="人工修正数据"
        footer={
          <>
            <button
              onClick={() => {
                setShowEditModal(false);
                setSelectedData(null);
              }}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmitCorrection}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-ocean-500 to-ocean-600 text-white text-sm font-medium"
            >
              提交修正（待确认）
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-gray-500 mb-1">数据站点</p>
            <p className="text-sm text-white font-medium">{selectedData?.stationName}</p>
            <p className="text-xs text-gray-500 mt-1">
              采集时间: {selectedData ? formatDateTime(selectedData.timestamp) : ''}
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">修正字段</label>
            <select
              value={editFormData.fieldName}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                       focus:outline-none focus:border-ocean-500/50"
            >
              {fieldOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">原始值</label>
              <div className="px-3 py-2 rounded-lg bg-deep-700/50 border border-white/5 text-gray-400 text-sm">
                {selectedData ? (selectedData as any)[editFormData.fieldName] : '-'} {editFormData.unit}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1 block">修正后</label>
              <input
                type="number"
                value={editFormData.newValue}
                onChange={(e) => setEditFormData({ ...editFormData, newValue: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-ocean-500/30 text-ocean-300 text-sm
                         focus:outline-none focus:border-ocean-500/50"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">修正原因</label>
            <textarea
              value={editFormData.reason}
              onChange={(e) => setEditFormData({ ...editFormData, reason: e.target.value })}
              placeholder="请说明修正原因..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                       focus:outline-none focus:border-ocean-500/50 resize-none"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1 block">操作人</label>
            <input
              type="text"
              value={editFormData.operator}
              onChange={(e) => setEditFormData({ ...editFormData, operator: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-deep-700 border border-white/10 text-white text-sm
                       focus:outline-none focus:border-ocean-500/50"
            />
          </div>

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <p className="text-xs text-amber-300">
              ⚠️ 修正提交后状态为"待确认"，需在修正记录页面确认后生效
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportResult(null);
        }}
        title="导入/补录数据"
        footer={
          <>
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportResult(null);
              }}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-colors"
            >
              关闭
            </button>
          </>
        }
      >
        {!importResult ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
              <Upload size={40} className="mx-auto text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 mb-4">拖拽文件到此处或点击上传</p>
              <p className="text-xs text-gray-600 mb-4">支持 CSV、Excel 格式</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-400 mb-2">数据去重规则</p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• 根据「站点名称 + 采集时间」判断是否重复</li>
                <li>• 重复且数据相同：跳过不处理</li>
                <li>• 重复但数据不同：更新现有记录，保留修改痕迹</li>
                <li>• 不重复：新增数据记录</li>
              </ul>
            </div>

            <button
              onClick={handleImport}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-ocean-500 to-ocean-600 text-white text-sm font-medium
                       hover:from-ocean-400 hover:to-ocean-500 transition-all flex items-center justify-center gap-2"
            >
              <FileDown size={18} />
              模拟导入示例数据
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-1">导入完成</h3>
              <p className="text-sm text-gray-400">数据去重校验已完成</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-2xl font-bold text-emerald-400 font-display">{importResult.added}</p>
                <p className="text-xs text-gray-400 mt-1">新增数据</p>
              </div>
              <div className="p-4 rounded-lg bg-ocean-500/10 border border-ocean-500/20 text-center">
                <p className="text-2xl font-bold text-ocean-400 font-display">{importResult.updated}</p>
                <p className="text-xs text-gray-400 mt-1">更新数据</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20 text-center">
                <p className="text-2xl font-bold text-gray-400 font-display">{importResult.duplicates}</p>
                <p className="text-xs text-gray-400 mt-1">重复跳过</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500">
                ✅ 同一件事不会出现两份结论。重复数据已自动合并更新。
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
