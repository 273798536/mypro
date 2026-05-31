import { Link, useLocation } from 'react-router-dom';
import { Anchor, History, Calculator } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '横摇计算', icon: <Calculator className="w-4 h-4" /> },
    { path: '/history', label: '历史记录', icon: <History className="w-4 h-4" /> },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0A2463] to-[#1E3A8A] flex items-center justify-center text-white shadow-lg group-hover:shadow-xl transition-shadow">
              <Anchor className="w-5 h-5" />
            </div>
            <div>
              <h1
                className="text-xl font-bold text-slate-800 leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                船舶横摇舒适度
              </h1>
              <p className="text-xs text-slate-500 -mt-0.5">Roll Comfort Analysis</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#0A2463] text-white shadow-md'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
