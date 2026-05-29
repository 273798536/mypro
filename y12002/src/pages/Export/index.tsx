import React, { useState, useMemo, useCallback } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Settings,
  History,
  Eye,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileJson,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { ExportService } from '@/services/exportService';
import type { ExportConfig, LiabilityFilters, BusinessCategory, ReviewStatus, AccountType } from '@/types';
import { formatDateTime } from '@/utils/date';
import { cn } from '@/lib/utils';

const exportService = new ExportService();

const businessCategories: BusinessCategory[] = ['正常', '升舱退回', '活动双倍', '里程过期'];
const reviewStatuses: ReviewStatus[] = ['未复核', '复核中', '已复核', '已冲回'];
const accountTypes: AccountType[] = ['普通', '银卡', '金卡', '白金卡'];

const exportRanges = [
  { key: 'filtered', label: '当前筛选结果', description: '导出符合当前筛选条件的数据' },
  { key: 'all', label: '全部数据', description: '导出系统中所有的负债数据' },
  { key: 'custom', label: '自定义日期范围', description: '按创建日期范围导出数据' },
] as const;

type ExportRangeType = typeof exportRanges[number]['key'];

export const ExportCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'export' | 'history'>('export');

  const liabilityRecords = useAppStore((state) => state.liabilityRecords);
  const badRecords = useAppStore((state) => state.badRecords);
  const operationLogs = useAppStore((state) => state.operationLogs);
  const getFilteredRecords = useAppStore((state) => state.getFilteredRecords);
  const storeFilters = useAppStore((state) => state.filters);
  const exportData = useAppStore((state) => state.exportData);

  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [rangeType, setRangeType] = useState<ExportRangeType>('filtered');
  const [fileName, setFileName] = useState('航司里程兑付负债数据');
  const [includeBadRecords, setIncludeBadRecords] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [localFilters, setLocalFilters] = useState<LiabilityFilters>({
    accountType: [],
    businessCategory: [],
    reviewStatus: [],
    includeExpired: false,
  });

  const [selectedFields, setSelectedFields] = useState<string[]>(() => {
    return exportService.getAvailableFields()
      .filter(f => f.defaultSelected)
      .map(f => f.key);
  });

  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const availableFields = useMemo(() => exportService.getAvailableFields(), []);

  const getRecordsForExport = useCallback(() => {
    let records: any[];

    if (rangeType === 'all') {
      records = liabilityRecords;
    } else if (rangeType === 'filtered') {
      records = getFilteredRecords(storeFilters.includeExpired);
      if (localFilters.accountType && localFilters.accountType.length > 0) {
        records = records.filter(r => localFilters.accountType?.includes(r.accountType));
      }
      if (localFilters.businessCategory && localFilters.businessCategory.length > 0) {
        records = records.filter(r => localFilters.businessCategory?.includes(r.businessCategory));
      }
      if (localFilters.reviewStatus && localFilters.reviewStatus.length > 0) {
        records = records.filter(r => localFilters.reviewStatus?.includes(r.reviewStatus));
      }
      if (!localFilters.includeExpired) {
        records = records.filter(r => !r.isExpired);
      }
    } else {
      records = liabilityRecords;
      if (customDateFrom) {
        records = records.filter(r => r.createTime >= customDateFrom);
      }
      if (customDateTo) {
        records = records.filter(r => r.createTime <= customDateTo + ' 23:59:59');
      }
      if (localFilters.accountType && localFilters.accountType.length > 0) {
        records = records.filter(r => localFilters.accountType?.includes(r.accountType));
      }
      if (localFilters.businessCategory && localFilters.businessCategory.length > 0) {
        records = records.filter(r => localFilters.businessCategory?.includes(r.businessCategory));
      }
      if (localFilters.reviewStatus && localFilters.reviewStatus.length > 0) {
        records = records.filter(r => localFilters.reviewStatus?.includes(r.reviewStatus));
      }
      if (!localFilters.includeExpired) {
        records = records.filter(r => !r.isExpired);
      }
    }

    return records;
  }, [rangeType, liabilityRecords, getFilteredRecords, storeFilters, localFilters, customDateFrom, customDateTo]);

  const previewData = useMemo(() => {
    const records = getRecordsForExport();
    return records.slice(0, 10);
  }, [getRecordsForExport]);

  const exportHistory = useMemo(() => {
    return operationLogs
      .filter(log => log.operationType === '导出')
      .slice(0, 50);
  }, [operationLogs]);

  const handleMultiSelect = (key: keyof LiabilityFilters, value: string) => {
    setLocalFilters(prev => {
      const current = (prev[key] as string[] | undefined) || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return {
        ...prev,
        [key]: updated.length > 0 ? updated : undefined,
      };
    });
  };

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(f => f !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(availableFields.map(f => f.key));
  };

  const clearAllFields = () => {
    setSelectedFields([]);
  };

  const formatPreviewValue = (record: any, fieldKey: string) => {
    const fieldConfig = exportService.getFieldConfig(fieldKey);
    if (!fieldConfig) return '-';
    
    const value = record[fieldConfig.key];
    if (fieldConfig.format) {
      return fieldConfig.format(value, record);
    }
    return value ?? '-';
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      alert('请至少选择一个导出字段');
      return;
    }

    if (rangeType === 'custom' && (!customDateFrom || !customDateTo)) {
      alert('请选择自定义日期范围');
      return;
    }

    const config: ExportConfig = {
      fields: selectedFields,
      format,
      fileName,
      includeBadRecords: format === 'xlsx' ? includeBadRecords : false,
      filters: rangeType === 'filtered' ? { ...storeFilters, ...localFilters } : undefined,
    };

    try {
      setIsExporting(true);
      const resultFileName = await exportData(config);
      alert(`导出成功！文件名：${resultFileName}`);
    } catch (error) {
      alert('导出失败：' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-gray-900">
          数据导出中心
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          支持 Excel(.xlsx) 和 CSV 格式导出，可自定义字段、筛选条件和导出范围
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-8">
          {[
            { key: 'export', label: '导出配置', icon: Settings },
            { key: 'history', label: '导出历史', icon: History },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={cn(
                  'pb-4 px-1 text-sm font-medium transition-colors border-b-2 flex items-center gap-2',
                  activeTab === tab.key
                    ? 'border-[#1E3A5F] text-[#1E3A5F]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'export' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#1E3A5F]" />
                导出格式
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFormat('xlsx')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-center transition-all',
                    format === 'xlsx'
                      ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <FileSpreadsheet className={cn(
                    'w-8 h-8 mx-auto mb-2',
                    format === 'xlsx' ? 'text-[#1E3A5F]' : 'text-gray-400'
                  )} />
                  <p className={cn(
                    'font-medium',
                    format === 'xlsx' ? 'text-[#1E3A5F]' : 'text-gray-700'
                  )}>Excel(.xlsx)</p>
                  <p className="text-xs text-gray-500 mt-1">支持多Sheet</p>
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={cn(
                    'p-4 rounded-lg border-2 text-center transition-all',
                    format === 'csv'
                      ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <FileText className={cn(
                    'w-8 h-8 mx-auto mb-2',
                    format === 'csv' ? 'text-[#1E3A5F]' : 'text-gray-400'
                  )} />
                  <p className={cn(
                    'font-medium',
                    format === 'csv' ? 'text-[#1E3A5F]' : 'text-gray-700'
                  )}>CSV</p>
                  <p className="text-xs text-gray-500 mt-1">通用格式</p>
                </button>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1E3A5F]" />
                导出范围
              </h3>
              <div className="space-y-3">
                {exportRanges.map(range => (
                  <button
                    key={range.key}
                    onClick={() => setRangeType(range.key)}
                    className={cn(
                      'w-full p-4 rounded-lg border-2 text-left transition-all',
                      rangeType === range.key
                        ? 'border-[#1E3A5F] bg-[#1E3A5F]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <p className={cn(
                      'font-medium',
                      rangeType === range.key ? 'text-[#1E3A5F]' : 'text-gray-700'
                    )}>{range.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{range.description}</p>
                  </button>
                ))}
              </div>

              {rangeType === 'custom' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                  <div>
                    <label className="label">开始日期</label>
                    <input
                      type="date"
                      className="input"
                      value={customDateFrom}
                      onChange={(e) => setCustomDateFrom(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">结束日期</label>
                    <input
                      type="date"
                      className="input"
                      value={customDateTo}
                      onChange={(e) => setCustomDateTo(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#1E3A5F]" />
                其他选项
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">文件名</label>
                  <input
                    type="text"
                    className="input"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="输入文件名"
                  />
                </div>

                {format === 'xlsx' && (
                  <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeBadRecords}
                      onChange={(e) => setIncludeBadRecords(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-700">导出行记录到单独Sheet</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        共 {badRecords.length} 条坏行记录
                      </p>
                    </div>
                  </label>
                )}

                {format === 'csv' && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        CSV格式不支持多Sheet，坏行记录将不会被导出
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 mb-4">导出统计</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-[#1E3A5F]/5 rounded-lg">
                  <p className="text-2xl font-bold text-[#1E3A5F]">
                    {getRecordsForExport().length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">可导出记录数</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">
                    {selectedFields.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">已选字段数</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full btn btn-secondary gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? '隐藏预览' : '预览数据(前10条)'}
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || selectedFields.length === 0}
                  className="w-full btn btn-primary gap-2"
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isExporting ? '导出中...' : '开始导出'}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer border-b border-gray-100"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-[#1E3A5F]" />
                  <h3 className="font-semibold font-display text-gray-900">筛选条件</h3>
                </div>
                {filtersExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>

              {filtersExpanded && (
                <div className="p-6 space-y-6 animate-fade-in">
                  <div>
                    <label className="label mb-3">业务类型</label>
                    <div className="flex flex-wrap gap-2">
                      {businessCategories.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleMultiSelect('businessCategory', type)}
                          className={cn(
                            'filter-chip',
                            localFilters.businessCategory?.includes(type) && 'filter-chip-active'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label mb-3">复核状态</label>
                    <div className="flex flex-wrap gap-2">
                      {reviewStatuses.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleMultiSelect('reviewStatus', status)}
                          className={cn(
                            'filter-chip',
                            localFilters.reviewStatus?.includes(status) && 'filter-chip-active'
                          )}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label mb-3">账户类型</label>
                    <div className="flex flex-wrap gap-2">
                      {accountTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => handleMultiSelect('accountType', type)}
                          className={cn(
                            'filter-chip',
                            localFilters.accountType?.includes(type) && 'filter-chip-active'
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={localFilters.includeExpired || false}
                        onChange={(e) => setLocalFilters(prev => ({
                          ...prev,
                          includeExpired: e.target.checked
                        }))}
                        className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                      />
                      <span className="text-sm text-gray-700">包含过期里程记录</span>
                    </label>
                  </div>

                  {rangeType === 'filtered' && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700">
                        当前使用负债列表的筛选条件：
                        {storeFilters.memberNo && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">会员号: {storeFilters.memberNo}</span>}
                        {storeFilters.memberName && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">姓名: {storeFilters.memberName}</span>}
                        {storeFilters.minMiles !== undefined && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">最小里程: {storeFilters.minMiles}</span>}
                        {storeFilters.maxMiles !== undefined && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">最大里程: {storeFilters.maxMiles}</span>}
                        {storeFilters.minLiability !== undefined && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">最小负债: {storeFilters.minLiability}</span>}
                        {storeFilters.maxLiability !== undefined && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">最大负债: {storeFilters.maxLiability}</span>}
                        {storeFilters.expireDateFrom && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">过期从: {storeFilters.expireDateFrom}</span>}
                        {storeFilters.expireDateTo && <span className="ml-2 px-2 py-0.5 bg-white rounded text-xs">过期至: {storeFilters.expireDateTo}</span>}
                        {!storeFilters.memberNo && !storeFilters.memberName && 
                         storeFilters.minMiles === undefined && storeFilters.maxMiles === undefined &&
                         storeFilters.minLiability === undefined && storeFilters.maxLiability === undefined &&
                         !storeFilters.expireDateFrom && !storeFilters.expireDateTo &&
                         <span className="text-blue-500">无额外筛选条件</span>}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card">
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer border-b border-gray-100"
                onClick={() => setFieldsExpanded(!fieldsExpanded)}
              >
                <div className="flex items-center gap-3">
                  <FileJson className="w-5 h-5 text-[#1E3A5F]" />
                  <h3 className="font-semibold font-display text-gray-900">字段配置</h3>
                  <span className="px-2 py-0.5 bg-[#1E3A5F]/10 text-[#1E3A5F] text-xs rounded-full font-medium">
                    已选 {selectedFields.length}/{availableFields.length} 个字段
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); selectAllFields(); }}
                    className="text-xs text-[#1E3A5F] hover:underline"
                  >
                    全选
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); clearAllFields(); }}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    清空
                  </button>
                  {fieldsExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 ml-2" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
                  )}
                </div>
              </div>

              {fieldsExpanded && (
                <div className="p-6 animate-fade-in">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {availableFields.map((field) => (
                      <label
                        key={field.key}
                        className="flex items-center gap-2 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFields.includes(field.key)}
                          onChange={() => toggleField(field.key)}
                          className="w-4 h-4 rounded border-gray-300 text-[#1E3A5F] focus:ring-[#1E3A5F]"
                        />
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {showPreview && (
              <div className="card">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-[#1E3A5F]" />
                    <h3 className="font-semibold font-display text-gray-900">数据预览</h3>
                    <span className="text-xs text-gray-500">
                      显示前10条记录，共 {previewData.length} 条
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {selectedFields.slice(0, 6).map(fieldKey => {
                          const field = availableFields.find(f => f.key === fieldKey);
                          return (
                            <th key={fieldKey} className="table-header">
                              {field?.label}
                            </th>
                          );
                        })}
                        {selectedFields.length > 6 && (
                          <th className="table-header">更多...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.min(selectedFields.length, 6) + (selectedFields.length > 6 ? 1 : 0)}
                            className="table-cell text-center py-12 text-gray-500"
                          >
                            暂无预览数据
                          </td>
                        </tr>
                      ) : (
                        previewData.map((record, idx) => (
                          <tr key={record.id} className="table-row">
                            {selectedFields.slice(0, 6).map(fieldKey => (
                              <td key={fieldKey} className="table-cell">
                                {formatPreviewValue(record, fieldKey)}
                              </td>
                            ))}
                            {selectedFields.length > 6 && (
                              <td className="table-cell text-gray-400">...</td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
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
                  <th className="table-header">导出时间</th>
                  <th className="table-header">文件名</th>
                  <th className="table-header">操作人</th>
                  <th className="table-header text-center">记录数</th>
                  <th className="table-header">导出字段</th>
                  <th className="table-header">详情</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="table-cell text-center py-12 text-gray-500">
                      暂无导出记录
                    </td>
                  </tr>
                ) : (
                  exportHistory.map((log, idx) => (
                    <tr key={log.id} className="table-row animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="table-cell">{formatDateTime(log.createTime)}</td>
                      <td className="table-cell font-mono text-sm">{log.targetId}</td>
                      <td className="table-cell">{log.operator}</td>
                      <td className="table-cell text-center font-medium text-[#1E3A5F]">
                        {log.afterData?.recordCount || '-'}
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {log.afterData?.fields?.slice(0, 3).map((field: string, i: number) => {
                            const fieldInfo = availableFields.find(f => f.key === field);
                            return (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                {fieldInfo?.label || field}
                              </span>
                            );
                          })}
                          {log.afterData?.fields?.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                              +{log.afterData.fields.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-500">{log.detail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
