import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { useApp } from "@/store/useApp";
import { ROLE_LABEL } from "@/types";

export default function Layout() {
  const { role } = useApp();
  const loc = useLocation();
  const isStudentView = loc.pathname.startsWith("/student/");

  return (
    <div className="min-h-screen">
      {!isStudentView && <Sidebar />}
      <main className={isStudentView ? "min-h-screen" : "ml-64 min-h-screen"}>
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          {!isStudentView && (
            <div className="mb-6 flex items-end justify-between no-print">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-ink-400 font-medium">
                  当前视角 · {ROLE_LABEL[role]}
                </div>
                <h1 className="font-display text-3xl text-ink-800 mt-1">
                  溶剂回收纯度追踪
                </h1>
                <p className="text-sm text-ink-500 mt-1">
                  版本可控 · 结果可解释 · 导出与页面一致 · 防重复建单
                </p>
              </div>
              <div className="text-xs text-ink-400">
                {new Date().toLocaleDateString("zh-CN", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </div>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
