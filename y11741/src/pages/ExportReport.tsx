import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAmortizationStore } from "@/store/amortizationStore";
import {
  FileSpreadsheet,
  FileText,
  FileJson,
  Calendar,
  FolderKanban,
  Database,
  Check,
  Download,
  FileWarning,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ExportFormat = "excel" | "csv" | "pdf";
type ExportRange = "month" | "project" | "all";

const formatOptions: { key: ExportFormat; label: string; icon: typeof FileSpreadsheet }[] = [
  { key: "excel", label: "Excel", icon: FileSpreadsheet },
  { key: "csv", label: "CSV", icon: FileText },
  { key: "pdf", label: "PDF", icon: FileJson },
];

const months = [
  "2026-04", "2026-03", "2026-02", "2026-01", "2025-12", "2025-11",
];

export default function ExportReport() {
  const { amortizationRecords, projects, corrections, anomalies } = useAmortizationStore();
  const [format, setFormat] = useState<ExportFormat>("excel");
  const [range, setRange] = useState<ExportRange>("month");
  const [selectedMonth, setSelectedMonth] = useState("2026-04");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
  const [includeCorrections, setIncludeCorrections] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const toggleProject = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAllProjects = () => {
    if (selectedProjects.length === projects.length) {
      setSelectedProjects([]);
    } else {
      setSelectedProjects(projects.map((p) => p.id));
    }
  };

  const preview = useMemo(() => {
    let recordCount = 0;
    let fileSize = 0;

    let filteredRecords = amortizationRecords;

    if (range === "month") {
      filteredRecords = filteredRecords.filter((r) => r.period === selectedMonth);
    } else if (range === "project" && selectedProjects.length > 0) {
      filteredRecords = filteredRecords.filter((r) =>
        selectedProjects.includes(r.projectId)
      );
    }

    recordCount = filteredRecords.length;

    if (includeDetails) {
      recordCount += filteredRecords.length * 2;
    }

    if (includeAnomalies) {
      recordCount += anomalies.filter((a) => !a.resolved).length;
    }

    if (includeCorrections) {
      recordCount += corrections.length;
    }

    fileSize = recordCount * 0.5;

    const sizeText =
      fileSize > 1024
        ? `${(fileSize / 1024).toFixed(2)} MB`
        : `${fileSize.toFixed(0)} KB`;

    return { recordCount, fileSize: sizeText };
  }, [
    range,
    selectedMonth,
    selectedProjects,
    includeDetails,
    includeAnomalies,
    includeCorrections,
    amortizationRecords,
    anomalies,
    corrections,
  ]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportComplete(false);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const content = `导出报告\n格式: ${format}\n记录数: ${preview.recordCount}\n大小: ${preview.fileSize}\n\n导出时间: ${new Date().toLocaleString()}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `摊销报告_${new Date().toISOString().split("T")[0]}.${format === "excel" ? "xlsx" : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setExportComplete(true);
  };

  const canExport =
    (range !== "project" || selectedProjects.length > 0) && !isExporting;

  return (
    <PageContainer
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: "导出报告" },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">导出报告</h1>
          <p className="text-sm text-neutral-500 mt-1">
            导出摊销分析报告，支持多种格式和范围选择
          </p>
        </div>

        <Card title="选择格式" subtitle="选择导出文件的格式">
          <div className="flex gap-2">
            {formatOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = format === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => setFormat(option.key)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all duration-200",
                    isSelected
                      ? "border-primary-500 bg-primary-50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <Icon
                    size={20}
                    className={cn(
                      isSelected ? "text-primary-600" : "text-neutral-500"
                    )}
                  />
                  <span
                    className={cn(
                      "font-medium",
                      isSelected ? "text-primary-700" : "text-neutral-700"
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="选择范围" subtitle="选择要导出的数据范围">
          <div className="space-y-4">
            <div className="flex gap-2">
              {[
                { key: "month", label: "按月导出", icon: Calendar },
                { key: "project", label: "按项目导出", icon: FolderKanban },
                { key: "all", label: "全量导出", icon: Database },
              ].map((option) => {
                const Icon = option.icon;
                const isSelected = range === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => setRange(option.key as ExportRange)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200",
                      isSelected
                        ? "border-primary-500 bg-primary-50"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn(
                        isSelected ? "text-primary-600" : "text-neutral-500"
                      )}
                    />
                    <span
                      className={cn(
                        "text-sm font-medium",
                        isSelected ? "text-primary-700" : "text-neutral-700"
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {range === "month" && (
              <div className="relative">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  选择月份
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors"
                  >
                    <span className="text-neutral-900">{selectedMonth}</span>
                    <ChevronDown size={16} className="text-neutral-400" />
                  </button>
                  {showMonthDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-10">
                      {months.map((month) => (
                        <button
                          key={month}
                          onClick={() => {
                            setSelectedMonth(month);
                            setShowMonthDropdown(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors first:rounded-t-lg last:rounded-b-lg",
                            selectedMonth === month
                              ? "bg-primary-50 text-primary-700"
                              : "text-neutral-700"
                          )}
                        >
                          {month}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {range === "project" && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-neutral-700">
                    选择项目
                  </label>
                  <button
                    onClick={selectAllProjects}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {selectedProjects.length === projects.length
                      ? "取消全选"
                      : "全选"}
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {projects.map((project) => {
                    const isSelected = selectedProjects.includes(project.id);
                    return (
                      <div
                        key={project.id}
                        onClick={() => toggleProject(project.id)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                          isSelected
                            ? "border-primary-500 bg-primary-50"
                            : "border-neutral-200 hover:border-neutral-300 bg-white"
                        )}
                      >
                        <div
                          className={cn(
                            "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                            isSelected
                              ? "border-primary-500 bg-primary-500"
                              : "border-neutral-300"
                          )}
                        >
                          {isSelected && (
                            <Check size={14} className="text-white" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {project.name}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
                            {project.code}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {range === "all" && (
              <div className="bg-neutral-50 rounded-lg p-4">
                <p className="text-sm text-neutral-600">
                  将导出所有历史数据，包括所有项目和所有月份的摊销记录
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title="内容选项" subtitle="选择要包含在报告中的内容">
          <div className="space-y-3">
            {[
              {
                key: "details",
                label: "包含明细",
                description: "导出每条摊销记录的详细信息",
                icon: FileText,
                checked: includeDetails,
                onChange: setIncludeDetails,
              },
              {
                key: "anomalies",
                label: "包含异常",
                description: "导出检测到的异常记录和处理状态",
                icon: FileWarning,
                checked: includeAnomalies,
                onChange: setIncludeAnomalies,
              },
              {
                key: "corrections",
                label: "包含修正历史",
                description: "导出所有人工修正操作的历史记录",
                icon: Clock,
                checked: includeCorrections,
                onChange: setIncludeCorrections,
              },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.key}
                  onClick={() => option.onChange(!option.checked)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200",
                    option.checked
                      ? "border-primary-200 bg-primary-50/50"
                      : "border-neutral-200 hover:border-neutral-300 bg-white"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                      option.checked
                        ? "border-primary-500 bg-primary-500"
                        : "border-neutral-300"
                    )}
                  >
                    {option.checked && <Check size={14} className="text-white" />}
                  </div>
                  <Icon
                    size={18}
                    className={cn(
                      "flex-shrink-0",
                      option.checked ? "text-primary-600" : "text-neutral-400"
                    )}
                  />
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        option.checked ? "text-primary-700" : "text-neutral-700"
                      )}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {option.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="导出预览" subtitle="预估导出内容">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-50 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">预估记录数</p>
              <p className="text-2xl font-semibold text-neutral-900">
                {preview.recordCount} 条
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">预估文件大小</p>
              <p className="text-2xl font-semibold text-neutral-900">
                {preview.fileSize}
              </p>
            </div>
          </div>
        </Card>

        {exportComplete && (
          <Card>
            <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-emerald-700">导出成功</p>
                <p className="text-sm text-emerald-600">
                  报告已生成并开始下载，共 {preview.recordCount} 条记录
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => setExportComplete(false)}
            disabled={isExporting}
          >
            重置
          </Button>
          <Button
            onClick={handleExport}
            disabled={!canExport}
            loading={isExporting}
          >
            <Download size={16} />
            {isExporting ? "导出中..." : "导出报告"}
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
