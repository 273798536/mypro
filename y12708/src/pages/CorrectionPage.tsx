import { useState, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useAppStore } from "@/store/appStore";
import { ProblemBadge, StatusBadge, PROBLEM_LABELS } from "@/components/ui/Badges";
import Drawer from "@/components/ui/Drawer";
import Alert from "@/components/ui/Alert";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Edit3,
  History,
  User,
  ArrowRight,
  Trash2,
  AlertTriangle,
  FileText,
  Save,
  ChevronRight,
  Lightbulb,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { IngredientRecord, ProblemType, TabKey, AuditLog } from "@/types";

const problemTabs: { key: TabKey; icon: React.ElementType }[] = [
  { key: "all", icon: Filter },
  { key: "unit_missing", icon: AlertTriangle },
  { key: "empty_value", icon: XCircle },
  { key: "duplicate", icon: FileText },
  { key: "note_mixed", icon: FileText },
];

export default function CorrectionPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedRecord, setSelectedRecord] = useState<IngredientRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const records = useAppStore((s) => s.records);
  const getRecordsByProblem = useAppStore((s) => s.getRecordsByProblem);
  const getProblemStats = useAppStore((s) => s.getProblemStats);
  const updateRecord = useAppStore((s) => s.updateRecord);
  const updateRecordStatus = useAppStore((s) => s.updateRecordStatus);
  const removeRecordProblems = useAppStore((s) => s.removeRecordProblems);
  const getAuditLogsByRecordId = useAppStore((s) => s.getAuditLogsByRecordId);
  const deleteRecord = useAppStore((s) => s.deleteRecord);

  const stats = getProblemStats();

  const filteredRecords = useMemo(() => {
    const base = activeTab === "all"
      ? records.filter((r) => r.status === "pending")
      : getRecordsByProblem(activeTab).filter((r) => r.status === "pending");
    return base;
  }, [activeTab, records, getRecordsByProblem]);

  const openCorrection = (record: IngredientRecord) => {
    setSelectedRecord(record);
    setDrawerOpen(true);
  };

  const handleConfirm = (note?: string) => {
    if (!selectedRecord) return;
    updateRecordStatus(selectedRecord.id, "confirmed", note);
    const remainingProblems = selectedRecord.problems.filter((p) => p !== "none");
    if (remainingProblems.length > 0) {
      removeRecordProblems(selectedRecord.id, remainingProblems);
    }
    setDrawerOpen(false);
    setSelectedRecord(null);
  };

  const handleReject = (note?: string) => {
    if (!selectedRecord) return;
    updateRecordStatus(selectedRecord.id, "failed", note);
    setDrawerOpen(false);
    setSelectedRecord(null);
  };

  const handleDelete = () => {
    if (!selectedRecord) return;
    if (confirm("确定要删除这条记录吗？此操作不可撤销。")) {
      deleteRecord(selectedRecord.id);
      setDrawerOpen(false);
      setSelectedRecord(null);
    }
  };

  const auditLogs = selectedRecord ? getAuditLogsByRecordId(selectedRecord.id) : [];

  const actionIcon = (action: AuditLog["action"]) => {
    switch (action) {
      case "create": return <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />;
      case "update": return <Edit3 className="w-3.5 h-3.5" strokeWidth={2} />;
      case "confirm": return <CheckCircle2 className="w-3.5 h-3.5 text-success-600" strokeWidth={2} />;
      case "reject": return <XCircle className="w-3.5 h-3.5 text-danger-600" strokeWidth={2} />;
      case "import": return <FileText className="w-3.5 h-3.5 text-info-600" strokeWidth={2} />;
      case "delete": return <Trash2 className="w-3.5 h-3.5 text-danger-600" strokeWidth={2} />;
    }
  };

  const actionLabel = (action: AuditLog["action"]) => {
    switch (action) {
      case "create": return "创建";
      case "update": return "更新";
      case "confirm": return "确认通过";
      case "reject": return "驳回";
      case "import": return "导入";
      case "delete": return "删除";
    }
  };

  return (
    <AppLayout
      title="人工修正工作台"
      subtitle="待确认记录处理 · 补录单位、调整数值、变更留痕"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">待处理总计</p>
            <p className="text-2xl font-bold font-serif-sc text-warning-600 mt-1">
              {stats.all - stats.none}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ProblemBadge type="unit_missing" size="sm" />
            </div>
            <p className="text-2xl font-bold font-serif-sc text-slate-800 dark:text-slate-100">
              {stats.unit_missing}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ProblemBadge type="empty_value" size="sm" />
            </div>
            <p className="text-2xl font-bold font-serif-sc text-slate-800 dark:text-slate-100">
              {stats.empty_value}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ProblemBadge type="duplicate" size="sm" />
            </div>
            <p className="text-2xl font-bold font-serif-sc text-slate-800 dark:text-slate-100">
              {stats.duplicate}
            </p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <ProblemBadge type="note_mixed" size="sm" />
            </div>
            <p className="text-2xl font-bold font-serif-sc text-slate-800 dark:text-slate-100">
              {stats.note_mixed}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
            {problemTabs.map((tab) => {
              const Icon = tab.icon;
              const count = tab.key === "all" ? stats.all - stats.none : stats[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    activeTab === tab.key ? "tab-item-active" : "tab-item-inactive",
                    "flex items-center gap-1.5 whitespace-nowrap"
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span>{PROBLEM_LABELS[tab.key]}</span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    activeTab === tab.key
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-success-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-slate-500 dark:text-slate-400">
                {activeTab === "all" ? "暂无待确认记录，全部已处理完毕" : `当前分类下没有待处理记录`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>题目编号</th>
                    <th>食材名称</th>
                    <th>数量</th>
                    <th>单位</th>
                    <th>分类</th>
                    <th>问题类型</th>
                    <th>状态</th>
                    <th>版本</th>
                    <th>更新时间</th>
                    <th className="text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="font-mono text-xs text-slate-500">{r.questionId || "—"}</td>
                      <td className="font-medium">{r.name}</td>
                      <td className={cn("font-mono", !r.quantity && "text-danger-600 font-semibold")}>
                        {r.quantity ?? "—"}
                      </td>
                      <td className={cn("font-mono", !r.unit && "text-warning-600 font-semibold")}>
                        {r.unit || "—"}
                      </td>
                      <td>{r.category || "—"}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {r.problems.map((p) => (
                            <ProblemBadge key={p} type={p} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td><StatusBadge status={r.status} size="sm" /></td>
                      <td className="font-mono text-xs">v{r.version}</td>
                      <td className="text-xs text-slate-500">
                        {new Date(r.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="text-right">
                        <button
                          onClick={() => openCorrection(r)}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          <Wrench className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} />
                          修正
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="人工修正"
        subtitle={selectedRecord?.name}
        width="560px"
        footer={
          selectedRecord && (
            <div className="flex items-center justify-between">
              <button onClick={handleDelete} className="btn-danger text-sm">
                <Trash2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                删除记录
              </button>
              <div className="flex gap-2">
                <button onClick={() => handleReject("数据有误，无法使用")} className="btn-secondary">
                  <XCircle className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  驳回
                </button>
                <button onClick={() => handleConfirm("人工审核确认通过")} className="btn-primary">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  确认通过
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedRecord && (
          <CorrectionForm
            record={selectedRecord}
            auditLogs={auditLogs}
            onUpdate={(updates, note) => updateRecord(selectedRecord.id, updates, note)}
            actionIcon={actionIcon}
            actionLabel={actionLabel}
          />
        )}
      </Drawer>
    </AppLayout>
  );
}

interface CorrectionFormProps {
  record: IngredientRecord;
  auditLogs: AuditLog[];
  onUpdate: (updates: Partial<IngredientRecord>, note?: string) => void;
  actionIcon: (action: AuditLog["action"]) => React.ReactNode;
  actionLabel: (action: AuditLog["action"]) => string;
}

function CorrectionForm({ record, auditLogs, onUpdate, actionIcon, actionLabel }: CorrectionFormProps) {
  const [formData, setFormData] = useState({
    name: record.name,
    questionId: record.questionId ?? "",
    quantity: record.quantity !== undefined ? String(record.quantity) : "",
    unit: record.unit ?? "",
    category: record.category ?? "",
    rawNote: record.rawNote ?? "",
    protein: record.nutrition?.protein !== undefined ? String(record.nutrition.protein) : "",
    fat: record.nutrition?.fat !== undefined ? String(record.nutrition.fat) : "",
    carbohydrate: record.nutrition?.carbohydrate !== undefined ? String(record.nutrition.carbohydrate) : "",
    calories: record.nutrition?.calories !== undefined ? String(record.nutrition.calories) : "",
    correctionNote: "",
  });

  const [localNote, setLocalNote] = useState("");

  const hasChanges = (() => {
    if (formData.name !== record.name) return true;
    if (formData.questionId !== (record.questionId ?? "")) return true;
    if (formData.quantity !== (record.quantity !== undefined ? String(record.quantity) : "")) return true;
    if (formData.unit !== (record.unit ?? "")) return true;
    if (formData.category !== (record.category ?? "")) return true;
    if (formData.rawNote !== (record.rawNote ?? "")) return true;
    return false;
  })();

  const handleSave = () => {
    const updates: Partial<IngredientRecord> = {};
    if (formData.name !== record.name) updates.name = formData.name;
    if (formData.questionId !== (record.questionId ?? "")) updates.questionId = formData.questionId || undefined;
    const qtyNum = formData.quantity === "" ? undefined : Number(formData.quantity);
    if (qtyNum !== record.quantity) updates.quantity = qtyNum;
    if (formData.unit !== (record.unit ?? "")) updates.unit = formData.unit || undefined;
    if (formData.category !== (record.category ?? "")) updates.category = formData.category || undefined;
    if (formData.rawNote !== (record.rawNote ?? "")) updates.rawNote = formData.rawNote || undefined;

    const nutrition = {
      protein: formData.protein ? Number(formData.protein) : undefined,
      fat: formData.fat ? Number(formData.fat) : undefined,
      carbohydrate: formData.carbohydrate ? Number(formData.carbohydrate) : undefined,
      calories: formData.calories ? Number(formData.calories) : undefined,
    };
    if (JSON.stringify(nutrition) !== JSON.stringify(record.nutrition ?? {})) {
      updates.nutrition = nutrition;
    }

    const fixedProblems: ProblemType[] = [];
    if (formData.unit && (!record.unit || record.problems.includes("unit_missing"))) {
      fixedProblems.push("unit_missing");
    }
    if (formData.name && record.problems.includes("empty_value")) {
      fixedProblems.push("empty_value");
    }

    onUpdate(updates, localNote || undefined);
    setLocalNote("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {record.problems.map((p) => (
          <ProblemBadge key={p} type={p} />
        ))}
        <StatusBadge status={record.status} />
        <span className="text-xs text-slate-400 ml-auto">版本 v{record.version}</span>
      </div>

      {record.problems.includes("unit_missing") && (
        <Alert type="warning" title="单位缺失" message="该记录有数量但缺少单位标注。" suggestion="请在下方补充正确的单位（g、kg、ml、份等）" />
      )}
      {record.problems.includes("empty_value") && (
        <Alert type="danger" title="必填字段为空" message="食材名称等必填字段存在空值。" suggestion="请补充缺失的字段值" />
      )}
      {record.problems.includes("note_mixed") && (
        <Alert type="info" title="备注混写" message="备注中可能混有数量、单位等结构化数据。" suggestion="请从备注中提取信息到对应字段" />
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="form-label">
              食材名称
              {!formData.name && <span className="text-danger-500 ml-1">*</span>}
            </label>
            <FieldChangeIndicator oldValue={record.name} newValue={formData.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={cn("input-field", !formData.name && "input-field-error")}
              />
            </FieldChangeIndicator>
          </div>
          <div>
            <label className="form-label">题目编号</label>
            <FieldChangeIndicator oldValue={record.questionId ?? ""} newValue={formData.questionId}>
              <input
                type="text"
                value={formData.questionId}
                onChange={(e) => setFormData({ ...formData, questionId: e.target.value })}
                className="input-field font-mono text-xs"
              />
            </FieldChangeIndicator>
          </div>
          <div>
            <label className="form-label">数量</label>
            <FieldChangeIndicator oldValue={record.quantity !== undefined ? String(record.quantity) : ""} newValue={formData.quantity}>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="input-field font-mono"
              />
            </FieldChangeIndicator>
          </div>
          <div>
            <label className="form-label">
              单位
              {formData.quantity && !formData.unit && <span className="text-danger-500 ml-1">*</span>}
            </label>
            <FieldChangeIndicator oldValue={record.unit ?? ""} newValue={formData.unit}>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className={cn("input-field", formData.quantity && !formData.unit && "input-field-warning")}
              >
                <option value="">请选择</option>
                <option value="g">克 (g)</option>
                <option value="kg">千克 (kg)</option>
                <option value="mg">毫克 (mg)</option>
                <option value="ml">毫升 (ml)</option>
                <option value="L">升 (L)</option>
                <option value="份">份</option>
                <option value="个">个</option>
                <option value="勺">勺</option>
                <option value="碗">碗</option>
                <option value="杯">杯</option>
              </select>
            </FieldChangeIndicator>
          </div>
          <div className="col-span-2">
            <label className="form-label">分类</label>
            <FieldChangeIndicator oldValue={record.category ?? ""} newValue={formData.category}>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                placeholder="肉类、蔬菜、主食、蛋类..."
              />
            </FieldChangeIndicator>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">营养成分（每100g）</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">蛋白质 (g)</label>
              <input
                type="number" step="0.1"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">脂肪 (g)</label>
              <input
                type="number" step="0.1"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">碳水 (g)</label>
              <input
                type="number" step="0.1"
                value={formData.carbohydrate}
                onChange={(e) => setFormData({ ...formData, carbohydrate: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">热量 (kcal)</label>
              <input
                type="number" step="1"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="form-label">备注（原始记录）</label>
          <FieldChangeIndicator oldValue={record.rawNote ?? ""} newValue={formData.rawNote}>
            <input
              type="text"
              value={formData.rawNote}
              onChange={(e) => setFormData({ ...formData, rawNote: e.target.value })}
              className="input-field"
            />
          </FieldChangeIndicator>
        </div>

        <div>
          <label className="form-label">
            <span className="flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-accent-500" strokeWidth={1.5} />
              修正备注（留痕）
            </span>
          </label>
          <textarea
            rows={2}
            value={localNote}
            onChange={(e) => setLocalNote(e.target.value)}
            className="input-field resize-none"
            placeholder="说明修正原因，如：根据题目清单补充单位为克(g)..."
          />
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <button onClick={handleSave} className="btn-accent text-sm">
              <Save className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              保存修正（待确认）
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-5 h-5 text-primary-700 dark:text-primary-300" strokeWidth={1.5} />
          <h4 className="section-title text-base">变更历史</h4>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">暂无变更记录</p>
        ) : (
          <div className="relative">
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="relative pl-8">
                  <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {actionIcon(log.action)}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                      <User className="w-3 h-3" strokeWidth={1.5} />
                      <span>{log.operator}</span>
                    </div>
                    {log.note && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{log.note}</p>
                    )}
                    <div className="space-y-1">
                      {log.changes.map((ch, idx) => (
                        <div key={idx} className="text-xs flex items-start gap-2 font-mono">
                          <span className="text-slate-400 w-16 flex-shrink-0">{ch.field}</span>
                          <span className="text-danger-600 dark:text-danger-400">
                            {ch.oldValue === null || ch.oldValue === undefined || ch.oldValue === ""
                              ? "(空)"
                              : typeof ch.oldValue === "object"
                              ? "[对象]"
                              : String(ch.oldValue)}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
                          <span className="text-success-600 dark:text-success-400">
                            {ch.newValue === null || ch.newValue === undefined || ch.newValue === ""
                              ? "(空)"
                              : typeof ch.newValue === "object"
                              ? "[对象]"
                              : String(ch.newValue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FieldChangeIndicator({
  oldValue,
  newValue,
  children,
}: {
  oldValue: string;
  newValue: string;
  children: React.ReactNode;
}) {
  const changed = oldValue !== newValue;
  return (
    <div className="relative">
      {children}
      {changed && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-accent-400 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center animate-pulse-slow">
          <ChevronRight className="w-2 h-2 text-white" strokeWidth={3} />
        </div>
      )}
    </div>
  );
}
