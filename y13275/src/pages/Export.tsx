import { useState, useEffect } from 'react';
import {
  FileDown,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  MapPin,
  Clock,
  Check,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirePointStore } from '@/store/useFirePointStore';
import { getStatusText, formatDateTime, getDataSourceTypeText } from '@/utils/format';
import Button from '@/components/Button';
import StatusBadge from '@/components/StatusBadge';
import * as XLSX from 'xlsx';

type ExportFormat = 'xlsx' | 'csv';

interface ExportField {
  key: string;
  label: string;
  checked: boolean;
}

export default function ExportPage() {
  const { points, dataSources, changeHistory, lastSavedTime, syncStatus, resetAllData } =
    useFirePointStore();

  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
  const [includeFields, setIncludeFields] = useState<ExportField[]>([
    { key: 'id', label: '点位编号', checked: true },
    { key: 'name', label: '点位名称', checked: true },
    { key: 'address', label: '地址', checked: true },
    { key: 'status', label: '状态', checked: true },
    { key: 'remark', label: '归并备注', checked: true },
    { key: 'originalFeedback', label: '原始反馈', checked: true },
    { key: 'mergedFeedback', label: '归并结论', checked: true },
    { key: 'dataSources', label: '数据来源', checked: true },
    { key: 'changeHistory', label: '变更历史', checked: false },
    { key: 'createdAt', label: '创建时间', checked: true },
    { key: 'updatedAt', label: '更新时间', checked: true },
  ]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<'success' | 'warning' | 'error' | null>(null);
  const [validationDetails, setValidationDetails] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const togglePoint = (id: string) => {
    setSelectedPointIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllPoints = () => {
    if (selectedPointIds.size === points.length) {
      setSelectedPointIds(new Set());
    } else {
      setSelectedPointIds(new Set(points.map((p) => p.id)));
    }
  };

  const toggleField = (key: string) => {
    setIncludeFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, checked: !f.checked } : f))
    );
  };

  useEffect(() => {
    if (selectedPointIds.size === 0 && points.length > 0) {
      setSelectedPointIds(new Set(points.map((p) => p.id)));
    }
  }, [points]);

  const validateSync = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setValidationDetails([]);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const warnings: string[] = [];
    const errors: string[] = [];

    const selectedPoints = points.filter((p) => selectedPointIds.has(p.id));
    selectedPoints.forEach((point) => {
      if (!point.remark && point.status !== 'pending') {
        warnings.push(`${point.id} (${point.name})：归并备注为空`);
      }
      if (point.status === 'abnormal') {
        warnings.push(`${point.id} (${point.name})：存在异常记录`);
      }
    });

    const unconfirmedChanges = changeHistory.filter(
      (r) => selectedPointIds.has(r.pointId) && !r.confirmed
    );
    if (unconfirmedChanges.length > 0) {
      warnings.push(`存在 ${unconfirmedChanges.length} 条未确认的变更记录`);
    }

    if (syncStatus === 'error') {
      errors.push('数据同步状态异常，请检查网络连接');
    }

    setValidationDetails([...errors, ...warnings]);

    if (errors.length > 0) {
      setValidationResult('error');
    } else if (warnings.length > 0) {
      setValidationResult('warning');
    } else {
      setValidationResult('success');
    }

    setIsValidating(false);
  };

  const generateExportData = () => {
    const selectedPoints = points.filter((p) => selectedPointIds.has(p.id));
    const checkedFields = includeFields.filter((f) => f.checked);

    return selectedPoints.map((point) => {
      const row: any = {};
      checkedFields.forEach((field) => {
        switch (field.key) {
          case 'status':
            row[field.label] = getStatusText(point.status);
            break;
          case 'dataSources':
            const pointSources = dataSources.filter(
              (s) => s.pointId === point.id && !s.isAbnormal
            );
            row[field.label] = pointSources
              .map((s) => `[${getDataSourceTypeText(s.type)}] ${s.title}`)
              .join('; ');
            break;
          case 'changeHistory':
            const pointHistory = changeHistory.filter((h) => h.pointId === point.id);
            row[field.label] = pointHistory
              .map(
                (h) =>
                  `${formatDateTime(h.operatedAt)} - ${h.operator} 修改了${
                    h.field === 'remark' ? '备注' : h.field === 'status' ? '状态' : '结论'
                  }: ${h.newValue}`
              )
              .join('\n');
            break;
          case 'createdAt':
          case 'updatedAt':
            row[field.label] = formatDateTime(point[field.key]);
            break;
          default:
            row[field.label] = point[field.key as keyof typeof point];
        }
      });
      return row;
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    for (let i = 0; i <= 100; i += 10) {
      setExportProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const exportData = generateExportData();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    ws['!cols'] = includeFields
      .filter((f) => f.checked)
      .map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(wb, ws, '消防点位归并');

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `老街消防点位归并_${timestamp}.${format}`;

    if (format === 'xlsx') {
      XLSX.writeFile(wb, fileName);
    } else {
      XLSX.writeFile(wb, fileName, { bookType: 'csv' });
    }

    setIsExporting(false);
  };

  const selectedCount = selectedPointIds.size;
  const totalRows = selectedCount;
  const totalFields = includeFields.filter((f) => f.checked).length;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 opacity-0 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
              <FileDown className="w-5 h-5 text-accent-700" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-text-primary">
                数据导出
              </h1>
              <p className="text-text-muted text-sm">
                导出归并数据，前端备注与后端数据自动同步
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-surface rounded-lg border border-primary-100 shadow-card p-5 opacity-0 animate-fade-in animation-delay-100" style={{ animationFillMode: 'forwards' }}>
              <h2 className="font-display text-lg font-bold text-text-primary mb-4">
                选择导出格式
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setFormat('xlsx')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    format === 'xlsx'
                      ? 'border-primary-500 bg-primary-50 shadow-card'
                      : 'border-primary-100 hover:border-primary-300 hover:bg-surface-secondary'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">Excel (.xlsx)</div>
                      <div className="text-xs text-text-muted">推荐格式，保留样式</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setFormat('csv')}
                  className={cn(
                    'p-4 rounded-lg border-2 transition-all text-left',
                    format === 'csv'
                      ? 'border-primary-500 bg-primary-50 shadow-card'
                      : 'border-primary-100 hover:border-primary-300 hover:bg-surface-secondary'
                  )}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-text-primary">CSV (.csv)</div>
                      <div className="text-xs text-text-muted">通用格式，兼容性好</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-surface rounded-lg border border-primary-100 shadow-card p-5 opacity-0 animate-fade-in animation-delay-200" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-text-primary">
                  选择导出字段
                </h2>
                <span className="text-sm text-text-muted">
                  已选 <span className="font-mono font-semibold text-primary-700">{totalFields}</span> 个字段
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {includeFields.map((field) => (
                  <label
                    key={field.key}
                    className="flex items-center gap-3 p-3 rounded-lg border border-primary-100 hover:bg-surface-secondary cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={field.checked}
                      onChange={() => toggleField(field.key)}
                      className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-400"
                    />
                    <span className="text-sm text-text-primary">{field.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-surface rounded-lg border border-primary-100 shadow-card p-5 opacity-0 animate-fade-in animation-delay-300" style={{ animationFillMode: 'forwards' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-text-primary">
                  选择导出点位
                </h2>
                <button
                  onClick={toggleAllPoints}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  {selectedPointIds.size === points.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {points.map((point, index) => (
                  <label
                    key={point.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                      selectedPointIds.has(point.id)
                        ? 'border-primary-300 bg-primary-50'
                        : 'border-primary-100 hover:bg-surface-secondary'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedPointIds.has(point.id)}
                      onChange={() => togglePoint(point.id)}
                      className="w-4 h-4 rounded border-primary-300 text-primary-600 focus:ring-primary-400"
                    />
                    <MapPin className="w-4 h-4 text-primary-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary-600">
                          {point.id}
                        </span>
                        <span className="text-sm font-medium text-text-primary">
                          {point.name}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted">{point.address}</div>
                    </div>
                    <StatusBadge status={point.status} />
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-surface rounded-lg border border-primary-100 shadow-card p-5 opacity-0 animate-fade-in animation-delay-200" style={{ animationFillMode: 'forwards' }}>
              <h2 className="font-display text-lg font-bold text-text-primary mb-4">
                同步校验
              </h2>

              <div className="mb-4 p-3 bg-surface-secondary rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-text-muted">同步状态</span>
                  <span
                    className={cn(
                      'font-medium',
                      syncStatus === 'error' ? 'text-danger' : 'text-success'
                    )}
                  >
                    {syncStatus === 'error' ? '异常' : '正常'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    最后同步
                  </span>
                  <span className="font-mono text-text-secondary text-xs">
                    {lastSavedTime ? formatDateTime(lastSavedTime) : '无'}
                  </span>
                </div>
              </div>

              {validationResult && (
                <div
                  className={cn(
                    'mb-4 p-4 rounded-lg border-2',
                    validationResult === 'success' && 'bg-green-50 border-green-200',
                    validationResult === 'warning' && 'bg-yellow-50 border-yellow-200',
                    validationResult === 'error' && 'bg-red-50 border-red-200'
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {validationResult === 'success' && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                    {validationResult === 'warning' && (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    {validationResult === 'error' && (
                      <X className="w-5 h-5 text-red-600" />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        validationResult === 'success' && 'text-green-700',
                        validationResult === 'warning' && 'text-yellow-700',
                        validationResult === 'error' && 'text-red-700'
                      )}
                    >
                      {validationResult === 'success' && '数据一致'}
                      {validationResult === 'warning' && '存在警告'}
                      {validationResult === 'error' && '存在错误'}
                    </span>
                  </div>
                  {validationDetails.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {validationDetails.map((detail, i) => (
                        <li key={i} className="text-text-secondary pl-4">
                          • {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <Button
                variant="secondary"
                className="w-full"
                leftIcon={
                  isValidating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )
                }
                onClick={validateSync}
                disabled={isValidating}
              >
                {isValidating ? '校验中...' : '校验数据同步'}
              </Button>
            </div>

            <div className="bg-surface rounded-lg border border-primary-100 shadow-card p-5 opacity-0 animate-fade-in animation-delay-300" style={{ animationFillMode: 'forwards' }}>
              <h2 className="font-display text-lg font-bold text-text-primary mb-4">
                导出预览
              </h2>
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">导出点数</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {selectedCount} / {points.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">导出字段</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {totalFields}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">数据行数</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {totalRows}
                  </span>
                </div>
              </div>

              {isExporting && (
                <div className="mb-4">
                  <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                  <div className="text-center text-xs text-text-muted mt-2">
                    导出中... {exportProgress}%
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                leftIcon={<FileDown className="w-5 h-5" />}
                onClick={handleExport}
                disabled={selectedCount === 0 || isExporting}
              >
                {isExporting ? '正在导出...' : '导出数据'}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-text-muted"
                onClick={resetAllData}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                重置所有数据
              </Button>
            </div>

            <div className="p-4 bg-primary-50 rounded-lg border border-primary-100 opacity-0 animate-fade-in animation-delay-400" style={{ animationFillMode: 'forwards' }}>
              <h3 className="font-medium text-primary-800 text-sm mb-2">
                💡 操作提示
              </h3>
              <ul className="text-xs text-primary-700 space-y-1.5">
                <li>• 导出数据自动包含最新的前端备注</li>
                <li>• 异常记录不会混入正常导出结果</li>
                <li>• 建议先执行同步校验再导出</li>
                <li>• 导出文件可用于次日复盘会议</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
