import { NavLink } from 'react-router-dom';
import { Upload, Wrench, List, History, Download } from 'lucide-react';
import { useStore } from '@/store/useStore';

const navItems = [
  { path: '/import', label: '数据导入', icon: Upload, badge: '' },
  { path: '/cleaning', label: '数据清洗', icon: Wrench, badge: 'warning' },
  { path: '/list', label: '清单列表', icon: List, badge: '' },
  { path: '/history', label: '历史追溯', icon: History, badge: '' },
  { path: '/export', label: '导出交付', icon: Download, badge: '' },
];

export default function Sidebar() {
  const activeTab = useStore((state) => state.activeTab);
  const setActiveTab = useStore((state) => state.setActiveTab);
  const records = useStore((state) => state.records);

  const issuesCount = records.filter(
    (r) => r.issues.some((i) => !i.resolved)
  ).length;

  const handleNavClick = (path: string) => {
    const tab = path.replace('/', '');
    setActiveTab(tab);
  };

  return (
    <aside className="w-56 bg-primary-700 text-white flex flex-col flex-shrink-0 animate-slide-in">
      <div className="p-6 border-b border-primary-600">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-lg font-serif font-bold">卸</span>
          </div>
          <div>
            <h2 className="font-serif font-semibold">卸货公示</h2>
            <p className="text-xs text-primary-300">管理系统 v1.0</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.path.replace('/', '');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'text-primary-200 hover:bg-primary-600 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-sm">{item.label}</span>
              {item.badge === 'warning' && issuesCount > 0 && (
                <span className="bg-warning-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse-slow">
                  {issuesCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4 border-t border-primary-600">
        <div className="bg-primary-800 rounded-lg p-3">
          <p className="text-xs text-primary-300 mb-1">当前记录数</p>
          <p className="text-2xl font-semibold">{records.length}</p>
        </div>
      </div>
    </aside>
  );
}
