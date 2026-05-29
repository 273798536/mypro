import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Upload, BarChart3, Download, RotateCcw, FileSpreadsheet } from 'lucide-react';
import { useAppStore, useCurrentPage, useIsDemoMode } from '@/store/useAppStore';
import { formatFileSize } from '@/utils/fileParser';

interface LayoutProps {
  children: ReactNode;
}

interface NavItemProps {
  label: string;
  path: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const NavItem = ({ label, icon, isActive, onClick, disabled }: NavItemProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200
      ${isActive
        ? 'bg-primary text-white shadow-md'
        : disabled
          ? 'text-neutral-300 cursor-not-allowed'
          : 'text-neutral-600 hover:bg-primary/10 hover:text-primary'
      }
    `}
  >
    {icon}
    <span>{label}</span>
  </button>
);

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetAll, analysisResult, fileInfo, isDemoMode } = useAppStore();
  const currentPage = useCurrentPage();

  const hasData = analysisResult !== null || isDemoMode;

  const navItems = [
    { label: '数据上传', path: '/', icon: <Upload size={20} />, disabled: false },
    { label: '校准分析', path: '/analysis', icon: <BarChart3 size={20} />, disabled: !hasData },
    { label: '结果导出', path: '/export', icon: <Download size={20} />, disabled: !hasData },
  ];

  const handleReset = () => {
    if (confirm('确定要重置所有数据吗？当前分析结果将会丢失。')) {
      resetAll();
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 flex">
      <aside className="w-64 bg-white border-r border-neutral-200 flex flex-col shadow-sm">
        <div className="p-6 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary">预测校准</h1>
              <p className="text-xs text-neutral-400">区间校准工具</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              isActive={location.pathname === item.path}
              onClick={() => !item.disabled && navigate(item.path)}
            />
          ))}
        </nav>

        {fileInfo && (
          <div className="p-4 border-t border-neutral-100">
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs font-medium text-neutral-500 mb-1">当前文件</p>
              <p className="text-sm font-medium text-neutral-700 truncate">{fileInfo.name}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                <span>{formatFileSize(fileInfo.size)}</span>
                <span>·</span>
                <span>{fileInfo.rowCount} 行</span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={handleReset}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-neutral-500 hover:text-accent-danger hover:bg-red-50 rounded-lg transition-all duration-200"
          >
            <RotateCcw size={18} />
            <span className="text-sm font-medium">重置数据</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-[1600px] mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
