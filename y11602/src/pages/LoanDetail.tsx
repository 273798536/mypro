import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, CreditCard, Shield, FileCheck, Bell, History, Plus, Trash2, Phone, MessageSquare, Home, AlertTriangle } from 'lucide-react';
import { useApp } from '../store/AppContext';
import StatusBadge from '../components/common/StatusBadge';
import AnomalyBadge from '../components/common/AnomalyBadge';
import { formatDate, formatDateTime, calculateDaysToExpiry, generateId } from '../utils/dateUtils';
import { deduplicateReminders, getReminderTypeLabel } from '../utils/reminderUtils';
import type { ReminderType } from '../types';

const tabs = [
  { id: 'basic', label: '基本信息', icon: User },
  { id: 'repayment', label: '还款流水', icon: CreditCard },
  { id: 'guarantee', label: '担保状态', icon: Shield },
  { id: 'approval', label: '审批历史', icon: FileCheck },
  { id: 'reminder', label: '催办记录', icon: Bell },
  { id: 'audit', label: '修正痕迹', icon: History },
];

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState('basic');
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    type: 'phone' as ReminderType,
    content: '',
    operator: '客户经理'
  });
  
  const customer = useMemo(() => state.customers.find(c => c.id === id), [state.customers, id]);
  const customerRepayments = useMemo(() => state.repayments.filter(r => r.customerId === id), [state.repayments, id]);
  const customerGuarantees = useMemo(() => state.guarantees.filter(g => g.customerId === id), [state.guarantees, id]);
  const customerApprovals = useMemo(() => state.approvals.filter(a => a.customerId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [state.approvals, id]);
  const customerReminders = useMemo(() => deduplicateReminders(state.reminders.filter(r => r.customerId === id)), [state.reminders, id]);
  const customerAuditLogs = useMemo(() => state.auditLogs.filter(l => l.customerId === id).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [state.auditLogs, id]);
  
  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">客户不存在</p>
        <Link to="/loans" className="btn-primary mt-4">返回清单</Link>
      </div>
    );
  }
  
  const daysToExpiry = calculateDaysToExpiry(customer.expiryDate);
  
  const handleAddReminder = () => {
    if (!reminderForm.content.trim()) return;
    
    const newReminder = {
      id: generateId(),
      customerId: customer.id,
      type: reminderForm.type,
      content: reminderForm.content,
      operator: reminderForm.operator,
      timestamp: new Date().toISOString(),
      source: '手动录入'
    };
    
    dispatch({ type: 'ADD_REMINDER', payload: newReminder });
    dispatch({
      type: 'ADD_AUDIT_LOG',
      payload: {
        id: generateId(),
        customerId: customer.id,
        field: 'reminders',
        oldValue: '',
        newValue: `${getReminderTypeLabel(reminderForm.type)}催办：${reminderForm.content}`,
        operator: reminderForm.operator,
        timestamp: new Date().toISOString(),
        reason: '新增催办记录'
      }
    });
    
    setReminderForm({ type: 'phone', content: '', operator: '客户经理' });
    setShowAddReminder(false);
  };
  
  const handleDeleteCustomer = () => {
    if (confirm(`确定要删除客户「${customer.name}」的所有数据吗？此操作不可恢复。`)) {
      dispatch({ type: 'DELETE_CUSTOMER', payload: customer.id });
      navigate('/loans');
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/loans" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-500 text-sm">{customer.idCard}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={customer.status} />
          <button onClick={handleDeleteCustomer} className="btn-danger gap-2">
            <Trash2 size={16} />
            删除客户
          </button>
        </div>
      </div>
      
      {customer.anomalies.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-medium mb-3">
            <AlertTriangle size={20} />
            检测到 {customer.anomalies.length} 项异常，请及时处理
          </div>
          <div className="grid gap-2">
            {customer.anomalies.map((anomaly, i) => (
              <AnomalyBadge key={i} anomaly={anomaly} />
            ))}
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-gray-500 text-sm">授信额度</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">¥{customer.creditAmount.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-500 text-sm">授信起始日</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{formatDate(customer.startDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-500 text-sm">授信到期日</p>
          <p className="text-xl font-semibold text-gray-900 mt-1">{formatDate(customer.expiryDate)}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-500 text-sm">剩余天数</p>
          <p className={`text-2xl font-bold mt-1 ${
            daysToExpiry <= 0 ? 'text-red-600' :
            daysToExpiry <= 7 ? 'text-orange-600' :
            daysToExpiry <= 30 ? 'text-amber-600' :
            'text-green-600'
          }`}>
            {daysToExpiry <= 0 ? `已过期 ${Math.abs(daysToExpiry)} 天` : `${daysToExpiry} 天`}
          </p>
        </div>
      </div>
      
      <div className="card">
        <div className="border-b border-gray-100">
          <nav className="flex">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">客户基本信息</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">客户名称</dt>
                    <dd className="font-medium text-gray-900">{customer.name}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">身份证号</dt>
                    <dd className="font-medium font-mono text-gray-900">{customer.idCard}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">数据来源</dt>
                    <dd className="font-medium text-gray-900">{customer.source}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">创建时间</dt>
                    <dd className="font-medium text-gray-900">{formatDateTime(customer.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-500">更新时间</dt>
                    <dd className="font-medium text-gray-900">{formatDateTime(customer.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">授信信息</h3>
                <dl className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">授信额度</dt>
                    <dd className="font-medium text-gray-900">¥{customer.creditAmount.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">授信起始日</dt>
                    <dd className="font-medium text-gray-900">{formatDate(customer.startDate)}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">授信到期日</dt>
                    <dd className="font-medium text-gray-900">{formatDate(customer.expiryDate)}</dd>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <dt className="text-gray-500">当前状态</dt>
                    <dd><StatusBadge status={customer.status} /></dd>
                  </div>
                  <div className="flex justify-between py-2">
                    <dt className="text-gray-500">异常数量</dt>
                    <dd className="font-medium text-gray-900">{customer.anomalies.length} 项</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
          
          {activeTab === 'repayment' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">还款流水记录</h3>
              {customerRepayments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无还款流水记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="table-header">月份</th>
                        <th className="table-header">还款金额</th>
                        <th className="table-header">状态</th>
                        <th className="table-header">数据来源</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customerRepayments.map(r => (
                        <tr key={r.id} className={r.status === 'missing' ? 'bg-red-50' : ''}>
                          <td className="table-cell font-medium">{r.month}</td>
                          <td className="table-cell">
                            {r.status === 'missing' ? '-' : `¥${r.amount.toLocaleString()}`}
                          </td>
                          <td className="table-cell">
                            {r.status === 'normal' && <span className="status-badge status-normal">正常</span>}
                            {r.status === 'overdue' && <span className="status-badge status-warning">逾期</span>}
                            {r.status === 'missing' && <span className="status-badge status-expired">缺失</span>}
                          </td>
                          <td className="table-cell text-gray-500 text-sm">{r.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'guarantee' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">担保信息</h3>
              {customerGuarantees.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无担保信息</p>
              ) : (
                <div className="space-y-4">
                  {customerGuarantees.map(g => (
                    <div key={g.id} className={`p-4 rounded-xl border ${
                      g.status === 'expired' ? 'bg-red-50 border-red-200' :
                      g.status === 'expiring_soon' ? 'bg-amber-50 border-amber-200' :
                      'bg-gray-50 border-gray-100'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="font-medium text-gray-900">
                            {g.type === 'mortgage' ? '抵押' : g.type === 'pledge' ? '质押' : '保证'}担保
                          </span>
                          <span className={`ml-2 status-badge ${
                            g.status === 'valid' ? 'status-normal' :
                            g.status === 'expiring_soon' ? 'status-warning' :
                            'status-expired'
                          }`}>
                            {g.status === 'valid' ? '有效' : g.status === 'expiring_soon' ? '即将到期' : '已过期'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">来源：{g.source}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">担保人/物：</span>
                          <span className="font-medium">{g.guarantor}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">担保期限：</span>
                          <span className="font-medium">{formatDate(g.startDate)} 至 {formatDate(g.expiryDate)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'approval' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">审批历史</h3>
              {customerApprovals.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无审批记录</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                  <div className="space-y-6">
                    {customerApprovals.map(a => (
                      <div key={a.id} className={`relative pl-10 ${a.isWithdrawn ? 'opacity-60' : ''}`}>
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                          a.isWithdrawn ? 'bg-purple-100 border-purple-400' :
                          a.result === 'approved' ? 'bg-green-100 border-green-400' :
                          a.result === 'rejected' ? 'bg-red-100 border-red-400' :
                          'bg-amber-100 border-amber-400'
                        }`} />
                        <div className={`p-4 rounded-xl ${
                          a.isWithdrawn ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{a.stage}</span>
                            <div className="flex items-center gap-2">
                              {a.isWithdrawn && (
                                <span className="status-badge status-abnormal">已撤回</span>
                              )}
                              <span className={`status-badge ${
                                a.result === 'approved' ? 'status-normal' :
                                a.result === 'rejected' ? 'status-expired' :
                                'status-warning'
                              }`}>
                                {a.result === 'approved' ? '通过' : a.result === 'rejected' ? '拒绝' : a.result === 'withdrawn' ? '撤回' : '待审批'}
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-700 mb-2">{a.opinion}</p>
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>操作人：{a.operator}</span>
                            <span>{formatDateTime(a.timestamp)}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">来源：{a.source}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'reminder' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">催办记录</h3>
                <button onClick={() => setShowAddReminder(true)} className="btn-primary gap-2">
                  <Plus size={16} />
                  新增催办
                </button>
              </div>
              
              {showAddReminder && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-3">新增催办记录</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">催办方式</label>
                      <select
                        value={reminderForm.type}
                        onChange={(e) => setReminderForm(f => ({ ...f, type: e.target.value as ReminderType }))}
                        className="input-field"
                      >
                        <option value="phone">电话</option>
                        <option value="sms">短信</option>
                        <option value="visit">上门</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
                      <input
                        type="text"
                        value={reminderForm.operator}
                        onChange={(e) => setReminderForm(f => ({ ...f, operator: e.target.value }))}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">催办内容</label>
                    <textarea
                      value={reminderForm.content}
                      onChange={(e) => setReminderForm(f => ({ ...f, content: e.target.value }))}
                      className="input-field min-h-24"
                      placeholder="请输入催办内容..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowAddReminder(false)} className="btn-secondary">取消</button>
                    <button onClick={handleAddReminder} className="btn-primary">保存</button>
                  </div>
                </div>
              )}
              
              {customerReminders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无催办记录</p>
              ) : (
                <div className="space-y-3">
                  {customerReminders.map(r => (
                    <div key={r.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className={`p-2 rounded-lg ${
                        r.type === 'phone' ? 'bg-blue-100 text-blue-600' :
                        r.type === 'sms' ? 'bg-green-100 text-green-600' :
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {r.type === 'phone' && <Phone size={20} />}
                        {r.type === 'sms' && <MessageSquare size={20} />}
                        {r.type === 'visit' && <Home size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">
                            {getReminderTypeLabel(r.type)}催办
                          </span>
                          <span className="text-sm text-gray-500">{formatDateTime(r.timestamp)}</span>
                        </div>
                        <p className="text-gray-700">{r.content}</p>
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                          <span>操作人：{r.operator}</span>
                          <span>来源：{r.source}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'audit' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">修正痕迹</h3>
              {customerAuditLogs.length === 0 ? (
                <p className="text-gray-500 text-center py-8">暂无修正记录</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="table-header">修改字段</th>
                        <th className="table-header">原值</th>
                        <th className="table-header">新值</th>
                        <th className="table-header">修改原因</th>
                        <th className="table-header">操作人</th>
                        <th className="table-header">时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {customerAuditLogs.map(log => (
                        <tr key={log.id}>
                          <td className="table-cell font-medium">{log.field}</td>
                          <td className="table-cell text-red-600 font-mono text-sm max-w-32 truncate" title={log.oldValue}>
                            {log.oldValue || '-'}
                          </td>
                          <td className="table-cell text-green-600 font-mono text-sm max-w-32 truncate" title={log.newValue}>
                            {log.newValue}
                          </td>
                          <td className="table-cell text-gray-700">{log.reason}</td>
                          <td className="table-cell">{log.operator}</td>
                          <td className="table-cell text-gray-500 text-sm">{formatDateTime(log.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
