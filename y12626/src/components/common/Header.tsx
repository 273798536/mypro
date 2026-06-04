import React from 'react';
import { Map, FileText, Database, Download, Settings } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useDataExport } from '../../hooks/useDataExport';

const Header: React.FC = () => {
  const viewMode = useAppStore(state => state.viewMode);
  const setViewMode = useAppStore(state => state.setViewMode);
  const currentBatch = useAppStore(state => state.currentBatch);
  const dataVersion = useAppStore(state => state.dataVersion);
  const { exportCSV, exportExcel, exportJSON, exportReport } = useDataExport();

  const navItems = [
    { id: 'dashboard', label: '临摹看板', icon: Map },
    { id: 'report', label: '训练员报告', icon: FileText },
    { id: 'samples', label: '样例中心', icon: Database },
  ];

  return (
    <header className="bg-xuan-100 border-b-2 border-ochre-400 shadow-paper">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-ochre-500 rounded flex items-center justify-center">
              <Map className="w-6 h-6 text-xuan-50" />
            </div>
            <div>
              <h1 className="brush-font text-xl text-ink-600 leading-tight">
                地图等高线临摹器
              </h1>
              <p className="text-xs text-ochre-600 font-serif">
                文保轨迹复核系统
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setViewMode(item.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded transition-all duration-150 font-serif text-sm ${
                  viewMode === item.id
                    ? 'bg-ochre-500 text-xuan-50 shadow-stamp'
                    : 'text-ochre-700 hover:bg-ochre-100'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {currentBatch && (
              <div className="text-right mr-4 hidden lg:block">
                <p className="text-sm font-serif text-ink-600">
                  {currentBatch.name}
                </p>
                <p className="text-xs text-ochre-600">
                  数据版本: v{dataVersion}
                </p>
              </div>
            )}

            <div className="flex items-center gap-1 border-l border-ochre-300 pl-3">
              <div className="relative group">
                <button className="stamp-btn flex items-center gap-1 text-sm">
                  <Download className="w-4 h-4" />
                  导出
                </button>
                <div className="absolute right-0 top-full mt-1 bg-xuan-50 border border-ochre-300 rounded shadow-card py-1 min-w-36 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                  <button
                    onClick={() => exportCSV()}
                    className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-ochre-50"
                  >
                    导出 CSV
                  </button>
                  <button
                    onClick={() => exportExcel()}
                    className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-ochre-50"
                  >
                    导出 Excel
                  </button>
                  <button
                    onClick={() => exportJSON()}
                    className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-ochre-50"
                  >
                    导出 JSON
                  </button>
                  <div className="border-t border-ochre-200 my-1" />
                  <button
                    onClick={() => exportReport()}
                    className="w-full text-left px-3 py-2 text-sm text-cinnabar-600 hover:bg-cinnabar-50 font-serif"
                  >
                    生成审计报告
                  </button>
                </div>
              </div>

              <button className="p-2 rounded hover:bg-ochre-100 text-ochre-600">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
