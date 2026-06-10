import { type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';
import { cn } from '@/lib/utils';

// 路由与面包屑映射表
const routeBreadcrumbMap: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ label: '仪表盘' }],
  '/workflow': [{ label: '工作流' }],
  '/report': [{ label: '报告导出' }],
  '/review': [{ label: '异常复核台' }],
  '/traceability': [{ label: '数据追溯' }],
};

interface AppLayoutProps {
  className?: string;
  children?: ReactNode;
}

// 应用主布局组件：左侧导航栏 + 顶部面包屑 + 主内容区
export default function AppLayout({ className, children }: AppLayoutProps) {
  const location = useLocation();

  // 根据当前路径获取面包屑项
  const breadcrumbItems =
    routeBreadcrumbMap[location.pathname] || [{ label: '页面' }];

  return (
    <div className={cn('flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-900', className)}>
      {/* 左侧侧边栏 */}
      <Sidebar />

      {/* 右侧主区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部栏：面包屑导航 */}
        <header className="flex h-16 shrink-0 items-center border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-950">
          <Breadcrumb items={breadcrumbItems} />
        </header>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto p-6">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
