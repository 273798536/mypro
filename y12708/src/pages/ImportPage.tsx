import { useState, useCallback, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { cleanRecords, type CleanedRecord } from "@/services/calculationEngine";
import { useAppStore } from "@/store/appStore";
import { ProblemBadge, StatusBadge } from "@/components/ui/Badges";
import Alert from "@/components/ui/Alert";
import {
  Upload,
  FileSpreadsheet,
  FileCheck,
  CheckCircle2,
  Database,
  Eye,
  Trash2,
  ArrowRight,
  Sparkles,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import type { ProblemType } from "@/types";

const demoRawData: Record<string, unknown>[] = [
  { questionId: "Q202401-001", name: "鸡胸肉", quantity: 200, unit: "g", category: "肉类", protein: 23.1, fat: 3.6, carbohydrate: 0, calories: 133, rawNote: "去皮，新鲜" },
  { questionId: "Q202401-002", name: "西兰花", quantity: 150, unit: "", category: "蔬菜", protein: 4.1, fat: 0.6, carbohydrate: 4.3, calories: 36, rawNote: "水煮" },
  { questionId: "Q202401-003", name: "糙米饭", quantity: "", unit: "碗", category: "主食", protein: 2.6, fat: 0.3, carbohydrate: 23, calories: 111, rawNote: "" },
  { questionId: "Q202401-004", name: "鸡胸肉", quantity: 200, unit: "g", category: "肉类", protein: 23.1, fat: 3.6, carbohydrate: 0, calories: 133, rawNote: "重复导入测试" },
  { questionId: "Q202401-005", name: "橄榄油", quantity: 15, unit: "ml", category: "油脂", protein: 0, fat: 100, carbohydrate: 0, calories: 899, rawNote: "15ml 约13.6g 约122kcal 凉拌用" },
  { questionId: "Q202401-006", name: "鸡蛋", quantity: 2, unit: "个", category: "蛋类", protein: 13.3, fat: 8.8, carbohydrate: 2.8, calories: 144, rawNote: "水煮蛋" },
];

export default function ImportPage() {
  const [fileName, setFileName] = useState<string>("");
  const [cleanedData, setCleanedData] = useState<CleanedRecord[] | null>(null);
  const [batchName, setBatchName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [imported, setImported] = useState(false);

  const importRecords = useAppStore((s) => s.importRecords);
  const batches = useAppStore((s) => s.batches);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    if (!cleanedData) return null;
    const total = cleanedData.length;
    const problemCounts: Record<ProblemType | "clean", number> = {
      clean: 0,
      unit_missing: 0,
      empty_value: 0,
      duplicate: 0,
      note_mixed: 0,
      none: 0,
    };
    cleanedData.forEach((c) => {
      if (c.record.problems?.length === 0) problemCounts.clean++;
      c.record.problems?.forEach((p) => {
        problemCounts[p]++;
      });
    });
    return { total, ...problemCounts };
  }, [cleanedData]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setBatchName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
      setCleanedData(cleanRecords(demoRawData));
    }
  }, []);

  const handleDemoLoad = () => {
    setFileName("demo_meal_planning_202401.xlsx");
    setBatchName("2024年1月演示批次");
    setCleanedData(cleanRecords(demoRawData));
  };

  const handleImport = () => {
    if (!cleanedData || !batchName.trim()) return;
    const records = cleanedData.map((c) => ({
      ...c.record,
      nutrition: {
        protein: (c.record as unknown as Record<string, number>).protein,
        fat: (c.record as unknown as Record<string, number>).fat,
        carbohydrate: (c.record as unknown as Record<string, number>).carbohydrate,
        calories: (c.record as unknown as Record<string, number>).calories,
      },
    }));
    const result = importRecords(records, batchName, fileName);
    setImported(true);
    setTimeout(() => {
      if (result.conflicts.length > 0) {
        navigate("/versions");
      } else {
        navigate("/correction");
      }
    }, 1500);
  };

  const handleReset = () => {
    setFileName("");
    setCleanedData(null);
    setBatchName("");
    setImported(false);
  };

  const getCellClass = (row: CleanedRecord, field: string) => {
    const issue = row.issues.find((i) => i.field === field);
    if (!issue) return "";
    if (issue.type === "empty_value") return "bg-danger-50 dark:bg-danger-900/20 text-danger-700 dark:text-danger-300";
    if (issue.type === "unit_missing") return "bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-300";
    if (issue.type === "duplicate") return "bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300";
    if (issue.type === "note_mixed") return "bg-info-50 dark:bg-info-900/20 text-info-700 dark:text-info-300";
    return "";
  };

  return (
    <AppLayout
      title="数据导入"
      subtitle="题目清单导入 · 自动检测空值、重复、备注混写、单位缺失"
      actions={
        cleanedData && !imported && (
          <>
            <button onClick={handleReset} className="btn-secondary">
              <Trash2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              清除
            </button>
            <button
              onClick={handleImport}
              disabled={!batchName.trim()}
              className="btn-primary"
            >
              <Database className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              确认导入
            </button>
          </>
        )
      }
    >
      <div className="space-y-6">
        {imported ? (
          <div className="card p-10 text-center animate-fade-in">
            <CheckCircle2 className="w-16 h-16 text-success-500 mx-auto mb-4" strokeWidth={1.5} />
            <h3 className="text-xl font-serif-sc font-semibold text-slate-800 dark:text-slate-100 mb-2">
              导入成功
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              批次 "{batchName}" 已入库，正在跳转到下一步...
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <ArrowRight className="w-4 h-4 text-primary-500 animate-pulse" strokeWidth={1.5} />
            </div>
          </div>
        ) : !cleanedData ? (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={cn(
                "card p-12 text-center border-2 border-dashed transition-all cursor-pointer",
                isDragging
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-slate-300 dark:border-slate-600 hover:border-primary-400"
              )}
            >
              <Upload className="w-14 h-14 text-slate-400 mx-auto mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-serif-sc font-semibold text-slate-800 dark:text-slate-100 mb-2">
                上传题目清单
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                支持 .xlsx、.xls、.csv 格式，拖拽文件到此处或点击选择
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={handleDemoLoad}
                  className="btn-accent"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  加载演示数据
                </button>
                <button
                  onClick={handleDemoLoad}
                  className="btn-secondary"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  选择文件
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-6">
                建议包含字段：题目编号、食材名称、数量、单位、分类、营养成分、备注
              </p>
            </div>

            {batches.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <FileCheck className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
                  <h3 className="section-title">历史导入批次</h3>
                </div>
                <div className="space-y-2">
                  {batches.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div>
                        <p className="font-medium text-slate-700 dark:text-slate-200">{b.name}</p>
                        <p className="text-xs text-slate-400">
                          {b.fileName} · {new Date(b.importedAt).toLocaleString()} · 导入人：{b.importedBy}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{b.totalRecords} 条</p>
                          <p className="text-xs text-slate-400">
                            <span className="text-success-600">{b.cleanRecords} 干净</span>
                            {" / "}
                            <span className="text-warning-600">{b.problemRecords} 待处理</span>
                          </p>
                        </div>
                        <button onClick={() => navigate("/review")} className="btn-ghost text-sm">
                          <Eye className="w-4 h-4 mr-1" strokeWidth={1.5} />
                          查看
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="card p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">批次名称</p>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="mt-1 w-full text-lg font-semibold text-slate-800 dark:text-slate-100 bg-transparent border-b border-slate-200 dark:border-slate-700 focus:outline-none focus:border-primary-500"
                />
                <p className="text-xs text-slate-400 mt-2">{fileName}</p>
              </div>
              <div className="card p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
                <p className="text-xs text-primary-600 dark:text-primary-400">记录总数</p>
                <p className="text-3xl font-bold font-serif-sc text-primary-800 dark:text-primary-200 mt-1">
                  {stats?.total}
                </p>
              </div>
              <div className="card p-4 bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800">
                <p className="text-xs text-success-600 dark:text-success-400">干净数据</p>
                <p className="text-3xl font-bold font-serif-sc text-success-700 dark:text-success-300 mt-1">
                  {stats?.clean}
                </p>
              </div>
              <div className="card p-4 bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800">
                <p className="text-xs text-warning-600 dark:text-warning-400">待修正</p>
                <p className="text-3xl font-bold font-serif-sc text-warning-700 dark:text-warning-300 mt-1">
                  {(stats?.total ?? 0) - (stats?.clean ?? 0)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">问题分布</p>
                <div className="flex flex-wrap gap-1">
                  {(["unit_missing", "empty_value", "duplicate", "note_mixed"] as ProblemType[]).map((p) => (
                    stats && stats[p] > 0 && (
                      <span key={p} className="text-xs">
                        <ProblemBadge type={p} size="sm" />
                        <span className="ml-1 text-slate-500">×{stats[p]}</span>
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>

            <Alert
              type="info"
              title="数据清洗说明"
              message="系统已自动对数据进行质量检测，下方表格中高亮单元格为存在问题的字段。"
              suggestion="黄色=单位缺失/不规范，红色=空值，琥珀色=重复记录，蓝色=备注混写"
            />

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th className="w-12">#</th>
                      <th>题目编号</th>
                      <th>食材名称</th>
                      <th>数量</th>
                      <th>单位</th>
                      <th>分类</th>
                      <th>蛋白质</th>
                      <th>脂肪</th>
                      <th>碳水</th>
                      <th>热量</th>
                      <th>备注</th>
                      <th>问题</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cleanedData.map((row, idx) => (
                      <tr key={idx}>
                        <td className="text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className={cn(getCellClass(row, "questionId"), "font-mono text-xs")}>
                          {row.record.questionId || "—"}
                        </td>
                        <td className={cn("font-medium", getCellClass(row, "name"))}>
                          {row.record.name || "—"}
                        </td>
                        <td className={cn("font-mono", getCellClass(row, "quantity"))}>
                          {row.record.quantity ?? "—"}
                        </td>
                        <td className={cn("font-mono", getCellClass(row, "unit"))}>
                          {row.record.unit || "—"}
                        </td>
                        <td>{row.record.category || "—"}</td>
                        <td className="font-mono text-xs">
                          {(row.record as unknown as Record<string, number>).protein ?? "—"}
                        </td>
                        <td className="font-mono text-xs">
                          {(row.record as unknown as Record<string, number>).fat ?? "—"}
                        </td>
                        <td className="font-mono text-xs">
                          {(row.record as unknown as Record<string, number>).carbohydrate ?? "—"}
                        </td>
                        <td className="font-mono text-xs">
                          {(row.record as unknown as Record<string, number>).calories ?? "—"}
                        </td>
                        <td className={cn("max-w-48 truncate", getCellClass(row, "rawNote"))} title={row.record.rawNote}>
                          {row.record.rawNote || "—"}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {row.record.problems?.length === 0 ? (
                              <ProblemBadge type="none" size="sm" />
                            ) : (
                              row.record.problems?.map((p) => (
                                <ProblemBadge key={p} type={p} size="sm" />
                              ))
                            )}
                          </div>
                        </td>
                        <td>
                          <StatusBadge
                            status={(row.record.problems?.length ?? 0) > 0 ? "pending" : "confirmed"}
                            size="sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
                <p>
                  <strong className="text-slate-700 dark:text-slate-300">导入后处理流程：</strong>
                  干净数据将自动进入"已通过"状态，存在问题的数据将进入人工修正工作台。
                </p>
                <p>
                  若检测到与已有记录重复（相同题目编号或食材名称），将进入版本管理中心进行冲突处理，
                  <strong className="text-warning-600">确保同一件事只有一份有效结论</strong>。
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
