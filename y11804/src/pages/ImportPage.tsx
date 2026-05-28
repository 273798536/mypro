import { useState } from 'react';
import { Upload, FileText, Building2, Banknote, CheckCircle, Clock, X, AlertCircle } from 'lucide-react';
import { useCouponStore } from '../store/useCouponStore';
import { ImportType } from '../types';
import { formatDateDisplay } from '../utils/dateUtils';

const importTypes: { type: ImportType; label: string; icon: typeof FileText; color: string; description: string }[] = [
  {
    type: 'position',
    label: '债券持仓表',
    icon: Building2,
    color: 'blue',
    description: '导入债券持仓明细，包含债券代码、名称、持仓面额等',
  },
  {
    type: 'coupon',
    label: '票息计划表',
    icon: FileText,
    color: 'emerald',
    description: '导入每期票息计划，关联持仓计算应付金额',
  },
  {
    type: 'receipt',
    label: '托管回单',
    icon: Banknote,
    color: 'purple',
    description: '导入托管行到账回单，系统自动匹配核验',
  },
];

export const ImportPage = () => {
  const { importRecords, positions, couponPlans, receipts, addPositions, addCouponPlans, addReceipts } =
    useCouponStore();
  const [activeTab, setActiveTab] = useState<ImportType>('position');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      simulateUpload(file.name);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateUpload(file.name);
    }
  };

  const simulateUpload = (fileName: string) => {
    setUploadFileName(fileName);
    setIsUploading(true);
    setUploadSuccess(false);

    setTimeout(() => {
      setIsUploading(false);
      setUploadSuccess(true);

      if (activeTab === 'position') {
        const mockPositions = [
          {
            bondCode: '019547',
            bondName: '24国债05',
            faceValue: 100,
            positionAmount: 50000000,
            account: '自营账户A',
            importDate: '',
            importOrder: 0,
          },
          {
            bondCode: '110088',
            bondName: '24国开05',
            faceValue: 100,
            positionAmount: 30000000,
            account: '资管产品1号',
            importDate: '',
            importOrder: 0,
          },
        ];
        addPositions(mockPositions, fileName);
      } else if (activeTab === 'coupon') {
        const mockPlans = [
          {
            planId: 'CP0001',
            bondCode: '019547',
            bondName: '24国债05',
            paymentDate: '2026-05-15',
            couponRate: 2.35,
            expectedAmount: 482876.71,
            daysAccrued: 150,
            isHolidayAdjusted: false,
            importDate: '',
            status: 'pending' as const,
          },
        ];
        addCouponPlans(mockPlans, fileName);
      } else if (activeTab === 'receipt') {
        const mockReceipts = [
          {
            receiptId: 'CR0001',
            planId: 'CP0001',
            bondCode: '019547',
            actualDate: '2026-05-15',
            actualAmount: 482876.71,
            bankReference: 'BK202605150001',
            bankName: '工商银行托管部',
            importDate: '',
            importOrder: 0,
          },
        ];
        addReceipts(mockReceipts, fileName);
      }

      setTimeout(() => {
        setUploadSuccess(false);
        setUploadFileName(null);
      }, 2000);
    }, 1500);
  };

  const activeImport = importTypes.find((t) => t.type === activeTab)!;
  const Icon = activeImport.icon;

  const getRecordCount = (type: ImportType) => {
    switch (type) {
      case 'position':
        return positions.length;
      case 'coupon':
        return couponPlans.length;
      case 'receipt':
        return receipts.length;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">数据导入中心</h1>
          <p className="text-gray-500">
            分批导入债券持仓、票息计划和托管回单。系统会记录导入顺序，后导入的回单自动触发重新核验。
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          {importTypes.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.type;
            return (
              <button
                key={item.type}
                onClick={() => setActiveTab(item.type)}
                className={`flex-1 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  isActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <ItemIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">
                      已导入 <span className="font-medium">{getRecordCount(item.type)}</span> 条
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl ${
                  activeImport.color === 'blue'
                    ? 'bg-blue-100 text-blue-600'
                    : activeImport.color === 'emerald'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-purple-100 text-purple-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">导入{activeImport.label}</h2>
                <p className="text-sm text-gray-500">{activeImport.description}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-sm font-medium text-gray-700">正在处理 {uploadFileName}...</p>
                  <p className="text-xs text-gray-500 mt-1">解析数据并入库</p>
                </div>
              ) : uploadSuccess ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-emerald-700">导入成功！</p>
                  <p className="text-xs text-gray-500 mt-1">{uploadFileName}</p>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    拖拽文件到此处，或
                    <label className="text-blue-600 cursor-pointer hover:underline ml-1">
                      点击选择文件
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">支持 .xlsx, .xls, .csv 格式</p>
                </>
              )}
            </div>

            <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">导入提示</p>
                  <ul className="text-xs text-amber-700 mt-1 space-y-1">
                    <li>• 请确保Excel文件包含正确的列名和数据格式</li>
                    <li>• 托管回单可以延后导入，系统会自动匹配并重新核验</li>
                    <li>• 导入顺序会被记录，用于追溯数据来源</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">导入历史</h3>
          </div>
          {importRecords.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无导入记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {importRecords
                .sort((a, b) => b.importOrder - a.importOrder)
                .map((record) => {
                  const importType = importTypes.find((t) => t.type === record.type);
                  const TypeIcon = importType?.icon || FileText;
                  return (
                    <div key={record.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            record.type === 'position'
                              ? 'bg-blue-100 text-blue-600'
                              : record.type === 'coupon'
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-purple-100 text-purple-600'
                          }`}
                        >
                          <TypeIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{record.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {importTypes.find((t) => t.type === record.type)?.label} ·{' '}
                            {record.recordCount} 条记录 · 导入顺序 #{record.importOrder}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {formatDateDisplay(record.importDate)}
                        </span>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
