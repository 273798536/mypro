import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Users, Calendar, Building, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataGroup, VisitStatus } from '@/types';

type TabType = 'visits' | 'windows' | 'holidays';

const statusLabels: Record<VisitStatus, string> = {
  appointed: '已预约',
  walkIn: '现场取号',
  noShow: '预约爽约',
  served: '已办理'
};

const groupColors: Record<DataGroup, string> = {
  normal: 'bg-green-100 text-green-700 border-green-200',
  boundary: 'bg-amber-100 text-amber-700 border-amber-200',
  badInput: 'bg-red-100 text-red-700 border-red-200'
};

const groupLabels: Record<DataGroup, string> = {
  normal: '正常数据',
  boundary: '边界值',
  badInput: '坏输入'
};

export default function DataInput() {
  const [activeTab, setActiveTab] = useState<TabType>('visits');
  const [groupFilter, setGroupFilter] = useState<DataGroup | 'all'>('all');
  const { visits, windows, holidays, getGroupedVisits } = useStore();

  const grouped = getGroupedVisits();

  const filteredVisits = groupFilter === 'all' 
    ? visits 
    : visits.filter(v => v.dataGroup === groupFilter);

  function formatTime(date: Date) {
    return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' });
  }

  const tabs = [
    { id: 'visits' as TabType, label: '到访记录', icon: Users, count: visits.length },
    { id: 'windows' as TabType, label: '窗口班次', icon: Building, count: windows.length },
    { id: 'holidays' as TabType, label: '节假日设置', icon: Calendar, count: holidays.length },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {activeTab === 'visits' && (
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-600">数据分组筛选：</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGroupFilter('all')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      groupFilter === 'all'
                        ? 'bg-slate-700 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    )}
                  >
                    全部 ({visits.length})
                  </button>
                  <button
                    onClick={() => setGroupFilter('normal')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      groupFilter === 'normal'
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-green-600 hover:bg-green-50 border border-green-200'
                    )}
                  >
                    正常 ({grouped.normal.length})
                  </button>
                  <button
                    onClick={() => setGroupFilter('boundary')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      groupFilter === 'boundary'
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-amber-600 hover:bg-amber-50 border border-amber-200'
                    )}
                  >
                    边界值 ({grouped.boundary.length})
                  </button>
                  <button
                    onClick={() => setGroupFilter('badInput')}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                      groupFilter === 'badInput'
                        ? 'bg-red-500 text-white'
                        : 'bg-white text-red-600 hover:bg-red-50 border border-red-200'
                    )}
                  >
                    坏输入 ({grouped.badInput.length})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">访客ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">到达时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">预约时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">服务时长</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">数据分组</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {visit.visitorId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {formatTime(visit.arriveTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {visit.appointmentTime ? formatTime(visit.appointmentTime) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full',
                          visit.status === 'noShow' ? 'bg-red-100 text-red-700' :
                          visit.status === 'served' ? 'bg-green-100 text-green-700' :
                          visit.status === 'appointed' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        )}>
                          {statusLabels[visit.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {visit.serviceDuration > 0 ? `${visit.serviceDuration} 分钟` : (
                          <span className="text-red-600">{visit.serviceDuration} 分钟</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={cn(
                          'px-2.5 py-1 text-xs font-medium rounded-full border flex items-center gap-1 w-fit',
                          groupColors[visit.dataGroup]
                        )}>
                          {visit.dataGroup === 'normal' && <CheckCircle className="w-3 h-3" />}
                          {visit.dataGroup === 'boundary' && <AlertTriangle className="w-3 h-3" />}
                          {visit.dataGroup === 'badInput' && <XCircle className="w-3 h-3" />}
                          {groupLabels[visit.dataGroup]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {visit.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'windows' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">窗口编号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">开始时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">结束时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">日处理能力</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">临时关闭</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">关闭时段</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {windows.map((window) => (
                  <tr key={window.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-blue-600">窗口 {window.windowNo}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatTime(window.startTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {formatTime(window.endTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {window.capacity} 人
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'px-2.5 py-1 text-xs font-medium rounded-full',
                        window.isTemporaryClosed
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      )}>
                        {window.isTemporaryClosed ? '是' : '否'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {window.isTemporaryClosed && window.closeStartTime && window.closeEndTime
                        ? `${formatTime(window.closeStartTime)} - ${formatTime(window.closeEndTime)}`
                        : '-'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="p-6">
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-4">
              {holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className={cn(
                    'p-4 rounded-xl border-2 text-center transition-all hover:shadow-md',
                    holiday.type === 'workday' ? 'bg-white border-slate-200' :
                    holiday.type === 'weekend' ? 'bg-blue-50 border-blue-200' :
                    'bg-red-50 border-red-200'
                  )}
                >
                  <div className="text-2xl font-bold text-slate-800">
                    {new Date(holiday.date).getDate()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatDate(holiday.date)}
                  </div>
                  <div className={cn(
                    'mt-2 text-xs font-medium px-2 py-1 rounded-full',
                    holiday.type === 'workday' ? 'bg-slate-100 text-slate-600' :
                    holiday.type === 'weekend' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {holiday.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-700">{grouped.normal.length}</div>
              <div className="text-sm text-green-600">正常数据记录</div>
              <div className="text-xs text-green-500 mt-1">参与排队模拟计算</div>
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-700">{grouped.boundary.length}</div>
              <div className="text-sm text-amber-600">边界值数据</div>
              <div className="text-xs text-amber-500 mt-1">单独分组，可选参与实验</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-700">{grouped.badInput.length}</div>
              <div className="text-sm text-red-600">坏输入数据</div>
              <div className="text-xs text-red-500 mt-1">不参与计算，仅作展示</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
