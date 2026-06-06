import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Layers, AlertTriangle, CheckSquare, BarChart3, Upload, Download } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export function Layout() {
  const location = useLocation();
  const { exceptionSummary } = useAppStore();

  const navItems = [
    { path: '/', label: '图层管理', icon: Layers, desc: '日常入口' },
    { path: '/exceptions', label: '异常记录', icon: AlertTriangle, desc: '筛选与查看' },
    { path: '/review', label: '复核管理', icon: CheckSquare, desc: '批量复核' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
              <BarChart3 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">平面机构运动演示</h1>
              <p className="text-xs text-gray-500">数据质量审查系统</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {exceptionSummary && (
              <div className="hidden md:flex items-center gap-4 text-xs">
                <span>共 <span className="font-semibold text-gray-800">{exceptionSummary.totalCount}</span> 条记录</span>
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded">
                  异常 {exceptionSummary.statusCounts?.abnormal || 0}
                </span>
                <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded">
                  待确认 {exceptionSummary.statusCounts?.pending || 0}
                </span>
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded">
                  离线缺失 {exceptionSummary.statusCounts?.offline_missing || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 bg-white border-r border-gray-200 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive =
                item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  <div>
                    <div>{item.label}</div>
                    <div className={`text-xs ${isActive ? 'text-blue-500' : 'text-gray-400'}`}>
                      {item.desc}
                    </div>
                  </div>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 px-3 space-y-2">
            <p className="px-3 text-xs font-medium text-gray-400 uppercase tracking-wider">数据操作</p>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              <Upload size={16} />
              <span>导入数据</span>
            </button>
            <button
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-50"
              onClick={() => useAppStore.getState().exportReport('csv')}
            >
              <Download size={16} />
              <span>导出报告</span>
            </button>
            <input
              id="import-file"
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                try {
                  let records: any[];
                  if (file.name.endsWith('.json')) {
                    const data = JSON.parse(text);
                    records = Array.isArray(data) ? data : data.records || [data];
                  } else {
                    records = text.split('\n').slice(1).map(line => {
                      const cols = line.split(',');
                      return {
                        title: cols[0] || '',
                        description: cols[1] || '',
                        type: cols[2] || 'other'
                      };
                    }).filter(r => r.title);
                  }
                  await useAppStore.getState().importRecords(records);
                  alert('导入成功！');
                } catch (err: any) {
                  alert('导入失败: ' + err.message);
                }
                e.target.value = '';
              }}
            />
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
