
import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Receipt,
  BookOpen,
  RotateCcw,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Button } from 'antd';
import { useStore } from '../store/useStore';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { path: '/', label: '数据概览', icon: LayoutDashboard },
  { path: '/patient-bills', label: '患者账单', icon: FileText },
  { path: '/insurance-settlements', label: '医保结算单', icon: Receipt },
  { path: '/advance-ledger', label: '垫付账本', icon: BookOpen },
  { path: '/refund-records', label: '退费记录', icon: RotateCcw },
  { path: '/recovery-report', label: '追偿报告', icon: BarChart3 },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const refreshAll = useStore((state) => state.refreshAll);
  const lastUpdate = useStore((state) => state.lastUpdate);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } bg-slate-800 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 border-b border-slate-700">
          <h1 className={`font-bold text-lg ${collapsed ? 'hidden' : 'block'}`}>
            医保垫付追偿
          </h1>
          <h1 className={`font-bold text-lg ${collapsed ? 'block' : 'hidden'}`}>医</h1>
        </div>

        <nav className="flex-1 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white border-r-4 border-blue-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <Icon size={20} className="flex-shrink-0" />
                {!collapsed && <span className="ml-3">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <Button
            type="text"
            icon={<RefreshCw size={16} />}
            onClick={refreshAll}
            className="text-slate-300 hover:text-white w-full justify-start"
            size="small"
          >
            {!collapsed && '重置数据'}
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {menuItems.find((m) => m.path === location.pathname)?.label || '系统'}
            </h2>
          </div>
          <div className="text-sm text-gray-500">
            数据更新时间：{lastUpdate}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
