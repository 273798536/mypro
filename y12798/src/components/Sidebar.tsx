import { Link, useLocation } from "react-router-dom";
import {
  Beaker,
  Calculator,
  ClipboardList,
  FileCheck2,
  AlertCircle,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";
import type { Role } from "@/types";
import { ROLE_LABEL } from "@/types";
import { useApp } from "@/store/useApp";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  badge?: number;
}

export default function Sidebar() {
  const { role, setRole, stats } = useApp();
  const s = stats();
  const loc = useLocation();

  const items: NavItem[] = [
    { to: "/", label: "首页总览", icon: <LayoutDashboard size="18" />, roles: ["monitor", "teacher", "student"] },
    { to: "/balance", label: "配平计算（日常入口）", icon: <Calculator size="18" />, roles: ["monitor", "teacher"] },
    { to: "/records", label: "实验记录追踪", icon: <ClipboardList size="18" />, roles: ["monitor", "teacher", "student"] },
    { to: "/retest", label: "复测建议（月底/课前）", icon: <AlertCircle size="18" />, roles: ["monitor", "teacher"], badge: s.retest },
  ];

  const roleOrder: Role[] = ["monitor", "teacher", "student"];
  const roleColors: Record<Role, string> = {
    monitor: "bg-lab-500",
    teacher: "bg-chem-500",
    student: "bg-warn-500",
  };

  return (
    <aside className="no-print fixed left-0 top-0 bottom-0 w-64 bg-white/90 backdrop-blur-xl border-r border-ink-100 flex flex-col z-20">
      <div className="px-5 py-5 border-b border-ink-100">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lab-500 to-chem-500 flex items-center justify-center shadow-soft">
            <Beaker size="20" className="text-white" />
          </div>
          <div>
            <div className="font-display text-lg text-ink-800 leading-tight">溶剂回收</div>
            <div className="text-xs text-ink-500 leading-tight">纯度追踪平台</div>
          </div>
        </Link>
      </div>

      <div className="px-4 py-4 border-b border-ink-100">
        <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-2 font-medium">当前视角</div>
        <div className="grid grid-cols-3 gap-1.5">
          {roleOrder.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-2 py-2 rounded-xl text-[11px] font-medium transition-all ${
                role === r
                  ? "bg-ink-800 text-white shadow-soft"
                  : "bg-ink-50 text-ink-600 hover:bg-ink-100"
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mx-auto mb-1 ${roleColors[r]}`} />
              {ROLE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {items
          .filter((it) => it.roles.includes(role))
          .map((it) => {
            const active = loc.pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-lab-50 text-lab-700 shadow-soft"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-800"
                }`}
              >
                <span className={active ? "text-lab-500" : "text-ink-400"}>{it.icon}</span>
                <span className="flex-1 text-left">{it.label}</span>
                {typeof it.badge === "number" && it.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-warn-500 text-white font-semibold">
                    {it.badge}
                  </span>
                )}
              </Link>
            );
          })}
      </nav>

      <div className="px-4 py-4 border-t border-ink-100">
        <div className="rounded-xl bg-gradient-to-br from-lab-50 to-chem-50 p-4 border border-ink-100">
          <div className="flex items-center gap-2 text-xs text-ink-600 mb-2">
            <FileCheck2 size="14" className="text-chem-600" />
            本月批次摘要
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-xl font-display text-ink-800">{s.total}</div>
              <div className="text-[10px] text-ink-500">总批次</div>
            </div>
            <div>
              <div className="text-xl font-display text-chem-600">{s.avgPurity || "—"}</div>
              <div className="text-[10px] text-ink-500">平均纯度(%)</div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
          <GraduationCap size="12" />
          <span>学生视角仅显示已发布版本</span>
        </div>
      </div>
    </aside>
  );
}
