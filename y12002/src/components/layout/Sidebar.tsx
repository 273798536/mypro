import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Table2,
  Upload,
  FileCheck2,
  GitBranch,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/useAppStore';

const menuItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard },
  { path: '/liability', label: '兑付负债主表', icon: Table2 },
  { path: '/import', label: '数据导入中心', icon: Upload },
  { path: '/review', label: '特殊业务复核', icon: FileCheck2 },
  { path: '/trace', label: '追溯链路查询', icon: GitBranch },
  { path: '/export', label: '数据导出中心', icon: Download },
  { path: '/bad-records', label: '坏行管理', icon: AlertTriangle },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const currentUser = useAppStore((state) => state.currentUser);
  const badRecords = useAppStore((state) => state.badRecords);
  const liabilityRecords = useAppStore((state) => state.liabilityRecords);

  const { unprocessedBadRecords, expiredRecords, pendingReview } = useMemo(() => {
    const expired = liabilityRecords.filter(r => r.isExpired).length;
    const pending = liabilityRecords.filter(r => r.reviewStatus === '未复核' && !r.isExpired).length;
    return {
      unprocessedBadRecords: badRecords.filter(b => !b.isProcessed).length,
      expiredRecords: expired,
      pendingReview: pending,
    };
  }, [badRecords, liabilityRecords]);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col sticky top-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-xl font-bold font-display text-[#1E3A5F]">
          航司里程兑付负债
        </h1>
        <p className="text-xs text-gray-500 mt-1">航空收益会计系统</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          let badge: React.ReactNode = null;
          
          if (item.path === '/bad-records' && unprocessedBadRecords > 0) {
            badge = (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unprocessedBadRecords}
              </span>
            );
          }
          if (item.path === '/review' && expiredRecords > 0) {
            badge = (
              <span className="ml-auto bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {expiredRecords}
              </span>
            );
          }
          if (item.path === '/liability' && pendingReview > 0) {
            badge = (
              <span className="ml-auto bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingReview}
              </span>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'sidebar-item',
                isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {badge}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
            <span className="text-[#1E3A5F] font-semibold text-sm">
              {currentUser.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {currentUser}
            </p>
            <p className="text-xs text-gray-500">航空收益会计</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
