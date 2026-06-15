import { Link, useLocation } from 'react-router-dom';
import { FileText, AlertTriangle, HandMetal } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '复核列表', icon: FileText },
    { path: '/handover', label: '接班看板', icon: HandMetal },
  ];

  return (
    <nav className="h-14 bg-white border-b border-steel-100 px-6 flex items-center justify-between shadow-panel">
      <div className="flex items-center gap-8">
        <h1 className="text-lg font-semibold text-steel-700 tracking-wide">
          雨水口积淤容量复核系统
        </h1>
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
              (item.path === '/' && location.pathname.startsWith('/review/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-600 font-medium'
                    : 'text-steel-500 hover:text-steel-700 hover:bg-steel-50'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-steel-500">交通工程师</span>
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-sm font-medium">
          何
        </div>
      </div>
    </nav>
  );
}
