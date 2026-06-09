import { NavLink, useLocation } from "react-router-dom";
import { Sigma, Calculator, History, Upload } from "lucide-react";
import { useState } from "react";
import ImportModal from "@/components/constraint/ImportModal";

const NAV_ITEMS = [
  { to: "/", label: "约束校验", icon: Sigma, sub: "日常入口" },
  { to: "/formula", label: "公式计算", icon: Calculator, sub: "月底/课前" },
  { to: "/logs", label: "操作日志", icon: History, sub: "追溯留痕" },
];

export default function TopNav() {
  const loc = useLocation();
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-ivory/90 backdrop-blur border-b border-ink-100">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-ink-700 flex items-center justify-center text-ivory">
                <Sigma size={18} />
              </div>
              <div className="leading-tight">
                <div className="font-serif font-bold text-ink-800 text-[15px]">
                  数列递推反例库
                </div>
                <div className="text-[11px] text-ink-400 tracking-wide">
                  SEQUENCE COUNTEREXAMPLE LIBRARY
                </div>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = loc.pathname === item.to;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`group relative flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                      active
                        ? "bg-ink-700 text-ivory shadow-card"
                        : "text-ink-500 hover:bg-ink-50 hover:text-ink-700"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="font-medium">{item.label}</span>
                    <span
                      className={`text-[10px] ${
                        active ? "text-ink-200" : "text-ink-300"
                      }`}
                    >
                      {item.sub}
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowImport(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-sm font-medium bg-ink-700 text-ivory hover:bg-ink-800 transition-all hover:-translate-y-px hover:shadow-card-hover"
            >
              <Upload size={15} />
              导入数据
            </button>
            <div className="w-px h-6 bg-ink-200" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-ink-100 border border-ink-200 flex items-center justify-center text-ink-600 text-xs font-medium">
                教研
              </div>
              <span className="text-sm text-ink-600">张编辑</span>
            </div>
          </div>
        </div>
      </header>
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  );
}
