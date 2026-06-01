import { useNavigate } from 'react-router-dom';
import { Lock, Route, Users, ChevronRight, ClipboardCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import BuildingTopology from '@/components/BuildingTopology';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { anomalies, workOrders, inspectors, buildings } = useStore();

  const accessClosedCount = anomalies.filter(a => a.type === 'access_closed' && !a.resolved).length;
  const routeBreakCount = anomalies.filter(a => a.type === 'route_break' && !a.resolved).length;
  const duplicateCount = anomalies.filter(a => a.type === 'duplicate_inspection' && !a.resolved).length;

  const pendingOrders = workOrders.filter(wo => wo.status === 'pending').length;
  const inProgressOrders = workOrders.filter(wo => wo.status === 'in_progress').length;
  const completedOrders = workOrders.filter(wo => wo.status === 'completed').length;
  const onDutyInspectors = inspectors.filter(i => i.onDuty).length;

  const alertCards = [
    {
      type: 'access_closed' as const,
      title: '门禁关闭',
      count: accessClosedCount,
      icon: Lock,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-600',
      iconBg: 'bg-red-500',
    },
    {
      type: 'route_break' as const,
      title: '路线断点',
      count: routeBreakCount,
      icon: Route,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-600',
      iconBg: 'bg-orange-500',
    },
    {
      type: 'duplicate_inspection' as const,
      title: '人员重复',
      count: duplicateCount,
      icon: Users,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-600',
      iconBg: 'bg-yellow-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {alertCards.map((card) => (
          <div
            key={card.type}
            className={cn(
              'p-5 rounded-xl border-l-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',
              card.bgColor,
              card.borderColor
            )}
            onClick={() => navigate('/anomalies')}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={cn('text-sm font-medium', card.textColor)}>{card.title}</div>
                <div className={cn('text-3xl font-bold mt-2', card.count > 0 ? 'animate-pulse' : '')}>
                  {card.count}
                </div>
                <div className="text-xs text-slate-500 mt-1">处待处理异常</div>
              </div>
              <div className={cn('p-3 rounded-lg', card.iconBg)}>
                <card.icon size={28} className="text-white" />
              </div>
            </div>
            <div className="flex items-center justify-end mt-3">
              <span className="text-xs text-slate-500">查看详情</span>
              <ChevronRight size={16} className="text-slate-400" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ClipboardCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{pendingOrders}</div>
              <div className="text-xs text-slate-500">待处理工单</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle size={20} className="text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{inProgressOrders}</div>
              <div className="text-xs text-slate-500">进行中工单</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <ClipboardCheck size={20} className="text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{completedOrders}</div>
              <div className="text-xs text-slate-500">已完成工单</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <UserCheck size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">{onDutyInspectors}/{inspectors.length}</div>
              <div className="text-xs text-slate-500">在岗巡检员</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">楼栋巡检路线图</h2>
            <button
              onClick={() => navigate('/building-map')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              查看完整路线图 <ChevronRight size={16} />
            </button>
          </div>
          <div className="p-4">
            <BuildingTopology compact />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800">异常明细</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {anomalies.filter(a => !a.resolved).slice(0, 5).map((anomaly) => {
              const card = alertCards.find(c => c.type === anomaly.type);
              const buildingName = buildings.find(b => b.id === anomaly.sourceIds[0])?.name || '';
              return (
                <div key={anomaly.id} className="p-4 hover:bg-slate-50 cursor-pointer" onClick={() => navigate('/anomalies')}>
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg flex-shrink-0', card?.iconBg)}>
                      {card?.icon && <card.icon size={16} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{anomaly.description}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        来源: {buildingName} | {anomaly.detectedAt}
                      </div>
                      <div className={cn('text-xs mt-1 inline-block px-2 py-0.5 rounded', card?.bgColor, card?.textColor)}>
                        {anomaly.level === 'high' ? '高优先级' : anomaly.level === 'medium' ? '中优先级' : '低优先级'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {anomalies.filter(a => !a.resolved).length === 0 && (
              <div className="p-8 text-center text-slate-500">
                暂无异常
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">今日工单概览</h2>
          <button
            onClick={() => navigate('/work-orders')}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            查看全部 <ChevronRight size={16} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">工单编号</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">楼栋</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">类型</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">巡检员</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">计划时间</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">来源</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workOrders.slice(0, 5).map((wo) => {
                const building = buildings.find(b => b.id === wo.buildingId);
                const inspector = inspectors.find(i => i.id === wo.inspectorId);
                return (
                  <tr key={wo.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{wo.id.toUpperCase()}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{building?.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">
                      {wo.type === 'routine' ? '日常巡检' : wo.type === 'repair' ? '维修工单' : '专项检查'}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{inspector?.name}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{wo.scheduledTime}</td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        wo.source === 'system' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      )}>
                        {wo.source === 'system' ? '系统派单' : '人工插单'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        wo.status === 'pending' ? 'bg-slate-100 text-slate-700' :
                        wo.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        wo.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}>
                        {wo.status === 'pending' ? '待处理' : wo.status === 'in_progress' ? '进行中' : wo.status === 'completed' ? '已完成' : '已取消'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
