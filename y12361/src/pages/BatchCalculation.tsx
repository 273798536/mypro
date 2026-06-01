import { useState } from 'react';
import { Upload, Plus, Trash2, Play, FileText, Copy } from 'lucide-react';
import { useDopplerStore } from '../store/useDopplerStore';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ReasonTooltip } from '../components/shared/ReasonTooltip';
import type { DopplerRecord, Direction } from '../types/doppler';
import type { CalculationStatus } from '../types/doppler';

type TabType = 'all' | CalculationStatus;

const statusTabs: { key: TabType; label: string; color: string }[] = [
  { key: 'all', label: '全部', color: 'text-slate-600' },
  { key: 'normal', label: '正常', color: 'text-emerald-600' },
  { key: 'pending', label: '待确认', color: 'text-amber-600' },
  { key: 'error', label: '异常', color: 'text-red-600' }
];

export function BatchCalculation() {
  const {
    records, updateRecord, deleteRecord, createRecord, recalculateAll, importFromCSV, recalculateRecord
  } = useDopplerStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isDragging, setIsDragging] = useState(false);

  const filteredRecords = records.filter(r => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      importFromCSV(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        importFromCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const handleAddRow = () => {
    createRecord('manual', '批量计算');
  };

  const handleCellUpdate = (id: string, field: keyof DopplerRecord, value: any) => {
    updateRecord(id, { [field]: value });
    setTimeout(() => recalculateRecord(id), 0);
  };

  const directionOptions: { value: Direction; label: string }[] = [
    { value: 'approaching', label: '靠近' },
    { value: 'receding', label: '远离' }
  ];

  const handleCopyTemplate = () => {
    const template = '发射频率(Hz),接收频率(Hz),速度(m/s),运动方向,温度(°C)';
    navigator.clipboard.writeText(template);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">批量计算</h1>
          <p className="text-slate-600 text-sm mt-1">
            批量导入或录入数据，自动分类计算结果
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCopyTemplate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Copy className="w-4 h-4" />
            复制模板
          </button>
          <button
            onClick={recalculateAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-4 h-4" />
            全部重算
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mb-6 p-8 border-2 border-dashed rounded-xl text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 bg-slate-50 hover:border-slate-300'
        }`}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload" className="cursor-pointer block py-8">
          <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <div className="text-sm font-medium text-slate-700 mb-2">
            点击或拖拽CSV文件到此处
          </div>
          <div className="text-xs text-slate-500">
            支持CSV格式，包含发射频率、接收频率等字段
          </div>
        </label>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex gap-1">
            {statusTabs.map((tab) => {
              const count = tab.key === 'all'
                ? records.length
                : records.filter(r => r.status === tab.key).length;
              
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.key
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className={activeTab === tab.key ? tab.color : ''}>
                    {tab.label}
                  </span>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-slate-200 rounded-full">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加行
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  发射频率
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  接收频率
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  频移
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  速度
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  方向
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  温度
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  声速
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                    <div>暂无数据，点击上方按钮添加或导入数据</div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <EditableRow
                    key={record.id}
                    record={record}
                    index={index}
                    directionOptions={directionOptions}
                    onUpdate={handleCellUpdate}
                    onDelete={() => deleteRecord(record.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface EditableRowProps {
  record: DopplerRecord;
  index: number;
  directionOptions: { value: Direction; label: string }[];
  onUpdate: (id: string, field: keyof DopplerRecord, value: any) => void;
  onDelete: () => void;
}

function EditableRow({ record, index, directionOptions, onUpdate, onDelete }: EditableRowProps) {
  const handleNumberChange = (field: keyof DopplerRecord, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    onUpdate(record.id, field, isNaN(numValue) ? null : numValue);
  };

  const inputClass = "w-full px-2 py-1 text-sm font-mono bg-transparent border border-transparent hover:border-slate-200 rounded focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400";

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm text-slate-500 font-mono">
        {index + 1}
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={record.emittedFrequency ?? ''}
          onChange={(e) => handleNumberChange('emittedFrequency', e.target.value)}
          className={inputClass}
          placeholder="--"
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={record.receivedFrequency ?? ''}
          onChange={(e) => handleNumberChange('receivedFrequency', e.target.value)}
          className={inputClass}
          placeholder="--"
        />
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-mono ${
          record.frequencyShift === null
            ? 'text-slate-400'
            : record.frequencyShift > 0
              ? 'text-emerald-600'
              : 'text-red-600'
        }`}>
          {record.frequencyShift !== null ? record.frequencyShift.toFixed(2) : '--'}
        </span>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={record.velocity ?? ''}
          onChange={(e) => handleNumberChange('velocity', e.target.value)}
          className={inputClass}
          placeholder="--"
        />
      </td>
      <td className="px-4 py-3">
        <select
          value={record.direction ?? ''}
          onChange={(e) => onUpdate(record.id, 'direction', e.target.value || null)}
          className="w-full px-2 py-1 text-sm bg-transparent border border-transparent hover:border-slate-200 rounded focus:outline-none focus:border-blue-400"
        >
          <option value="">--</option>
          {directionOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          value={record.temperature ?? ''}
          onChange={(e) => handleNumberChange('temperature', e.target.value)}
          className={inputClass}
          placeholder="--"
        />
      </td>
      <td className="px-4 py-3 text-sm font-mono text-slate-600">
        {record.speedOfSound.toFixed(1)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={record.status} showLabel={false} />
          <ReasonTooltip
            reasons={record.statusReasons}
            status={record.status}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
