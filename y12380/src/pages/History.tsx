import { GitCompare, Clock, User, ChevronRight, Save } from 'lucide-react';
import { useScheduleStore } from '@/store';
import { useState } from 'react';

export default function History() {
  const versions = useScheduleStore((state) => state.versions);
  const createVersion = useScheduleStore((state) => state.createVersion);

  const [newVersionName, setNewVersionName] = useState('');

  const handleCreateVersion = () => {
    if (newVersionName.trim()) {
      createVersion(newVersionName, '活动统筹');
      setNewVersionName('');
    }
  };

  const getChangeLabel = (type: string) => {
    const labels: Record<string, string> = {
      add: '新增',
      remove: '删除',
      update: '更新',
      swap: '换班'
    };
    return labels[type] || type;
  };

  const getChangeColor = (type: string) => {
    const colors: Record<string, string> = {
      add: 'text-emerald-600 bg-emerald-50',
      remove: 'text-red-600 bg-red-50',
      update: 'text-indigo-600 bg-indigo-50',
      swap: 'text-orange-600 bg-orange-50'
    };
    return colors[type] || 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">历史记录</h1>
          <p className="text-sm text-slate-500 mt-1">查看排班版本历史和换班记录</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="版本名称..."
            value={newVersionName}
            onChange={(e) => setNewVersionName(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            onClick={handleCreateVersion}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
          >
            <Save className="w-4 h-4" />
            保存版本
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {versions.map((version, idx) => (
          <div
            key={version.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <GitCompare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-800">
                        {version.name}
                      </h3>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                          当前版本
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(version.timestamp).toLocaleString('zh-CN')}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {version.createdBy}
                      </div>
                      <div>
                        {version.snapshot.entries.length} 条排班记录
                      </div>
                    </div>
                  </div>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors">
                  对比差异
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {version.changes.length > 0 && (
              <div className="p-6 bg-slate-50">
                <p className="text-sm font-medium text-slate-600 mb-3">变更记录</p>
                <div className="space-y-2">
                  {version.changes.slice(0, 5).map((change, cIdx) => (
                    <div
                      key={cIdx}
                      className="flex items-center gap-3 p-3 bg-white rounded-xl"
                    >
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getChangeColor(change.type)}`}>
                        {getChangeLabel(change.type)}
                      </span>
                      <span className="text-sm text-slate-600">
                        {change.entityType === 'entry' ? '排班记录' : change.entityType}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(change.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                  ))}
                  {version.changes.length > 5 && (
                    <p className="text-sm text-slate-400 text-center py-2">
                      还有 {version.changes.length - 5} 条变更...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
