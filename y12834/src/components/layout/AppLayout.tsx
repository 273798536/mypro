import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import type { AppRole } from '../../types';

/**
 * 应用主布局属性接口
 */
interface AppLayoutProps {
  /** 中间主内容区子元素 */
  children: ReactNode;
  /** 右侧详情面板内容，null 表示隐藏 */
  rightPanel?: ReactNode | null;
  /** 右侧面板宽度，Tailwind 宽度类或 CSS 宽度值 */
  rightPanelWidth?: string;
}

/**
 * 应用主布局组件
 * 三栏布局：左侧导航栏 + 中间主内容区 + 右侧详情面板（可选隐藏）
 */
export function AppLayout({
  children,
  rightPanel = null,
  rightPanelWidth = 'w-80',
}: AppLayoutProps) {
  /** 当前用户角色状态 */
  const [role, setRole] = useState<AppRole>('researcher');

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      {/* 左侧导航栏 */}
      <Sidebar />

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <TopBar role={role} onRoleChange={setRole} />

        {/* 内容区：中间主内容 + 右侧详情面板 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 中间主内容区 */}
          <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
            {children}
          </main>

          {/* 右侧详情面板（可选） */}
          {rightPanel && (
            <aside
              className={`${rightPanelWidth} bg-white border-l border-deep-ocean/10 overflow-y-auto scrollbar-thin`}
            >
              {rightPanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
