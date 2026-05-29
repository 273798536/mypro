import { NavLink } from 'react-router-dom';
import { BarChart3, Upload, Settings, CheckCircle2, Search, Trophy } from 'lucide-react';

const Navigation = () => {
  const navItems = [
    { path: '/', icon: BarChart3, label: '分析看板' },
    { path: '/import', icon: Upload, label: '数据导入' },
    { path: '/rules', icon: Settings, label: '规则配置' },
    { path: '/review', icon: CheckCircle2, label: '复核工作台' },
    { path: '/trace', icon: Search, label: '溯源查询' },
  ];

  return (
    <nav className="bg-dark-800/90 backdrop-blur-md border-b border-dark-600/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white">赛事同分排名器</h1>
              <p className="text-xs text-dark-400">可视化排名分析系统</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
