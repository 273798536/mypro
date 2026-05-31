import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import DataCard from '@/components/DataCard';
import Modal from '@/components/Modal';

import { formatCurrency, formatDateStr } from '@/utils/format';
import { CHANNELS } from '@/types';
import type { Cost } from '@/types';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2,
  AlertCircle,
  Film
} from 'lucide-react';

export default function CostPage() {
  const navigate = useNavigate();
  const { costs, series, addCost, updateCost, deleteCost, getSeriesById } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    seriesId: '',
    channel: CHANNELS[0],
    costDate: new Date().toISOString().split('T')[0],
    amount: 0,
    isDelayed: false,
    remark: '',
  });
  
  const stats = useMemo(() => {
    const total = costs.reduce((sum, c) => sum + c.amount, 0);
    const today = new Date().toISOString().split('T')[0];
    const todayTotal = costs
      .filter(c => c.costDate === today)
      .reduce((sum, c) => sum + c.amount, 0);
    const delayedCount = costs.filter(c => c.isDelayed).length;
    
    return { total, todayTotal, delayedCount };
  }, [costs]);
  
  const filteredCosts = useMemo(() => {
    return costs
      .filter(cost => {
        const seriesData = getSeriesById(cost.seriesId);
        const matchesSearch = seriesData?.name.includes(searchTerm) ?? false;
        const matchesSeries = seriesFilter === 'all' || cost.seriesId === seriesFilter;
        const matchesChannel = channelFilter === 'all' || cost.channel === channelFilter;
        return matchesSearch && matchesSeries && matchesChannel;
      })
      .sort((a, b) => new Date(b.costDate).getTime() - new Date(a.costDate).getTime());
  }, [costs, searchTerm, seriesFilter, channelFilter, getSeriesById]);
  
  const activeSeries = series.filter(s => s.status === 'active');
  
  const resetForm = () => {
    setFormData({
      seriesId: '',
      channel: CHANNELS[0],
      costDate: new Date().toISOString().split('T')[0],
      amount: 0,
      isDelayed: false,
      remark: '',
    });
    setEditingCost(null);
  };
  
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };
  
  const openEditModal = (cost: Cost) => {
    setEditingCost(cost);
    setFormData({
      seriesId: cost.seriesId,
      channel: cost.channel,
      costDate: cost.costDate,
      amount: cost.amount,
      isDelayed: cost.isDelayed,
      remark: cost.remark,
    });
    setShowAddModal(true);
  };
  
  const handleSubmit = () => {
    if (!formData.seriesId || !formData.amount) return;
    
    if (editingCost) {
      const updates: Partial<Cost> = {};
      if (formData.seriesId !== editingCost.seriesId) updates.seriesId = formData.seriesId;
      if (formData.channel !== editingCost.channel) updates.channel = formData.channel;
      if (formData.costDate !== editingCost.costDate) updates.costDate = formData.costDate;
      if (formData.amount !== editingCost.amount) updates.amount = formData.amount;
      if (formData.isDelayed !== editingCost.isDelayed) updates.isDelayed = formData.isDelayed;
      if (formData.remark !== editingCost.remark) updates.remark = formData.remark;
      
      if (Object.keys(updates).length > 0) {
        updateCost(editingCost.id, updates);
      }
    } else {
      addCost(formData);
    }
    
    setShowAddModal(false);
    resetForm();
  };
  
  const handleDelete = (id: string) => {
    deleteCost(id);
    setShowDeleteConfirm(null);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">投流消耗</h1>
          <p className="text-gray-500 mt-1">管理投流消耗记录，追踪延迟消耗</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus className="w-4 h-4" />
          新增消耗
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard
          title="累计消耗"
          value={formatCurrency(stats.total)}
          icon={TrendingUp}
          iconBg="bg-red-50"
          className="animate-stagger-1"
        />
        <DataCard
          title="今日消耗"
          value={formatCurrency(stats.todayTotal)}
          icon={Calendar}
          iconBg="bg-blue-50"
          className="animate-stagger-2"
        />
        <DataCard
          title="延迟消耗笔数"
          value={stats.delayedCount}
          icon={Clock}
          iconBg="bg-amber-50"
          className="animate-stagger-3"
        />
      </div>
      
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 font-serif">消耗记录</h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索剧集名称..."
                className="input pl-10 w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                className="input w-32"
                value={seriesFilter}
                onChange={e => setSeriesFilter(e.target.value)}
              >
                <option value="all">全部剧集</option>
                {activeSeries.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input w-32"
                value={channelFilter}
                onChange={e => setChannelFilter(e.target.value)}
              >
                <option value="all">全部渠道</option>
                {CHANNELS.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">日期</th>
                <th className="table-header">剧集名称</th>
                <th className="table-header">投放渠道</th>
                <th className="table-header">消耗金额</th>
                <th className="table-header">状态</th>
                <th className="table-header">备注</th>
                <th className="table-header">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCosts.map(cost => {
                const seriesData = getSeriesById(cost.seriesId);
                
                return (
                  <tr 
                    key={cost.id} 
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      cost.isDelayed ? 'bg-amber-50/50' : ''
                    }`}
                  >
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {formatDateStr(cost.costDate)}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Film className="w-4 h-4 text-primary-600" />
                        </div>
                        <span 
                          className="font-medium text-primary-600 hover:text-primary-700 cursor-pointer"
                          onClick={() => navigate(`/series/${cost.seriesId}`)}
                        >
                          {seriesData?.name || '未知'}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-600">{cost.channel}</td>
                    <td className="table-cell font-semibold text-red-600">
                      -{formatCurrency(cost.amount)}
                    </td>
                    <td className="table-cell">
                      {cost.isDelayed ? (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse-soft" />
                          <span className="text-amber-600 font-medium text-sm">消耗延迟</span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 text-sm font-medium">正常</span>
                      )}
                    </td>
                    <td className="table-cell text-gray-500 text-sm max-w-xs truncate">
                      {cost.remark || '-'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          onClick={() => openEditModal(cost)}
                        >
                          <Edit className="w-4 h-4 text-gray-400" />
                        </button>
                        <button
                          className="p-1.5 hover:bg-red-50 rounded transition-colors"
                          onClick={() => setShowDeleteConfirm(cost.id)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredCosts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无消耗记录</p>
              <p className="text-sm mt-1">点击右上角"新增消耗"开始</p>
            </div>
          )}
        </div>
      </div>
      
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingCost ? '编辑消耗记录' : '新增消耗记录'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">选择剧集 *</label>
            <select
              className="input"
              value={formData.seriesId}
              onChange={e => setFormData(prev => ({ ...prev, seriesId: e.target.value }))}
            >
              <option value="">请选择剧集</option>
              {activeSeries.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="label">投放渠道</label>
            <select
              className="input"
              value={formData.channel}
              onChange={e => setFormData(prev => ({ ...prev, channel: e.target.value }))}
            >
              {CHANNELS.map(ch => (
                <option key={ch} value={ch}>{ch}</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">消耗日期</label>
              <input
                type="date"
                className="input"
                value={formData.costDate}
                onChange={e => setFormData(prev => ({ ...prev, costDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">消耗金额（元）*</label>
              <input
                type="number"
                className="input"
                placeholder="请输入金额"
                value={formData.amount || ''}
                onChange={e => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDelayed"
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
              checked={formData.isDelayed}
              onChange={e => setFormData(prev => ({ ...prev, isDelayed: e.target.checked }))}
            />
            <label htmlFor="isDelayed" className="text-sm text-gray-600">
              是否延迟（标记后会高亮显示）
            </label>
          </div>
          
          <div>
            <label className="label">备注</label>
            <textarea
              className="input min-h-24 resize-none"
              placeholder="请输入备注信息"
              value={formData.remark}
              onChange={e => setFormData(prev => ({ ...prev, remark: e.target.value }))}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn-secondary"
              onClick={() => setShowAddModal(false)}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!formData.seriesId || !formData.amount}
            >
              {editingCost ? '保存修改' : '创建记录'}
            </button>
          </div>
        </div>
      </Modal>
      
      <Modal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        title="确认删除"
        width="max-w-md"
      >
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-gray-800 mb-2">确定要删除这条消耗记录吗？</p>
          <p className="text-sm text-gray-500 mb-6">
            删除后相关测算结果将被标记为过时，需要重新测算。
          </p>
          <div className="flex justify-center gap-3">
            <button
              className="btn-secondary"
              onClick={() => setShowDeleteConfirm(null)}
            >
              取消
            </button>
            <button
              className="btn-danger"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
