import React, { useRef, useState } from 'react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Calendar,
  Users,
  CreditCard,
  Clock,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { StatusTag } from '@/components/ui/StatusTag';
import { ImportService } from '@/services/importService';
import * as XLSX from 'xlsx';
import type { SourceType, BadRecord, ImportResult } from '@/types';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';

const sourceTypes: { type: SourceType; label: string; icon: any; color: string }[] = [
  { type: '会员账户', label: '会员账户', icon: Users, color: 'bg-blue-500' },
  { type: '里程流水', label: '里程流水', icon: Clock, color: 'bg-purple-500' },
  { type: '兑换订单', label: '兑换订单', icon: CreditCard, color: 'bg-amber-500' },
  { type: '过期日历', label: '过期日历', icon: Calendar, color: 'bg-red-500' },
];

export const ImportCenterPage: React.FC = () => {
  const storeImportData = useAppStore((state) => state.importData);
  const badRecords = useAppStore((state) => state.badRecords);
  const operationLogs = useAppStore((state) => state.operationLogs);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'template'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSource, setSelectedSource] = useState<SourceType | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const importHistory = operationLogs.filter(log => log.operationType === '导入');

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedSource) return;

    const file = files[0];
    try {
      const result = await storeImportData(selectedSource, file);
      setImportResult(result);
    } catch (error) {
      alert('文件导入失败: ' + (error as Error).message);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = (sourceType: SourceType) => {
    try {
      const importService = new ImportService();
      const template = importService.generateTemplate(sourceType);
      const ws = XLSX.utils.json_to_sheet(template.sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sourceType);
      XLSX.writeFile(wb, `${sourceType}导入模板.xlsx`);
    } catch (error) {
      alert('模板下载失败: ' + (error as Error).message);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-gray-900">
          数据导入中心
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          支持 Excel(.xlsx) 和 CSV 格式，可处理空行、备注、缺列等情况
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          {[
            { key: 'upload', label: '上传数据' },
            { key: 'history', label: '导入历史' },
            { key: 'template', label: '模板下载' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'pb-4 px-1 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-[#1E3A5F] text-[#1E3A5F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="font-semibold text-gray-900">选择数据源</h3>
            <div className="space-y-3">
              {sourceTypes.map(source => {
                const Icon = source.icon;
                return (
                  <button
                    key={source.type}
                    onClick={() => setSelectedSource(source.type)}
                    className={cn(
                      'w-full p-4 rounded-lg border-2 text-left transition-all',
                      selectedSource === source.type
                        ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', source.color)}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{source.label}</p>
                        <p className="text-xs text-gray-500">
                        {source.type === '会员账户' && '会员基础信息和里程余额'}
                        {source.type === '里程流水' && '所有里程增减交易记录'}
                        {source.type === '兑换订单' && '兑换订单和使用情况'}
                        {source.type === '过期日历' && '里程到期日历和过期记录'}
                      </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {badRecords.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      发现 {badRecords.length} 条坏行
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      坏行已单独列出，请前往"坏行管理"处理
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {!selectedSource ? (
              <div className="card h-80 flex flex-col items-center justify-center text-gray-500">
                <FileSpreadsheet className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">请先选择数据源类型</p>
                <p className="text-sm mt-1">从左侧选择要导入的数据类型</p>
              </div>
            ) : (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'card h-80 flex flex-col items-center justify-center cursor-pointer transition-all border-2 border-dashed',
                    isDragging
                      ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                >
                  <Upload className="w-12 h-12 mb-4 text-gray-400" />
                  <p className="text-lg font-medium text-gray-700">
                    {isDragging ? '释放文件上传' : '点击或拖拽文件到此处'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    支持 .xlsx 和 .csv 格式
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                </div>

                {importResult && (
                  <div className="mt-6 card">
                    <h3 className="font-semibold text-gray-900 mb-4">导入结果</h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="p-4 bg-green-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {importResult.validRows}
                        </p>
                        <p className="text-sm text-green-700">成功导入</p>
                      </div>
                      <div className="p-4 bg-red-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-red-600">
                          {importResult.badRows}
                        </p>
                        <p className="text-sm text-red-700">坏行记录</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-gray-600">
                          {importResult.totalRows - importResult.validRows - importResult.badRows}
                        </p>
                        <p className="text-sm text-gray-700">跳过空行/备注</p>
                      </div>
                    </div>

                    {importResult.badRecords.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">坏行详情</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {importResult.badRecords.slice(0, 10).map((bad, idx) => (
                            <BadRowItem key={idx} record={bad} />
                          ))}
                          {importResult.badRecords.length > 10 && (
                            <p className="text-sm text-gray-500 text-center py-2">
                              ...还有 {importResult.badRecords.length - 10} 条坏行
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">操作时间</th>
                  <th className="table-header">操作类型</th>
                  <th className="table-header">操作详情</th>
                  <th className="table-header">操作人</th>
                </tr>
              </thead>
              <tbody>
                {importHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-cell text-center py-12 text-gray-500">
                      暂无导入记录
                    </td>
                  </tr>
                ) : (
                  importHistory.map((record, idx) => (
                    <tr key={record.id} className="table-row animate-fade-in" style={{ animationDelay: `${idx * 50}ms` }}>
                      <td className="table-cell">{formatDateTime(record.createTime)}</td>
                      <td className="table-cell">
                        <StatusTag status={record.operationType} type="process" />
                      </td>
                      <td className="table-cell max-w-[300px] truncate">{record.operationType + ' - ' + record.operator}</td>
                      <td className="table-cell">{record.operator}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'template' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sourceTypes.map(source => {
            const Icon = source.icon;
            return (
              <div key={source.type} className="card p-6">
                <div className="flex items-start gap-4">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', source.color)}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{source.label}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {source.type === '会员账户' && '包含会员号、姓名、账户类型、剩余里程、过期日期等字段'}
                      {source.type === '里程流水' && '包含交易日期、交易类型、里程增减、余额、备注等字段'}
                      {source.type === '兑换订单' && '包含订单号、兑换日期、兑换产品、使用里程、订单状态等字段'}
                      {source.type === '过期日历' && '包含会员号、到期日期、到期里程、状态、备注等字段'}
                    </p>
                    <button
                      onClick={() => handleDownloadTemplate(source.type)}
                      className="mt-4 btn btn-primary btn-sm gap-2"
                    >
                      <Download className="w-4 h-4" />
                      下载模板
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BadRowItem: React.FC<{ record: BadRecord }> = ({ record }) => {
  const iconMap: Record<string, React.ReactNode> = {
    '空行': <XCircle className="w-4 h-4 text-gray-400" />,
    '缺列': <AlertCircle className="w-4 h-4 text-amber-500" />,
    '格式错误': <AlertCircle className="w-4 h-4 text-orange-500" />,
    '数据异常': <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="mt-0.5">{iconMap[record.errorType] || <AlertCircle className="w-4 h-4 text-gray-400" />}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
            第 {record.rowNumber} 行
          </span>
          <StatusTag status={record.errorType} type="error" />
        </div>
        <p className="text-sm text-gray-600 mt-1">{record.errorDescription}</p>
        {record.repairSuggestion && (
          <p className="text-xs text-gray-500 mt-1">建议：{record.repairSuggestion}</p>
        )}
      </div>
    </div>
  );
};
