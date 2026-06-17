import { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, Edit3, Plus, AlertCircle, CheckCircle, X } from 'lucide-react';
import { api } from '@/utils/api';
import { useStore } from '@/store/useStore';
import type { DeliveryRecord } from '@shared/types';

type TabType = 'excel' | 'manual';

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('excel');
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ count: number; records: string[] } | null>(null);
  const [manualForm, setManualForm] = useState({
    recordId: '',
    marketName: '',
    location: '',
    lat: '',
    lng: '',
    deliveryTime: '',
    truckNumber: '',
    goodsType: '',
    sourceFile: '',
  });

  const setLoading = useStore((state) => state.setLoading);
  const setError = useStore((state) => state.setError);
  const setRecords = useStore((state) => state.setRecords);
  const filters = useStore((state) => state.filters);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const data = await api.records.list(filters);
      setRecords(data);
    } catch (e) {
      // ignore
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv'))) {
      handleFileSelect(file);
    } else {
      setError('请上传Excel或CSV文件');
    }
  }, [setError]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setImportResult(null);
    setLoading(true);
    try {
      const preview = await api.import.preview(file);
      setPreviewData(preview);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const result = await api.import.excel(selectedFile);
      setImportResult(result);
      setPreviewData(null);
      setSelectedFile(null);
      loadRecords();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.recordId || !manualForm.marketName || !manualForm.location) {
      setError('请填写必填字段：记录编号、菜场名称、卸货地点');
      return;
    }

    setLoading(true);
    try {
      const record: Omit<DeliveryRecord, 'id' | 'createdAt' | 'updatedAt' | 'issues'> = {
        recordId: manualForm.recordId,
        marketName: manualForm.marketName,
        marketNameRaw: manualForm.marketName,
        location: manualForm.location,
        locationRaw: manualForm.location,
        coordinates: {
          lat: parseFloat(manualForm.lat) || 0,
          lng: parseFloat(manualForm.lng) || 0,
        },
        coordinatesRaw: {
          lat: parseFloat(manualForm.lat) || 0,
          lng: parseFloat(manualForm.lng) || 0,
        },
        deliveryTime: manualForm.deliveryTime,
        deliveryTimeRaw: manualForm.deliveryTime,
        truckNumber: manualForm.truckNumber,
        truckNumberRaw: manualForm.truckNumber,
        goodsType: manualForm.goodsType,
        goodsTypeRaw: manualForm.goodsType,
        status: 'pending',
        source: 'manual',
        sourceFile: manualForm.sourceFile || '手工录入',
      };

      await api.import.manual(record);
      setImportResult({ count: 1, records: [manualForm.recordId] });
      setManualForm({
        recordId: '',
        marketName: '',
        location: '',
        lat: '',
        lng: '',
        deliveryTime: '',
        truckNumber: '',
        goodsType: '',
        sourceFile: '',
      });
      loadRecords();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-2">数据导入</h2>
        <p className="text-gray-600">
          支持Excel/CSV文件导入或手工录入，系统将保留所有原始数据痕迹
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm border border-gray-200 w-fit">
        <button
          onClick={() => setActiveTab('excel')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md transition-all duration-200 ${
            activeTab === 'excel'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Excel导入
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-md transition-all duration-200 ${
            activeTab === 'manual'
              ? 'bg-primary-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          手工录入
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {importResult && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3 animate-fade-in-up">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">导入成功</p>
              <p className="text-sm text-green-700 mt-1">
                共导入 {importResult.count} 条记录：{importResult.records.join('、')}
              </p>
            </div>
            <button
              onClick={() => setImportResult(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {activeTab === 'excel' ? (
          <div className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 bg-white hover:border-primary-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className={`w-16 h-16 mx-auto mb-4 transition-colors ${
                dragActive ? 'text-primary-600' : 'text-gray-400'
              }`} />
              <p className="text-lg font-medium text-gray-700 mb-2">
                拖拽Excel文件到此处，或
              </p>
              <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-md cursor-pointer hover:bg-primary-700 transition-colors">
                <Plus className="w-4 h-4" />
                选择文件
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </label>
              <p className="text-sm text-gray-500 mt-4">
                支持 .xlsx, .xls, .csv 格式，最大 50MB
              </p>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-md mx-auto text-left">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">导入说明</p>
                    <p className="mt-1">系统将自动识别以下列名：</p>
                    <p className="mt-1 text-yellow-700">
                      菜场名称、卸货地点、纬度、经度、卸货时间、车牌号、货物类型、记录编号
                    </p>
                    <p className="mt-2">所有原始数据将被保留，不会自动覆盖。</p>
                  </div>
                </div>
              </div>
            </div>

            {previewData && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">数据预览</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      文件：{previewData.fileName} · 共 {previewData.totalRows} 条数据
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setPreviewData(null); setSelectedFile(null); }}
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleImport}
                      className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                    >
                      确认导入
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        {previewData.headers.map((header: string, idx: number) => (
                          <th
                            key={idx}
                            className="px-4 py-3 text-left font-medium text-gray-600 border-b border-gray-200 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.previewRows.map((row: any[], idx: number) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell: any, cellIdx: number) => (
                            <td key={cellIdx} className="px-4 py-2.5 border-b border-gray-100 text-gray-700">
                              {cell !== null && cell !== undefined ? String(cell) : '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {previewData.totalRows > 10 && (
                  <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
                    仅显示前 10 行预览，共 {previewData.totalRows} 行数据
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">手工录入数据</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                请填写以下信息，带 * 为必填项
              </p>
            </div>
            <form onSubmit={handleManualSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    记录编号 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.recordId}
                    onChange={(e) => setManualForm({ ...manualForm, recordId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：X2024001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    菜场名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.marketName}
                    onChange={(e) => setManualForm({ ...manualForm, marketName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：东风菜市场"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    卸货地点 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={manualForm.location}
                    onChange={(e) => setManualForm({ ...manualForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：东风路123号"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">纬度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={manualForm.lat}
                    onChange={(e) => setManualForm({ ...manualForm, lat: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：31.2304"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">经度</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={manualForm.lng}
                    onChange={(e) => setManualForm({ ...manualForm, lng: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：121.4737"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">卸货时间</label>
                  <input
                    type="datetime-local"
                    value={manualForm.deliveryTime}
                    onChange={(e) => setManualForm({ ...manualForm, deliveryTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">车牌号</label>
                  <input
                    type="text"
                    value={manualForm.truckNumber}
                    onChange={(e) => setManualForm({ ...manualForm, truckNumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：沪A12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">货物类型</label>
                  <select
                    value={manualForm.goodsType}
                    onChange={(e) => setManualForm({ ...manualForm, goodsType: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">请选择</option>
                    <option value="蔬菜">蔬菜</option>
                    <option value="水果">水果</option>
                    <option value="水产">水产</option>
                    <option value="肉类">肉类</option>
                    <option value="禽蛋">禽蛋</option>
                    <option value="粮油">粮油</option>
                    <option value="干货">干货</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">来源说明</label>
                  <input
                    type="text"
                    value={manualForm.sourceFile}
                    onChange={(e) => setManualForm({ ...manualForm, sourceFile: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="如：6月第三次会议纪要"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
