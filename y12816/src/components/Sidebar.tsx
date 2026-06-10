import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calculator,
  Image,
  ClipboardCheck,
  AlertTriangle,
  GitCompare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { path: '/', label: '报告工作台', icon: LayoutDashboard },
  { path: '/calculator', label: '计算工具', icon: Calculator },
  { path: '/image-annotation', label: '图像标注对比', icon: Image },
  { path: '/qc-workflow', label: '质控流程', icon: ClipboardCheck },
  { path: '/edge-cases', label: '边界案例库', icon: AlertTriangle },
  { path: '/comparison', label: '新旧结论对比', icon: GitCompare },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-60 bg-teal-900 min-h-screen text-warm-50 flex flex-col">
      <div className="p-6 border-b border-teal-800">
        <h1 className="font-serif text-xl font-semibold text-white leading-tight">
          肿瘤样本
          <br />
          突变报告
        </h1>
        <p className="text-teal-500 text-xs mt-2">生物实验室质控计算工具</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-teal-800 text-white shadow-inner'
                  : 'text-teal-100 hover:bg-teal-800/50 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-teal-800 text-xs text-teal-500">
        <p>版本 1.0.0</p>
        <p className="mt-1">质控专用 · 内部工具</p>
      </div>
    </aside>
  );
}
