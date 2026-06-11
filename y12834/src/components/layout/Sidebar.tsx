import { NavLink } from 'react-router-dom';
import { Calendar, FlaskConical, Workflow, FileCheck } from 'lucide-react';

/**
 * 菜单项配置接口
 */
interface MenuItem {
  /** 路由路径 */
  to: string;
  /** 菜单名称 */
  label: string;
  /** 图标组件 */
  icon: React.ReactNode;
}

/**
 * 侧边栏导航菜单配置
 */
const menuItems: MenuItem[] = [
  {
    to: '/',
    label: '投喂日历',
    icon: <Calendar size={20} />,
  },
  {
    to: '/samples',
    label: '样本管理',
    icon: <FlaskConical size={20} />,
  },
  {
    to: '/workflow',
    label: 'AI/ML 工作流',
    icon: <Workflow size={20} />,
  },
  {
    to: '/review',
    label: '复核报告',
    icon: <FileCheck size={20} />,
  },
];

/**
 * 侧边栏组件
 * 包含四个主导航菜单项，使用 NavLink 高亮当前路由
 */
export function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-deep-ocean/10 flex flex-col h-full">
      {/* Logo 区域 */}
      <div className="h-16 flex items-center px-6 border-b border-deep-ocean/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-deep-ocean flex items-center justify-center">
            <FlaskConical size={18} className="text-paper" />
          </div>
          <span className="font-serif font-semibold text-deep-ocean text-lg">
            实验管理
          </span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-deep-ocean text-paper shadow-soft'
                  : 'text-deep-ocean/70 hover:bg-paper-dark hover:text-deep-ocean'
              }`
            }
          >
            {item.icon}
            <span className="font-medium text-sm">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-deep-ocean/10">
        <p className="text-xs text-deep-ocean/40">v1.0.0</p>
      </div>
    </aside>
  );
}
