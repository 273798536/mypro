import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Trash2, Download, Database } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getValidator } from '@/services/validator';
import { generateId, generateTraceCode } from '@/utils/format';
import { SOURCE_TYPE_LABELS, CARD_MONTHLY_FEES } from '@/utils/constants';
import type { SourceType } from '@/types';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';

export function ImportPage() {
  const [sourceType, setSourceType] = useState<SourceType>('licensePlate');
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [badRowsPreview, setBadRowsPreview] = useState<Array<{ rowNumber: number; errorType: string; errorMessage: string; rawData: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const { addLicensePlate, addMonthlyCard, addTempParkingRecord, addDiscount, addBadRow, addImportSession, licensePlates, tempParkingRecords, discounts, badRows } = useDataStore();
  const { user } = useAuthStore();

  const handleFile = useCallback((file: File) => {
    setIsProcessing(true);
    setImportSuccess(false);
    setPreviewData([]);
    setBadRowsPreview([]);

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      let data: Record<string, string>[] = [];

      if (file.name.endsWith('.csv')) {
        const result = Papa.parse(content, { header: true, skipEmptyLines: false });
        data = result.data as Record<string, string>[];
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        const workbook = XLSX.read(content, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).slice(1).map((row: unknown[]) => {
          const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
          const obj: Record<string, string> = {};
          headers.forEach((header, i) => {
            obj[header] = String(row[i] ?? '');
          });
          return obj;
        });
      }

      processData(data);
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  }, [sourceType]);

  const processData = (data: Record<string, string>[]) => {
    const validator = getValidator(sourceType);
    const validRows: Record<string, string>[] = [];
    const errors: typeof badRowsPreview = [];

    data.forEach((row, index) => {
      const rowNumber = index + 2;
      const result = validator(row, rowNumber);

      if (result.valid && result.data) {
        validRows.push(result.data);
      } else {
        errors.push({
          rowNumber,
          errorType: result.errorType || 'unknown',
          errorMessage: result.errorMessage || '未知错误',
          rawData: JSON.stringify(row),
        });
      }
    });

    setPreviewData(validRows.slice(0, 10));
    setBadRowsPreview(errors);
    setIsProcessing(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const confirmImport = () => {
    setIsProcessing(true);

    const sessionId = generateId();

    addImportSession({
      sourceType,
      fileName: '导入文件',
      totalRows: previewData.length + badRowsPreview.length,
      successRows: previewData.length,
      badRows: badRowsPreview.length,
      status: 'completed',
      createdBy: user?.name || '系统',
    });

    previewData.forEach((row, index) => {
      switch (sourceType) {
        case 'licensePlate': {
          const plateId = generateId();
          addLicensePlate({
            plateNumber: row.plateNumber || '',
            ownerId: generateId(),
            ownerName: row.ownerName || '',
            building: row.building || '',
            roomNumber: row.roomNumber || '',
            phone: row.phone || '',
            status: 'active',
            bindingHistory: [],
          });
          const cardType = (row.cardType as 'standard' | 'vip' | 'employee') || 'standard';
          addMonthlyCard({
            plateId,
            plateNumber: row.plateNumber || '',
            cardType,
            monthlyFee: CARD_MONTHLY_FEES[cardType] || 300,
            effectiveDate: new Date().toISOString().split('T')[0],
            expiryDate: row.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'active',
            balance: 0,
            tempParkingDeduction: 0,
          });
          break;
        }
        case 'tempParking':
          addTempParkingRecord({
            plateNumber: row.plateNumber || '',
            entryTime: row.entryTime || new Date().toISOString(),
            exitTime: row.exitTime || new Date().toISOString(),
            duration: parseInt(row.duration || '0', 10),
            feeAmount: parseFloat(row.feeAmount || '0'),
            deductionAmount: parseFloat(row.deductionAmount || '0'),
            paymentMethod: row.paymentMethod || '现金',
            isDeducted: false,
            source: 'system',
          });
          break;
        case 'discount':
          addDiscount({
            ownerId: row.ownerId || generateId(),
            name: row.name || '优惠',
            type: (row.type as 'percentage' | 'fixed' | 'freeMonths') || 'percentage',
            value: parseInt(row.value || '0', 10),
            effectiveDate: row.effectiveDate || new Date().toISOString().split('T')[0],
            expiryDate: row.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            isActive: true,
            maxUsage: parseInt(row.maxUsage || '1', 10),
            usedCount: 0,
          });
          break;
      }
    });

    badRowsPreview.forEach((row) => {
      addBadRow({
        importSessionId: sessionId,
        sourceType,
        rowNumber: row.rowNumber,
        rawData: row.rawData,
        errorType: row.errorType as any,
        errorMessage: row.errorMessage,
      });
    });

    setImportSuccess(true);
    setIsProcessing(false);
    setPreviewData([]);
    setBadRowsPreview([]);
  };

  const sourceTypeOptions: { value: SourceType; label: string; icon: typeof FileSpreadsheet }[] = [
    { value: 'licensePlate', label: '车牌档案', icon: FileSpreadsheet },
    { value: 'tempParking', label: '临停流水', icon: FileSpreadsheet },
    { value: 'discount', label: '优惠记录', icon: FileSpreadsheet },
    { value: 'refund', label: '退款申请', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">数据导入</h1>
        <p className="text-slate-500 mt-1">导入车牌档案、临停流水、优惠记录等数据</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">选择数据源类型</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sourceTypeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = sourceType === option.value;
            return (
              <button
                key={option.value}
                onClick={() => {
                  setSourceType(option.value);
                  setPreviewData([]);
                  setBadRowsPreview([]);
                  setImportSuccess(false);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                  {option.label}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">上传文件</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
          <p className="text-slate-700 font-medium mb-2">拖拽文件到此处，或点击上传</p>
          <p className="text-sm text-slate-500 mb-4">支持 CSV、Excel 格式</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer transition-colors"
          >
            选择文件
          </label>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-700">正在处理文件...</p>
        </div>
      )}

      {importSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-green-700 font-medium text-lg">导入成功！</p>
          <p className="text-green-600 text-sm mt-1">
            成功导入 {previewData.length} 条记录，{badRowsPreview.length} 条异常记录
          </p>
        </div>
      )}

      {previewData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">数据预览</h3>
              <p className="text-sm text-slate-500 mt-1">
                共 {previewData.length} 条有效数据（显示前10条）
              </p>
            </div>
            <button
              onClick={confirmImport}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              确认导入
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {Object.keys(previewData[0] || {}).slice(0, 6).map((key) => (
                    <th key={key} className="px-4 py-3 text-left font-medium text-slate-600">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((row, index) => (
                  <tr key={index} className="hover:bg-slate-50">
                    {Object.values(row).slice(0, 6).map((value, i) => (
                      <td key={i} className="px-4 py-3 text-slate-700 truncate max-w-xs">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {badRowsPreview.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-red-100">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-red-800">异常行记录</h3>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                {badRowsPreview.length} 条
              </span>
            </div>
          </div>
          <div className="p-6 space-y-3 max-h-64 overflow-y-auto">
            {badRowsPreview.map((row, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-red-700">第 {row.rowNumber} 行</span>
                  <StatusBadge status={row.errorType} />
                </div>
                <p className="text-xs text-red-600">{row.errorMessage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">车牌档案</p>
              <p className="text-xl font-bold text-slate-800">{licensePlates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">临停流水</p>
              <p className="text-xl font-bold text-slate-800">{tempParkingRecords.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">异常记录</p>
              <p className="text-xl font-bold text-slate-800">{badRows.length}</p>
            </div>
          </div>
        </div>
      </div>

      {licensePlates.length === 0 && tempParkingRecords.length === 0 && discounts.length === 0 && (
        <EmptyState
          icon="upload"
          title="暂无数据"
          description="请上传车牌档案、临停流水或优惠记录文件开始使用系统"
        />
      )}
    </div>
  );
}
