import { useState, useEffect } from 'react';
import {
  History,
  Download,
  GitBranch,
  TrendingUp,
  Calendar,
  Users,
  MapPin,
  FileSpreadsheet,
  Filter,
  Search,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useDataStore } from '../store/useDataStore';
import { useBookingStore } from '../store/useBookingStore';
import { useConflictStore } from '../store/useConflictStore';
import { useHistoryStore } from '../store/useHistoryStore';
import { ExportDialog } from '../components/review/ExportDialog';
import { formatDateTime, dayjsInstance } from '../utils/dateUtils';
import { conflictTypeNames } from '../data/sampleData';
import type { ChangeHistory } from '../types';

export function ReviewCenter() {
  const [activeTab, setActiveTab] = useState<'history' | 'statistics'>('history');
  const [showExport, setShowExport] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { rooms, bands, courses, loadFromStorage } = useDataStore();
  const { bookings } = useBookingStore();
  const { conflicts } = useConflictStore();
  const { changeHistories, loadFromStorage: loadHistory } = useHistoryStore();

  useEffect(() => {
    loadFromStorage();
    loadHistory();
  }, [loadFromStorage, loadHistory]);

  const actionTypeNames: Record<string, string> = {
    create: '创建预约',
    change_room: '更换排练室',
    adjust_time: '调整时间',
    resolve_conflict: '解决冲突',
    export: '导出数据',
  };

  const filteredHistories = changeHistories
    .filter(h => {
      if (actionFilter !== 'all' && h.actionType !== actionFilter) return false;
      if (search) {
        const band = bands.find(b => h.bookingId?.startsWith(b.id));
        const bandName = band?.name.toLowerCase() || '';
        const remark = h.remark?.toLowerCase() || '';
        return bandName.includes(search.toLowerCase()) ||
               remark.includes(search.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const statistics = {
    totalBookings: bookings.length,
    totalConflicts: conflicts.length,
    resolvedConflicts: conflicts.filter(c => c.resolved).length,
    conflictRate: bookings.length > 0
      ? ((conflicts.length / bookings.length) * 100).toFixed(1)
      : '0',
    totalChanges: changeHistories.length,
    roomChanges: changeHistories.filter(h => h.actionType === 'change_room').length,
  };

  const conflictTypeStats = Object.entries(
    conflicts.reduce((acc, c) => {
      acc[c.type] = (acc[c.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    type,
    name: conflictTypeNames[type] || type,
    count,
    percentage: conflicts.length > 0
      ? ((count / conflicts.length) * 100).toFixed(1)
      : '0',
  }));

  const actionTypeStats = Object.entries(
    changeHistories.reduce((acc, h) => {
      acc[h.actionType] = (acc[h.actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    type,
    name: actionTypeNames[type] || type,
    count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary-900">
            复盘中心
          </h1>
          <p className="text-primary-600 mt-1">
            查看操作历史、统计分析和数据导出
          </p>
        </div>
        <button
          onClick={() => setShowExport(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          导出全部日程
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-4 bg-gradient-to-br from-primary-50 to-primary-100/30">
          <div className="flex items-center gap-2 text-primary-600 text-sm mb-2">
            <Calendar className="w-4 h-4" />
            总预约数
          </div>
          <div className="text-2xl font-bold text-primary-900">
            {statistics.totalBookings}
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-conflict/5 to-conflict/10">
          <div className="flex items-center gap-2 text-conflict text-sm mb-2">
            <GitBranch className="w-4 h-4" />
            冲突总数
          </div>
          <div className="text-2xl font-bold text-conflict-dark">
            {statistics.totalConflicts}
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-success/5 to-success/10">
          <div className="flex items-center gap-2 text-success text-sm mb-2">
            <TrendingUp className="w-4 h-4" />
            已解决
          </div>
          <div className="text-2xl font-bold text-success-dark">
            {statistics.resolvedConflicts}
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-warning/5 to-warning/10">
          <div className="flex items-center gap-2 text-warning-dark text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            冲突率
          </div>
          <div className="text-2xl font-bold text-warning-dark">
            {statistics.conflictRate}%
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 text-primary-600 text-sm mb-2">
            <History className="w-4 h-4" />
            操作次数
          </div>
          <div className="text-2xl font-bold text-primary-900">
            {statistics.totalChanges}
          </div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 text-primary-600 text-sm mb-2">
            <MapPin className="w-4 h-4" />
            换房次数
          </div>
          <div className="text-2xl font-bold text-primary-900">
            {statistics.roomChanges}
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-primary-100">
        {[
          { id: 'history', label: '操作历史', icon: <History className="w-4 h-4" /> },
          { id: 'statistics', label: '统计分析', icon: <TrendingUp className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`
              flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
              ${activeTab === tab.id
                ? 'border-primary-500 text-primary-800 font-medium'
                : 'border-transparent text-primary-500 hover:text-primary-700'
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
              <input
                type="text"
                placeholder="搜索乐队或备注..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
              />
            </div>
            <div className="w-48">
              <select
                value={actionFilter}
                onChange={e => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 border border-primary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400"
              >
                <option value="all">全部操作类型</option>
                {Object.entries(actionTypeNames).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary-50 border-b border-primary-100">
                    <th className="text-left py-3 px-4 font-medium text-primary-600">时间</th>
                    <th className="text-left py-3 px-4 font-medium text-primary-600">操作类型</th>
                    <th className="text-left py-3 px-4 font-medium text-primary-600">预约</th>
                    <th className="text-left py-3 px-4 font-medium text-primary-600">变更字段</th>
                    <th className="text-left py-3 px-4 font-medium text-primary-600">变更内容</th>
                    <th className="text-left py-3 px-4 font-medium text-primary-600">操作员</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-primary-500">
                        <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>暂无操作记录</p>
                      </td>
                    </tr>
                  ) : (
                    filteredHistories.map((record: ChangeHistory) => {
                      const band = bands.find(b => record.bookingId?.startsWith(b.id));
                      const actionTypeInfo = {
                        create: { color: 'bg-success-light text-success-dark' },
                        change_room: { color: 'bg-primary-light text-primary-dark' },
                        adjust_time: { color: 'bg-warning-light text-warning-dark' },
                        resolve_conflict: { color: 'bg-success-light text-success-dark' },
                        export: { color: 'bg-primary-light text-primary-dark' },
                      }[record.actionType] || { color: 'bg-primary-light text-primary-dark' };

                      return (
                        <tr
                          key={record.id}
                          className="border-b border-primary-50 hover:bg-primary-50/50"
                        >
                          <td className="py-3 px-4 text-xs text-primary-500 whitespace-nowrap">
                            {formatDateTime(record.timestamp)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-medium px-2 py-1 rounded ${actionTypeInfo.color}`}>
                              {actionTypeNames[record.actionType] || record.actionType}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-primary-400" />
                              <span className="text-primary-800">
                                {band?.name || record.bookingId}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-primary-700">
                            {record.field || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {record.fromValue && record.toValue ? (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="line-through text-primary-400">
                                  {record.fromValue}
                                </span>
                                <ChevronRight className="w-3 h-3 text-primary-400" />
                                <span className="text-success-dark font-medium">
                                  {record.toValue}
                                </span>
                              </div>
                            ) : (
                              <span className="text-primary-500">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-primary-600">
                            {record.operator || '系统'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="font-serif text-lg font-semibold text-primary-900 mb-4">
              冲突类型分布
            </h3>
            <div className="space-y-4">
              {conflictTypeStats.length === 0 ? (
                <div className="text-center py-8 text-primary-500">
                  暂无冲突数据
                </div>
              ) : (
                conflictTypeStats.map(stat => (
                  <div key={stat.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-primary-700">{stat.name}</span>
                      <span className="text-sm font-medium text-primary-900">
                        {stat.count} ({stat.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-conflict rounded-full transition-all duration-500"
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-lg font-semibold text-primary-900 mb-4">
              操作类型分布
            </h3>
            <div className="space-y-4">
              {actionTypeStats.length === 0 ? (
                <div className="text-center py-8 text-primary-500">
                  暂无操作数据
                </div>
              ) : (
                actionTypeStats.map(stat => (
                  <div key={stat.type} className="flex items-center justify-between p-3 bg-primary-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        {{
                          create: <FileSpreadsheet className="w-5 h-5 text-primary-600" />,
                          change_room: <MapPin className="w-5 h-5 text-primary-600" />,
                          adjust_time: <Calendar className="w-5 h-5 text-primary-600" />,
                          resolve_conflict: <TrendingUp className="w-5 h-5 text-primary-600" />,
                          export: <Download className="w-5 h-5 text-primary-600" />,
                        }[stat.type] || <History className="w-5 h-5 text-primary-600" />}
                      </div>
                      <span className="text-primary-800">{stat.name}</span>
                    </div>
                    <span className="text-xl font-bold text-primary-900">
                      {String(stat.count)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-6 lg:col-span-2">
            <h3 className="font-serif text-lg font-semibold text-primary-900 mb-4">
              排练室使用统计
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {rooms.map(room => {
                const roomBookings = bookings.filter(b => b.roomId === room.id);
                const roomConflicts = conflicts.filter(c => c.roomId === room.id);
                return (
                  <div key={room.id} className="bg-primary-50 rounded-xl p-4">
                    <div className="text-lg font-bold text-primary-900 mb-1">
                      {room.name}
                    </div>
                    <div className="text-xs text-primary-600 mb-3">
                      容量 {room.capacity}人
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-primary-500">预约次数</span>
                        <span className="font-medium text-primary-800">{roomBookings.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-primary-500">冲突次数</span>
                        <span className="font-medium text-conflict">{roomConflicts.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showExport && (
        <ExportDialog onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
