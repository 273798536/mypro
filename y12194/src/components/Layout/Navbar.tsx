import { Link, useLocation } from 'react-router-dom';
import { Music, FileUp, FileSearch, BarChart3, GitBranch, FileText } from 'lucide-react';
import { cn } from '../../utils';

const navItems = [
  { path: '/', label: '谱面导入', icon: FileUp },
  { path: '/parse', label: '数据解析', icon: FileSearch },
  { path: '/analysis', label: '质检分析', icon: BarChart3 },
  { path: '/trace', label: '结果追溯', icon: GitBranch },
  { path: '/report', label: '报告输出', icon: FileText },
];

export const Navbar = () => {
  const location = useLocation();

  return (
    <nav className="bg-slate-900 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16">
          <div className="flex items-center gap-3 mr-8">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg tracking-tight">节奏谱面质检</h1>
              <p className="text-slate-400 text-xs">Rhythm Chart Quality Inspector</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
