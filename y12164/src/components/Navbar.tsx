import { NavLink } from 'react-router-dom';
import { Activity, GitBranch, FileText, AlertTriangle, Cpu } from 'lucide-react';
import { useAppStore } from '../store/appStore';

export const Navbar = () => {
  const { issues, conflicts } = useAppStore();
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved).length;
  const criticalIssues = issues.filter((i) => i.severity === 'critical').length;

  const navItems = [
    { path: '/', label: '扭矩验算', icon: Activity },
    { path: '/merge', label: '数据合并', icon: GitBranch, badge: unresolvedConflicts },
    { path: '/report', label: '验算报告', icon: FileText, badge: criticalIssues },
  ];

  return (
    <nav className="bg-industrial-600 border-b border-industrial-500 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white font-mono">
              ROBOT-TORQUE
            </h1>
            <p className="text-xs text-industrial-300">
              机器人关节扭矩验算系统 v1.0
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500 text-white glow-primary'
                    : 'text-industrial-200 hover:bg-industrial-500 hover:text-white'
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {(criticalIssues > 0 || unresolvedConflicts > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-500/20 border border-danger-500 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-danger-500" />
              <span className="text-xs text-danger-400">
                {criticalIssues > 0 && `${criticalIssues} 严重问题`}
                {criticalIssues > 0 && unresolvedConflicts > 0 && ' | '}
                {unresolvedConflicts > 0 && `${unresolvedConflicts} 待解决冲突`}
              </span>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
