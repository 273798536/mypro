import { useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAmortizationStore } from "@/store/amortizationStore";
import {
  Clock,
  FileText,
  Edit3,
  AlertTriangle,
  Download,
  Filter,
  User,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type OperationType = "all" | "import" | "correction" | "anomaly" | "export";

interface HistoryRecord {
  id: string;
  type: OperationType;
  time: string;
  operator: string;
  description: string;
}

export default function History() {
  const { corrections, importLogs } = useAmortizationStore();
  const [activeFilter, setActiveFilter] = useState<OperationType>("all");

  const records = useMemo<HistoryRecord[]>(() => {
    const allRecords: HistoryRecord[] = [];

    importLogs.forEach((log) => {
      allRecords.push({
        id: log.id,
        type: "import",
        time: log.createdAt,
        operator: log.operator,
        description: `导入文件 ${log.fileName}，共 ${log.recordCount} 条记录，成功 ${log.successCount} 条，失败 ${log.errorCount} 条`,
      });
    });

    corrections.forEach((correction) => {
      allRecords.push({
        id: correction.id,
        type: "correction",
        time: correction.createdAt,
        operator: correction.operator,
        description: `${correction.reason} - ${correction.changeSummary}`,
      });
    });

    allRecords.push({
      id: "export-001",
      type: "export",
      time: "2026-04-15T10:30:00Z",
      operator: "张伟",
      description: "导出 2026年3月 摊销报告，包含明细数据",
    });

    allRecords.push({
      id: "anomaly-001",
      type: "anomaly",
      time: "2026-03-15T14:20:00Z",
      operator: "系统",
      description: "检测到异常：电商平台 3月成本较上月增长 25%",
    });

    allRecords.push({
      id: "export-002",
      type: "export",
      time: "2026-03-15T09:15:00Z",
      operator: "李娜",
      description: "导出 2026年2月 项目成本分析报告",
    });

    return allRecords.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );
  }, [corrections, importLogs]);

  const filteredRecords = useMemo(() => {
    if (activeFilter === "all") return records;
    return records.filter((r) => r.type === activeFilter);
  }, [records, activeFilter]);

  const typeConfig = {
    import: {
      label: "数据导入",
      icon: FileText,
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    correction: {
      label: "摊销修正",
      icon: Edit3,
      color: "bg-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
    anomaly: {
      label: "异常处理",
      icon: AlertTriangle,
      color: "bg-rose-500",
      textColor: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
    },
    export: {
      label: "报告导出",
      icon: Download,
      color: "bg-emerald-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
    },
  };

  const filters: { key: OperationType; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "import", label: "数据导入" },
    { key: "correction", label: "摊销修正" },
    { key: "anomaly", label: "异常处理" },
    { key: "export", label: "报告导出" },
  ];

  return (
    <PageContainer
      breadcrumbs={[
        { label: "首页", href: "/" },
        { label: "历史记录" },
      ]}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">
              历史记录
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              查看所有操作记录，包括数据导入、修正、异常处理和报告导出
            </p>
          </div>
        </div>

        <Card>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-neutral-400" />
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter.key}
                  variant={activeFilter === filter.key ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter(filter.key)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200" />

            <div className="space-y-8">
              {filteredRecords.map((record) => {
                const config = typeConfig[record.type as keyof typeof typeConfig];
                if (!config) return null;
                const Icon = config.icon;

                return (
                  <div key={record.id} className="relative pl-16">
                    <div
                      className={cn(
                        "absolute left-4 w-5 h-5 rounded-full border-4 border-white shadow-md flex items-center justify-center",
                        config.color
                      )}
                      style={{ top: "2px" }}
                    />

                    <div
                      className={cn(
                        "rounded-lg border p-4",
                        config.bgColor,
                        config.borderColor
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                                config.textColor,
                                config.bgColor
                              )}
                            >
                              <Icon size={12} />
                              {config.label}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-700">
                            {record.description}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {record.operator}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {format(
                                new Date(record.time),
                                "yyyy-MM-dd HH:mm:ss"
                              )}
                            </span>
                          </div>
                        </div>
                        <Clock size={16} className="text-neutral-400 flex-shrink-0" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredRecords.length === 0 && (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-neutral-300 mb-3" />
                <p className="text-neutral-500">暂无相关记录</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
