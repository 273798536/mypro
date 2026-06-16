import { FileText, Copy, AlertTriangle, Database, Bell } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  color: "blue" | "gray" | "orange" | "red" | "teal";
  flash?: boolean;
}

const colorMap = {
  blue: "from-government-500 to-government-700 text-white",
  gray: "from-zinc-500 to-zinc-700 text-white",
  orange: "from-warning-500 to-warning-700 text-white",
  red: "from-databad-500 to-databad-700 text-white",
  teal: "from-teal-500 to-teal-700 text-white",
};

function StatCard({ icon, label, value, sub, color, flash }: StatCardProps) {
  return (
    <div
      className={`relative flex flex-col rounded-xl p-4 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 overflow-hidden ${
        flash ? "animate-flash" : ""
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br opacity-10 ${colorMap[color].split(" ")[0]}`}
      />
      <div className="relative flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-zinc-500 mb-1">{label}</p>
          <p
            className={`text-2xl font-bold bg-gradient-to-br bg-clip-text text-transparent ${colorMap[color]}`}
          >
            {value}
          </p>
          {sub && <p className="text-[11px] text-zinc-400 mt-1">{sub}</p>}
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${colorMap[color]}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function StatusBar() {
  const { records, badDataFlags, intersectionErrors, duplicateLinks, changeLogs } =
    useAppStore();

  const total = records.length;
  const validCount = records.filter((r) => r.status !== "duplicate").length;
  const dupCount = duplicateLinks.length;
  const ieCount = intersectionErrors.length;
  const badCount = badDataFlags.length;

  const unresolvedChanges = changeLogs.filter(
    (c) => c.change_type !== "add"
  ).length;

  return (
    <div className="bg-white/80 backdrop-blur border-b border-zinc-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-government-600 to-government-800 flex items-center justify-center shadow-lg shadow-government-500/30">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-800 tracking-tight">
              公园噪声投诉回放
            </h1>
            <p className="text-xs text-zinc-500">
              街道周姐复盘专用 · 数据可溯源 · 去重不合错 · 异常全留痕
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500 font-mono">
          最新刷新：{new Date().toLocaleString("zh-CN")}
        </div>
      </div>
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5 text-white" />}
          label="投诉总记录"
          value={total}
          sub="导入+补录合计"
          color="blue"
        />
        <StatCard
          icon={<Copy className="w-5 h-5 text-white" />}
          label="去重后有效数"
          value={validCount}
          sub={dupCount > 0 ? `已排除重复${dupCount}条` : "无重复"}
          color="teal"
          flash={dupCount > 0}
        />
        <StatCard
          icon={<Copy className="w-5 h-5 text-white" />}
          label="重复提交拦截"
          value={dupCount}
          sub="指纹完全一致·不计数"
          color="gray"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5 text-white" />}
          label="路口合错标记"
          value={ieCount}
          sub="筛选/详情/导出均留痕"
          color="orange"
          flash={ieCount > 0}
        />
        <StatCard
          icon={<Database className="w-5 h-5 text-white" />}
          label="坏数据标记"
          value={badCount}
          sub="均指向原始行/对象"
          color="red"
        />
      </div>
      {unresolvedChanges > 0 && (
        <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-50 border border-teal-200">
          <Bell className="w-4 h-4 text-teal-600" />
          <span className="text-xs text-teal-700 font-medium">
            异常队列累计 {changeLogs.length} 条变化记录，底部面板可查看详情 →
          </span>
        </div>
      )}
    </div>
  );
}
