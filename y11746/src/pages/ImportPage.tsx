import React, { useState } from 'react';
import { Upload, Play, Trash2, FileText, Database, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { dataSourceLabels, DataSource } from '../types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const sourceOptions: { key: DataSource; description: string }[] = [
  { key: 'donation_flow', description: '包含捐赠人、金额、项目、日期等信息' },
  { key: 'project_tag', description: '包含项目编号、名称、是否定向、分类等' },
  { key: 'physical_valuation', description: '包含物品名称、数量、估值、估值方法' },
  { key: 'refund_record', description: '包含退款金额、日期、原因、关联捐赠' },
  { key: 'invoice_number', description: '包含票据号码、开票日期、状态等' },
];

export const ImportPage: React.FC = () => {
  const loadSampleData = useAppStore(state => state.loadSampleData);
  const clearData = useAppStore(state => state.clearData);
  const importData = useAppStore(state => state.importData);
  const isDataLoaded = useAppStore(state => state.isDataLoaded);
  const donations = useAppStore(state => state.donations);
  const projects = useAppStore(state => state.projects);
  const physicalGoods = useAppStore(state => state.physicalGoods);
  const refunds = useAppStore(state => state.refunds);
  const invoices = useAppStore(state => state.invoices);

  const [uploadingSource, setUploadingSource] = useState<DataSource | null>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<DataSource, boolean>>({
    donation_flow: false,
    project_tag: false,
    physical_valuation: false,
    refund_record: false,
    invoice_number: false,
    verification_report: false,
  });

  const handleFileUpload = (source: DataSource, file: File) => {
    setUploadingSource(source);
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result;
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        const result = Papa.parse(content as string, { header: true });
        data = result.data;
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(content, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      }

      importData(source, data);
      setUploadStatus(prev => ({ ...prev, [source]: true }));
      setUploadingSource(null);
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (source: DataSource, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(source, file);
    }
  };

  const handleFileInput = (source: DataSource, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(source, file);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800">数据导入</h2>
        <p className="text-sm text-gray-500 mt-1">导入多来源数据，或使用样例数据快速体验</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={loadSampleData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Play size={16} />
          加载样例数据
        </button>
        <button
          onClick={clearData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <Trash2 size={16} />
          清空数据
        </button>
      </div>

      {isDataLoaded && (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">捐赠流水</span>
              <FileText size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{donations.length}</div>
            <div className="text-xs text-gray-400">条记录</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">项目标签</span>
              <Database size={16} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{projects.length}</div>
            <div className="text-xs text-gray-400">个项目</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">实物估值</span>
              <Database size={16} className="text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{physicalGoods.length}</div>
            <div className="text-xs text-gray-400">条记录</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">退款记录</span>
              <Database size={16} className="text-red-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{refunds.length}</div>
            <div className="text-xs text-gray-400">条记录</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">票据号码</span>
              <FileText size={16} className="text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-800">{invoices.length}</div>
            <div className="text-xs text-gray-400">张票据</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-800">数据源上传</h3>
          <p className="text-sm text-gray-500 mt-1">支持 CSV、Excel 格式，拖拽或点击上传</p>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4">
          {sourceOptions.map(source => (
            <div
              key={source.key}
              className={`relative flex items-center gap-4 p-4 border-2 border-dashed rounded-lg transition-colors ${
                uploadStatus[source.key]
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(source.key, e)}
            >
              <div className={`p-3 rounded-lg ${
                uploadStatus[source.key] ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {uploadStatus[source.key] ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : (
                  <Upload size={20} className="text-gray-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">
                  {dataSourceLabels[source.key]}
                </div>
                <div className="text-sm text-gray-500">{source.description}</div>
              </div>
              <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm font-medium">
                {uploadingSource === source.key ? '上传中...' : '选择文件'}
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileInput(source.key, e)}
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
