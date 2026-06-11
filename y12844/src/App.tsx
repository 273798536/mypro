import React, { useState } from 'react';
import {
  LayoutDashboard, Database, Calculator, BarChart3, GitCompare,
  FileCheck, ClipboardList, User, Bell, Settings, Menu, X,
  FlaskConical, Search, GraduationCap
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SampleManagement from '@/pages/SampleManagement';
import AnalysisCalculation from '@/pages/AnalysisCalculation';
import ChartVisualization from '@/pages/ChartVisualization';
import DiffAnalysis from '@/pages/DiffAnalysis';
import ReviewCenter from '@/pages/ReviewCenter';
import ReportExport from '@/pages/ReportExport';

type PageKey = 'samples' | 'analysis' | 'charts' | 'diff' | 'review' | 'export';

interface NavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
  description: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'samples',
    label: '样本管理',
    icon: Database,
    description: '样本录入、条码检测、状态筛选',
    badge: '3'
  },
  {
    key: 'analysis',
    label: '分析计算',
    icon: Calculator,
    description: '划痕面积、迁移率公式实时计算'
  },
  {
    key: 'charts',
    label: '图表可视化',
    icon: BarChart3,
    description: '迁移趋势图+明细解释，不单靠颜色'
  },
  {
    key: 'diff',
    label: '差异分析',
    icon: GitCompare,
    description: '迭代判断，支持补录数据后多轮重分析',
    badge: '迭代'
  },
  {
    key: 'review',
    label: '复核中心',
    icon: ClipboardList,
    description: '培养记录+时间点+意见同轮复核'
  },
  {
    key: 'export',
    label: '报告导出',
    icon: FileCheck,
    description: 'RUN轮次文件名，学生可读完整解释'
  }
];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageKey>('samples');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentNav = NAV_ITEMS.find(n => n.key === currentPage)!;

  const renderPage = () => {
    switch (currentPage) {
      case 'samples':
        return <SampleManagement />;
      case 'analysis':
        return <AnalysisCalculation />;
      case 'charts':
        return <ChartVisualization />;
      case 'diff':
        return <DiffAnalysis />;
      case 'review':
        return <ReviewCenter />;
      case 'export':
        return <ReportExport />;
      default:
        return <SampleManagement />;
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <aside
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-gradient-to-b from-[#0F172A] to-[#1E293B] text-white flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-medical-blue flex items-center justify-center flex-shrink-0">
            <FlaskConical size={22} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="ml-3 overflow-hidden">
              <h1 className="font-bold text-base whitespace-nowrap">细胞迁移分析</h1>
              <p className="text-xs text-slate-400 whitespace-nowrap">Scratch Assay System</p>
            </div>
          )}
        </div>

        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {!sidebarCollapsed && (
            <p className="px-3 mb-2 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              功能模块
            </p>
          )}
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentPage(item.key)}
                className={`w-full group relative ${
                  sidebarCollapsed ? 'justify-center px-2' : 'px-3'
                } py-3 rounded-lg flex items-center transition-all duration-200 ${
                  isActive
                    ? 'bg-medical-blue text-white shadow-lg shadow-medical-blue/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {isActive && !sidebarCollapsed && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white/60"></div>
                )}
                <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                {!sidebarCollapsed && (
                  <div className="ml-3 text-left flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : ''}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 ${
                      isActive ? 'text-blue-100' : 'text-slate-500 group-hover:text-slate-400'
                    } truncate`}>
                      {item.description}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white/10">
            <div className="student-lesson !bg-slate-800/50 !border-medical-blue/60 !p-3 !rounded-lg">
              <h4 className="!text-blue-300 !text-xs !mb-1.5 flex items-center gap-1.5">
                <GraduationCap size={14} />
                学生实习模式
              </h4>
              <p className="!text-xs !text-slate-400">
                样例设计含「顺利/待确认/坏数据」三种典型记录，覆盖病理备注边界场景
              </p>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-9 h-9 rounded-lg border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-500 hover:text-medical-blue transition-colors"
            >
              {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-neutral-700 flex items-center gap-2">
                  {React.createElement(currentNav.icon, { size: 20, className: 'text-medical-blue' })}
                  {currentNav.label}
                </h2>
              </div>
              <p className="text-xs text-neutral-400 truncate">
                {currentNav.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 w-64">
              <Search size={16} className="text-neutral-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="搜索条码 WBC-20260611-..."
                className="bg-transparent ml-2 outline-none text-sm text-neutral-700 placeholder:text-neutral-400 flex-1 min-w-0"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 bg-white border border-neutral-200 rounded text-neutral-400 hidden lg:inline">
                ⌘K
              </kbd>
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg text-xs">
              <div className="px-3 py-1.5 rounded-md bg-white shadow-sm text-medical-blue font-medium">
                检验师
              </div>
              <div className="px-3 py-1.5 text-neutral-500 hover:text-neutral-700 cursor-pointer">
                学生视图
              </div>
            </div>

            <button className="w-9 h-9 rounded-lg border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-500 hover:text-medical-blue transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-medical-danger rounded-full"></span>
            </button>

            <button className="w-9 h-9 rounded-lg border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-500 hover:text-medical-blue transition-colors">
              <Settings size={18} />
            </button>

            <div className="flex items-center gap-2 pl-3 ml-1 border-l border-neutral-200">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-medical-blue to-medical-blue-dark flex items-center justify-center text-white text-sm font-semibold">
                张
              </div>
              <div className="hidden lg:block min-w-0">
                <p className="text-sm font-medium text-neutral-700 truncate">张检验师</p>
                <p className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <User size={11} />
                  JS2024003 · 主管技师
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="bg-gradient-to-r from-medical-blue-light/60 via-white to-white border-b border-neutral-200 px-6 py-2.5">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <LayoutDashboard size={13} className="text-medical-blue" />
              <span className="text-medical-blue font-medium">细胞迁移划痕分析</span>
              <span className="text-neutral-300">/</span>
              <span>{currentNav.label}</span>
              <span className="ml-auto text-neutral-400">
                批次号 BATCH-20260611 · 今日 3 条样本待处理
              </span>
            </div>
          </div>

          <main className="min-h-[calc(100vh-180px)]">
            {renderPage()}
          </main>

          <footer className="bg-white border-t border-neutral-200 px-6 py-3 text-xs text-neutral-400 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>© 2026 医学检验信息系统 · 细胞迁移划痕分析模块 v1.0.0</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-medical-success animate-pulse"></span>
                系统运行正常
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>计算引擎: calculationEngine v1.0</span>
              <span>质控标准: CLSI EP12-A2</span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default App;
