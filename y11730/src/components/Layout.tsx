import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  Wrench,
  RefreshCw,
  Download,
  RotateCcw,
  X,
} from "lucide-react";

const navItems = [
  { to: "/", label: "残值工作台", icon: LayoutDashboard },
  { to: "/depreciation", label: "折旧试算", icon: Calculator },
  { to: "/contracts", label: "合同中心", icon: FileText },
  { to: "/maintenance", label: "维修记录", icon: Wrench },
  { to: "/repurchase", label: "回购管理", icon: RefreshCw },
  { to: "/report", label: "报告导出", icon: Download },
];

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [resetConfirm, setResetConfirm] = useState(false);
  const navigate = useNavigate();

  const handleReset = () => {
    localStorage.removeItem("leasing-residual-value-storage");
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-navy-50">
      <aside className="w-56 bg-navy-900 text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-navy-700">
          <h1 className="text-lg font-bold tracking-wide">融资租赁设备残值</h1>
          <p className="text-xs text-navy-300 mt-1">风控管理系统</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-3 text-sm transition-colors ${
                  isActive
                    ? "bg-navy-700 text-amber-400 border-l-2 border-amber-400"
                    : "text-navy-200 hover:bg-navy-800 hover:text-white"
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-navy-700">
          <button
            onClick={() => setResetConfirm(true)}
            className="flex items-center gap-2 text-xs text-navy-300 hover:text-danger-400 transition-colors"
          >
            <RotateCcw size={14} />
            重置数据
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-6">{children}</div>
      </main>

      {resetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy-900">确认重置</h3>
              <button
                onClick={() => setResetConfirm(false)}
                className="text-navy-400 hover:text-navy-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-navy-600 mb-6">
              重置将清除所有录入数据和操作痕迹，恢复为初始示例数据。此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetConfirm(false)}
                className="flex-1 py-2 text-sm border border-navy-200 rounded-lg text-navy-600 hover:bg-navy-50"
              >
                取消
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2 text-sm bg-danger-400 text-white rounded-lg hover:bg-danger-500"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
