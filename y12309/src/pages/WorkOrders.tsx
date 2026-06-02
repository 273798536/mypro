import { useState } from 'react';
import { Search, Filter, Eye, CheckCircle, Clock, XCircle, AlertCircle, Plus, X } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import type { WorkOrderStatus, WorkOrderSource, WorkOrderType } from '@/types';

export default function WorkOrders() {
  const { workOrders, buildings, inspectors, updateWorkOrderStatus, addManualWorkOrder } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<WorkOrderSource | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formInspectorId, setFormInspectorId] = useState('');
  const [formType, setFormType] = useState<WorkOrderType>('routine');
  const [formDescription, setFormDescription] = useState('');
  const [formPriority, setFormPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [formScheduledTime, setFormScheduledTime] = useState('');

  const filteredOrders = workOrders.filter(wo => {
    const building = buildings.find(b => b.id === wo.buildingId);
    const inspector = inspectors.find(i => i.id === wo.inspectorId);
    const matchesSearch = !searchTerm || 
      building?.name.includes(searchTerm) ||
      inspector?.name.includes(searchTerm) ||
      wo.description.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || wo.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusIcon = (status: WorkOrderStatus) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-slate-500" />;
      case 'in_progress': return <AlertCircle size={16} className="text-blue-500" />;
      case 'completed': return <CheckCircle size={16} className="text-green-500" />;
      case 'cancelled': return <XCircle size={16} className="text-red-500" />;
    }
  };

  const getStatusLabel = (status: WorkOrderStatus) => {
    const labels = { pending: '待处理', in_progress: '进行中', completed: '已完成', cancelled: '已取消' };
    return labels[status];
  };

  const getTypeLabel = (type: WorkOrderType) => {
    const labels = { routine: '日常巡检', repair: '维修工单', inspection: '专项检查' };
    return labels[type];
  };

  const selectedWorkOrder = workOrders.find(wo => wo.id === selectedOrder);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">工单管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInsertModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            人工插单
          </button>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索工单..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as WorkOrderSource | 'all')}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">全部来源</option>
              <option value="system">系统派单</option>
              <option value="manual">人工插单</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">总工单</div>
          <div className="text-2xl font-bold text-slate-800 mt-1">{workOrders.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">待处理</div>
          <div className="text-2xl font-bold text-slate-600 mt-1">{workOrders.filter(w => w.status === 'pending').length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">进行中</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{workOrders.filter(w => w.status === 'in_progress').length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-sm text-slate-500">已完成</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{workOrders.filter(w => w.status === 'completed').length}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">工单编号</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">楼栋</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">类型</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">巡检员</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">计划时间</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">来源</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">优先级</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.map((wo) => {
              const building = buildings.find(b => b.id === wo.buildingId);
              const inspector = inspectors.find(i => i.id === wo.inspectorId);
              return (
                <tr key={wo.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 text-sm font-medium text-slate-800">{wo.id.toUpperCase()}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{building?.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{getTypeLabel(wo.type)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs"
                        style={{ backgroundColor: inspector?.avatarColor }}
                      >
                        {inspector?.name.charAt(0)}
                      </div>
                      <span className="text-sm text-slate-600">{inspector?.name}</span>
                    </div>
                  </td>
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
                      wo.priority === 'high' ? 'bg-red-100 text-red-700' :
                      wo.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    )}>
                      {wo.priority === 'high' ? '高' : wo.priority === 'medium' ? '中' : '低'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(wo.status)}
                      <span className="text-sm text-slate-600">{getStatusLabel(wo.status)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(wo.id)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye size={16} />
                      </button>
                      {wo.status === 'pending' && (
                        <button
                          onClick={() => updateWorkOrderStatus(wo.id, 'in_progress')}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="开始处理"
                        >
                          <AlertCircle size={16} />
                        </button>
                      )}
                      {wo.status === 'in_progress' && (
                        <button
                          onClick={() => updateWorkOrderStatus(wo.id, 'completed')}
                          className="p-1.5 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="完成工单"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredOrders.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            暂无匹配的工单
          </div>
        )}
      </div>

      {selectedWorkOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-slate-800">工单详情</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500">工单编号</div>
                  <div className="text-sm font-medium text-slate-800 mt-1">{selectedWorkOrder.id.toUpperCase()}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">状态</div>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedWorkOrder.status)}
                    <span className="text-sm text-slate-800">{getStatusLabel(selectedWorkOrder.status)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">楼栋</div>
                  <div className="text-sm text-slate-800 mt-1">{buildings.find(b => b.id === selectedWorkOrder.buildingId)?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">巡检员</div>
                  <div className="text-sm text-slate-800 mt-1">{inspectors.find(i => i.id === selectedWorkOrder.inspectorId)?.name}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">类型</div>
                  <div className="text-sm text-slate-800 mt-1">{getTypeLabel(selectedWorkOrder.type)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">来源</div>
                  <div className="text-sm text-slate-800 mt-1">{selectedWorkOrder.source === 'system' ? '系统派单' : '人工插单'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">计划时间</div>
                  <div className="text-sm text-slate-800 mt-1">{selectedWorkOrder.scheduledTime}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">优先级</div>
                  <div className="text-sm text-slate-800 mt-1">{selectedWorkOrder.priority === 'high' ? '高' : selectedWorkOrder.priority === 'medium' ? '中' : '低'}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">工单描述</div>
                <div className="text-sm text-slate-800 mt-1 p-3 bg-slate-50 rounded-lg">{selectedWorkOrder.description}</div>
              </div>
              {selectedWorkOrder.completedTime && (
                <div>
                  <div className="text-xs text-slate-500">完成时间</div>
                  <div className="text-sm text-slate-800 mt-1">{selectedWorkOrder.completedTime}</div>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-500 mb-2">数据溯源</div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>• 楼栋来源: 楼栋巡检图 - {buildings.find(b => b.id === selectedWorkOrder.buildingId)?.name}</div>
                  <div>• 巡检员来源: 排程中心 - {inspectors.find(i => i.id === selectedWorkOrder.inspectorId)?.name}</div>
                  <div>• 创建来源: {selectedWorkOrder.source === 'system' ? '系统自动派单' : '工程主管人工插单'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInsertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-lg text-slate-800">人工插单</h3>
              <button
                onClick={() => setShowInsertModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addManualWorkOrder({
                  buildingId: formBuildingId,
                  inspectorId: formInspectorId,
                  type: formType,
                  status: 'pending',
                  source: 'manual',
                  scheduledTime: formScheduledTime.replace('T', ' '),
                  description: formDescription,
                  priority: formPriority,
                });
                setShowInsertModal(false);
                setFormBuildingId('');
                setFormInspectorId('');
                setFormType('routine');
                setFormDescription('');
                setFormPriority('medium');
                setFormScheduledTime('');
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">楼栋</label>
                <select
                  value={formBuildingId}
                  onChange={(e) => setFormBuildingId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择楼栋</option>
                  {buildings.filter(b => b.accessOpen).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">巡检员</label>
                <select
                  value={formInspectorId}
                  onChange={(e) => setFormInspectorId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">请选择巡检员</option>
                  {inspectors.filter(i => i.onDuty).map(i => (
                    <option key={i.id} value={i.id}>{i.name} - {i.team}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工单类型</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as WorkOrderType)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="routine">日常巡检</option>
                  <option value="repair">维修工单</option>
                  <option value="inspection">专项检查</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">工单描述</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  placeholder="请输入工单描述"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">优先级</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value as 'low' | 'medium' | 'high')}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">计划时间</label>
                <input
                  type="datetime-local"
                  value={formScheduledTime}
                  onChange={(e) => setFormScheduledTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInsertModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  确认插单
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
