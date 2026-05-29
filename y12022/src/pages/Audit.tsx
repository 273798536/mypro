import { useMemo, useState } from 'react';
import { Search, Filter, FileText, Calendar, Tag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { AuditTimeline } from '../components/AuditTimeline';
import { EntityType } from '../types';

export const Audit = () => {
  const auditLogs = useStore((state) => state.auditLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const filteredLogs = useMemo(() => {
    let result = [...auditLogs];

    if (searchTerm) {
      result = result.filter(
        (log) =>
          log.source.includes(searchTerm) ||
          log.operator.includes(searchTerm) ||
          JSON.stringify(log.beforeValue || '').includes(searchTerm) ||
          JSON.stringify(log.afterValue || '').includes(searchTerm)
      );
    }

    if (filterEntityType) {
      result = result.filter((log) => log.entityType === filterEntityType);
    }

    if (filterAction) {
      result = result.filter((log) => log.action === filterAction);
    }

    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchTerm, filterEntityType, filterAction]);

  const entityTypes: { value: EntityType | ''; label: string }[] = [
    { value: '', label: '全部类型' },
    { value: 'coursePack', label: '课包' },
    { value: 'attendance', label: '签到' },
    { value: 'substitute', label: '代课' },
    { value: 'leave', label: '请假' },
    { value: 'freeze', label: '冻结' },
    { value: 'revenue', label: '收入' },
  ];

  const actions: { value: string; label: string }[] = [
    { value: '', label: '全部操作' },
    { value: 'create', label: '创建' },
    { value: 'update', label: '修改' },
    { value: 'delete', label: '删除' },
    { value: 'confirm', label: '确认' },
  ];

  const stats = useMemo(() => {
    const total = auditLogs.length;
    const today = auditLogs.filter(
      (log) => new Date(log.timestamp).toDateString() === new Date().toDateString()
    ).length;
    const byEntity = entityTypes.slice(1).map((et) => ({
      type: et.value,
      label: et.label,
      count: auditLogs.filter((log) => log.entityType === et.value).length,
    }));

    return { total, today, byEntity };
  }, [auditLogs]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">审计日志</h1>
          <p className="text-gray-500">完整记录系统中所有数据变更的操作历史</p>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总记录数</p>
                <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">今日新增</p>
                <p className="text-2xl font-bold text-gray-800">{stats.today}</p>
              </div>
            </div>
          </div>
          {stats.byEntity.slice(0, 3).map((item) => {
            const config: Record<string, { color: string; bgColor: string }> = {
              coursePack: { color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
              attendance: { color: 'text-blue-600', bgColor: 'bg-blue-100' },
              substitute: { color: 'text-orange-600', bgColor: 'bg-orange-100' },
            };
            const c = config[item.type] || { color: 'text-gray-600', bgColor: 'bg-gray-100' };
            return (
              <div key={item.type} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${c.bgColor} flex items-center justify-center`}>
                    <Tag className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{item.count}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                操作记录
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({filteredLogs.length}条)
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="搜索操作..."
                    className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent w-64"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  筛选
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      实体类型
                    </label>
                    <select
                      value={filterEntityType}
                      onChange={(e) => setFilterEntityType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {entityTypes.map((et) => (
                        <option key={et.value} value={et.value}>
                          {et.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      操作类型
                    </label>
                    <select
                      value={filterAction}
                      onChange={(e) => setFilterAction(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    >
                      {actions.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <AuditTimeline logs={filteredLogs} title="" />
          </div>

          <div className="col-span-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="font-semibold text-gray-800 mb-4">审计说明</h3>
              <div className="space-y-4 text-sm">
                <div className="p-3 bg-teal-50 rounded-lg">
                  <h4 className="font-medium text-teal-800 mb-1">课包相关</h4>
                  <p className="text-teal-700 text-xs">
                    记录课包的创建、修改、冻结、解冻等操作，包含课时变更和状态变化。
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-1">签到课消</h4>
                  <p className="text-blue-700 text-xs">
                    记录签到状态变更、课消确认操作，关联代课和请假记录。
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-1">代课记录</h4>
                  <p className="text-orange-700 text-xs">
                    记录老师代课安排，包含原老师、代课老师及原因说明。
                  </p>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <h4 className="font-medium text-amber-800 mb-1">请假记录</h4>
                  <p className="text-amber-700 text-xs">
                    记录学员请假申请，包含请假原因和补课安排。
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg">
                  <h4 className="font-medium text-emerald-800 mb-1">收入确认</h4>
                  <p className="text-emerald-700 text-xs">
                    记录收入确认操作，按期统计收入确认金额。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
