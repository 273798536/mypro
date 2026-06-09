import type { ReactNode } from 'react';
import TopNav from './TopNav';

interface LayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="flex-1">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
      <footer className="border-t border-lab-100 bg-white/60 py-4">
        <div className="container mx-auto px-6 flex items-center justify-between text-xs text-zinc-500">
          <span>气相色谱保留时间对齐工具 · 内部课题组使用</span>
          <div className="flex items-center gap-4">
            <span>依赖安装：<code className="px-1.5 py-0.5 bg-lab-50 rounded text-lab-600">npm install</code></span>
            <span>启动：<code className="px-1.5 py-0.5 bg-lab-50 rounded text-lab-600">npm run dev</code></span>
            <span>样例：顶部「样例展示」</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppLayout;
