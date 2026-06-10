import { useAppStore } from '@/store/useAppStore';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const currentRunBatch = useAppStore((state) => state.currentRunBatch);

  return (
    <div className="flex h-screen bg-neutral-100">
      <Sidebar currentRunBatch={currentRunBatch?.batchNumber} />
      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-6 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary-800">
              {getPageTitle()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-primary-700">张检验师</p>
              <p className="text-xxs text-neutral-500">检验科</p>
            </div>
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-600">张</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}

function getPageTitle(): string {
  const path = window.location.pathname;
  const titles: Record<string, string> = {
    '/': '工作台',
    '/calculator': '计算工具',
    '/samples': '样本台账',
    '/quality-control': '质控分析',
    '/anomalies': '异常中心',
    '/export': '报告导出',
  };
  return titles[path] || '工作台';
}
