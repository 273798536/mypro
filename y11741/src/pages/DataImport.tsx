import { useState, useCallback } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAmortizationStore } from "@/store/amortizationStore";
import {
  Cloud,
  Tags,
  Server,
  Network,
  FolderKanban,
  Upload,
  FileSpreadsheet,
  X,
  Check,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SourceType = "bill" | "tag" | "reservation" | "gateway" | "project";
type ConflictStrategy = "ignore" | "overwrite" | "append";

interface SourceOption {
  key: SourceType;
  label: string;
  description: string;
  icon: typeof Cloud;
  color: string;
}

const sourceOptions: SourceOption[] = [
  {
    key: "bill",
    label: "云账单",
    description: "导入阿里云、AWS等云服务商账单数据",
    icon: Cloud,
    color: "text-blue-500",
  },
  {
    key: "tag",
    label: "资源标签",
    description: "导入资源标签配置，用于成本归集",
    icon: Tags,
    color: "text-emerald-500",
  },
  {
    key: "reservation",
    label: "预留实例",
    description: "导入预留实例购买和使用记录",
    icon: Server,
    color: "text-amber-500",
  },
  {
    key: "gateway",
    label: "共享网关",
    description: "导入共享网关使用和分摊数据",
    icon: Network,
    color: "text-purple-500",
  },
  {
    key: "project",
    label: "项目清单",
    description: "导入项目基础信息和归属关系",
    icon: FolderKanban,
    color: "text-rose-500",
  },
];

interface ConflictOption {
  key: ConflictStrategy;
  label: string;
  description: string;
  icon: typeof Check;
}

const conflictOptions: ConflictOption[] = [
  {
    key: "ignore",
    label: "忽略冲突",
    description: "跳过已存在的记录，保留原有数据",
    icon: X,
  },
  {
    key: "overwrite",
    label: "覆盖原有",
    description: "用新数据替换已存在的记录",
    icon: Check,
  },
  {
    key: "append",
    label: "追加模式",
    description: "保留原有数据，追加新记录",
    icon: FileText,
  },
];

export default function DataImport() {
  const { addImportLog } = useAmortizationStore();
  const [selectedSource, setSelectedSource] = useState<SourceType | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [conflictStrategy, setConflictStrategy] = useState<ConflictStrategy>("ignore");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<{
    recordCount: number;
    errorCount: number;
    sampleData: Record<string, unknown>[];
  } | null>(null);
  const [importComplete, setImportComplete] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setImportComplete(false);
    const recordCount = Math.floor(Math.random() * 100) + 50;
    const errorCount = Math.floor(Math.random() * 5);
    setPreviewData({
      recordCount,
      errorCount,
      sampleData: [
        { id: "1", name: "示例数据1", amount: 1000 },
        { id: "2", name: "示例数据2", amount: 2000 },
        { id: "3", name: "示例数据3", amount: 1500 },
      ],
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setImportComplete(false);
  };

  const handleImport = async () => {
    if (!selectedSource || !selectedFile || !previewData) return;

    setIsImporting(true);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    addImportLog({
      type: selectedSource as "bill" | "reservation" | "gateway",
      fileName: selectedFile.name,
      recordCount: previewData.recordCount,
      successCount: previewData.recordCount - previewData.errorCount,
      errorCount: previewData.errorCount,
      operator: "当前用户",
      status:
        previewData.errorCount === 0
          ? "success"
          : previewData.errorCount < previewData.recordCount
          ? "partial"
          : "failed",
    });

    setIsImporting(false);
    setImportComplete(true);
  };

  const canImport = selectedSource && selectedFile && previewData && !isImporting;

  return (
    <PageContainer
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: "数据导入" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">数据导入</h1>
          <p className="text-sm text-neutral-500 mt-1">
            导入各类数据源，支持云账单、资源标签、预留实例等
          </p>
        </div>

        <Card title="选择数据源" subtitle="选择要导入的数据类型">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {sourceOptions.map((source) => {
              const Icon = source.icon;
              const isSelected = selectedSource === source.key;
              return (
                <div
                  key={source.key}
                  onClick={() => setSelectedSource(source.key)}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    isSelected
                      ? "border-primary-500 bg-primary-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                      isSelected ? "bg-primary-100" : "bg-neutral-100"
                    )}
                  >
                    <Icon
                      size={20}
                      className={cn(isSelected ? "text-primary-600" : source.color)}
                    />
                  </div>
                  <h3 className="font-medium text-neutral-900 text-sm">
                    {source.label}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {source.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="上传文件" subtitle="支持 Excel (.xlsx, .xls) 和 CSV 格式">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
              isDragging
                ? "border-primary-500 bg-primary-50"
                : selectedFile
                ? "border-neutral-300 bg-neutral-50"
                : "border-neutral-300 hover:border-primary-400 hover:bg-neutral-50"
            )}
          >
            {!selectedFile ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                  <Upload size={32} className="text-neutral-400" />
                </div>
                <p className="text-neutral-700 font-medium mb-1">
                  拖拽文件到此处，或
                </p>
                <label className="text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
                  点击选择文件
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                </label>
                <p className="text-xs text-neutral-500 mt-2">
                  支持 .xlsx, .xls, .csv 格式，最大 50MB
                </p>
              </>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <FileSpreadsheet size={24} className="text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-neutral-900">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  disabled={isImporting}
                >
                  <X size={16} />
                  移除
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card
          title="冲突处理策略"
          subtitle="当导入数据与现有数据冲突时的处理方式"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {conflictOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = conflictStrategy === option.key;
              return (
                <div
                  key={option.key}
                  onClick={() => setConflictStrategy(option.key)}
                  className={cn(
                    "p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                    isSelected
                      ? "border-primary-500 bg-primary-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
                      isSelected ? "bg-primary-100" : "bg-neutral-100"
                    )}
                  >
                    <Icon
                      size={20}
                      className={cn(
                        isSelected ? "text-primary-600" : "text-neutral-500"
                      )}
                    />
                  </div>
                  <h3 className="font-medium text-neutral-900 text-sm">
                    {option.label}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {option.description}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {previewData && !importComplete && (
          <Card title="导入预览" subtitle="数据解析结果预览">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-neutral-50 rounded-lg p-4">
                <p className="text-sm text-neutral-500 mb-1">总记录数</p>
                <p className="text-2xl font-semibold text-neutral-900">
                  {previewData.recordCount}
                </p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4">
                <p className="text-sm text-emerald-600 mb-1">有效记录</p>
                <p className="text-2xl font-semibold text-emerald-700">
                  {previewData.recordCount - previewData.errorCount}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-lg p-4",
                  previewData.errorCount > 0 ? "bg-rose-50" : "bg-neutral-50"
                )}
              >
                <p
                  className={cn(
                    "text-sm mb-1",
                    previewData.errorCount > 0 ? "text-rose-600" : "text-neutral-500"
                  )}
                >
                  异常记录
                </p>
                <p
                  className={cn(
                    "text-2xl font-semibold",
                    previewData.errorCount > 0
                      ? "text-rose-700"
                      : "text-neutral-900"
                  )}
                >
                  {previewData.errorCount}
                </p>
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4">
              <p className="text-sm font-medium text-neutral-700 mb-2">数据示例</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200">
                      {Object.keys(previewData.sampleData[0]).map((key) => (
                        <th
                          key={key}
                          className="text-left py-2 px-3 text-neutral-500 font-medium"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.sampleData.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b border-neutral-100 last:border-0"
                      >
                        {Object.values(row).map((value, i) => (
                          <td key={i} className="py-2 px-3 text-neutral-700">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}

        {importComplete && (
          <Card>
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-700">导入成功</p>
                <p className="text-sm text-emerald-600">
                  数据已成功导入，共 {previewData?.recordCount} 条记录
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={clearFile} disabled={isImporting}>
            重置
          </Button>
          <Button
            onClick={handleImport}
            disabled={!canImport}
            loading={isImporting}
          >
            {isImporting ? "导入中..." : "确认导入"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
