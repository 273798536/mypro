
import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '数据导入', icon: 'upload_file' },
    { path: '/detection', label: '异常检测', icon: 'search' },
    { path: '/visualization', label: '3D可视化', icon: '3d_rotation' },
    { path: '/timeline', label: '时间回放', icon: 'timeline' },
    { path: '/problem-solving', label: '问题处理', icon: 'build' },
    { path: '/report', label: '报告', icon: 'description' },
  ];

  return (
    <nav className="bg-primary text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="material-icons text-3xl text-accent">sports_basketball</span>
            <span className="font-bold text-xl">篮球投篮抛物面演示</span>
          </div>
          <div className="flex gap-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1 px-4 py-2 rounded-md transition-colors ${
                  location.pathname === item.path ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                <span className="material-icons text-sm">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
