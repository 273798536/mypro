import React from 'react';
import { NavLink } from 'react-router-dom';
import { Upload, Search, PlayCircle, FileText, Download } from 'lucide-react';

const navItems = [
  { path: '/', label: '数据导入', icon: Upload },
  { path: '/analyze', label: '错误分析', icon: Search },
  { path: '/replay', label: '步骤回放', icon: PlayCircle },
  { path: '/report', label: '纠错报告', icon: FileText },
  { path: '/export', label: '导出分享', icon: Download },
];

export const Navigation: React.FC = () => {
  return (
    <nav className="bg-sudoku-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white rounded flex items-center justify-center">
              <span className="text-sudoku-primary font-bold text-lg">数</span>
            </div>
            <span className="font-serif-sc text-xl font-bold">数独步骤纠错器</span>
          </div>
          
          <div className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center space-x-1.5 px-3 py-2 rounded-md text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white font-medium'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
};
