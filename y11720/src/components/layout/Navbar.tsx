import { Link, useLocation } from 'react-router-dom';
import { Calculator, GitCompare, FileText, Upload, Waves } from 'lucide-react';

const navItems = [
  { path: '/', label: '压降计算', icon: Calculator },
  { path: '/compare', label: '方案对比', icon: GitCompare },
  { path: '/reports', label: '报告中心', icon: FileText },
  { path: '/import', label: '数据导入', icon: Upload },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">流体管路压降计算器</h1>
              <p className="text-xs text-gray-500">Fluid Pressure Drop Calculator</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
