import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { formatCurrency, formatDateStr } from '@/utils/format';
import { getCurrentOperator } from '@/engine/changeTracker';
import { SERIES_STATUS_LABELS, CHANNELS } from '@/types';
import type { Series, SeriesStatus } from '@/types';
import { 
  Film, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronRight,
  Layers,
  User,
  CalendarDays,
  DollarSign
} from 'lucide-react';

export default function Series() {
  const navigate = useNavigate();
  const { series, addSeries, updateSeries, deleteSeries, getSeriesCalculations } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SeriesStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    episodes: 0,
    productionCost: 0,
    authorization: '',
    status: 'pending' as SeriesStatus,
  });
  const [changeReason, setChangeReason] = useState('');
  
  const filteredSeries = useMemo(() => {
    return series.filter(s => {
      const matchesSearch = s.name.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [series, searchTerm, statusFilter]);
  
  const resetForm = () => {
    setFormData({
      name: '',
      episodes: 0,
      productionCost: 0,
      authorization: '',
      status: 'pending',
    });
    setChangeReason('');
    setEditingSeries(null);
  };
  
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };
  
  const openEditModal = (s: Series) => {
    setEditingSeries(s);
    setFormData({
      name: s.name,
      episodes: s.episodes,
      productionCost: s.productionCost,
      authorization: s.authorization,
      status: s.status,
    });
    setShowAddModal(true);
  };
  
  const handleSubmit = () => {
    if (!formData.name || !formData.authorization) return;
    
    if (editingSeries) {
      const updates: Partial<Series> = {};
      if (formData.name !== editingSeries.name) updates.name = formData.name;
      if (formData.episodes !== editingSeries.episodes) updates.episodes = formData.episodes;
      if (formData.productionCost !== editingSeries.productionCost) updates.productionCost = formData.productionCost;
      if (formData.authorization !== editingSeries.authorization) updates.authorization = formData.authorization;
      if (formData.status !== editingSeries.status) updates.status = formData.status;
      
      if (Object.keys(updates).length > 0) {
        updateSeries(editingSeries.id, updates, changeReason || '修改剧集信息');
      }
    } else {
      addSeries(formData);
    }
    
    setShowAddModal(false);
    resetForm();
  };
  
  const handleDelete = (id: string) => {
    deleteSeries(id);
    setShowDeleteConfirm(null);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-serif">剧集档案</h1>
          <p className="text-gray-500 mt-1">管理短剧基本信息，追踪变动历史</p>
        </div>
        <button className="btn-primary" onClick={openAddModal}>
          <Plus className="w-4 h-4" />
          新增剧集
        </button>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索剧集名称..."
            className="input pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input w-32"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as SeriesStatus | 'all')}
        >
          <option value="all">全部状态</option>
          <option value="pending">待投放</option>
          <option value="active">投放中</option>
          <option value="completed">已完结</option>
        </select>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSeries.map(s => {
          const calculations = getSeriesCalculations(s.id);
          const latestCalc = calculations.sort(
            (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
          )[0];
          
          return (
            <div 
              key={s.id} 
              className="card-hover animate-slide-up"
              onClick={() => navigate(`/series/${s.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                    <Film className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 font-serif">{s.name}</h3>
                    <StatusBadge status={s.status} type="calculation" />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(s);
                    }}
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(s.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Layers className="w-4 h-4" />
                  <span>{s.episodes} 集</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <DollarSign className="w-4 h-4" />
                  <span>{formatCurrency(s.productionCost)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <User className="w-4 h-4" />
                  <span className="truncate">{s.authorization}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <CalendarDays className="w-4 h-4" />
                  <span>{formatDateStr(s.createdAt)}</span>
                </div>
              </div>
              
              {latestCalc && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">最新测算回收率</span>
                    <span className={`font-semibold ${latestCalc.recoveryRate >= 0.5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {(latestCalc.recoveryRate * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {calculations.length} 份测算记录
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </div>
          );
        })}
      </div>
      
      {filteredSeries.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Film className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">暂无剧集档案</p>
          <p className="text-sm mt-2">点击右上角"新增剧集"开始</p>
        </div>
      )}
      
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingSeries ? '编辑剧集' : '新增剧集'}
      >
        <div className="space-y-4">
          <div>
            <label className="label">剧集名称 *</label>
            <input
              type="text"
              className="input"
              placeholder="请输入剧集名称"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">集数</label>
              <input
                type="number"
                className="input"
                placeholder="集数"
                value={formData.episodes || ''}
                onChange={e => setFormData(prev => ({ ...prev, episodes: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label">制作成本（元）</label>
              <input
                type="number"
                className="input"
                placeholder="制作成本"
                value={formData.productionCost || ''}
                onChange={e => setFormData(prev => ({ ...prev, productionCost: Number(e.target.value) }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">授权方 *</label>
              <input
                type="text"
                className="input"
                placeholder="授权方名称"
                value={formData.authorization}
                onChange={e => setFormData(prev => ({ ...prev, authorization: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">状态</label>
              <select
                className="input"
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as SeriesStatus }))}
              >
                <option value="pending">待投放</option>
                <option value="active">投放中</option>
                <option value="completed">已完结</option>
              </select>
            </div>
          </div>
          
          {editingSeries && (
            <div>
              <label className="label">修改原因</label>
              <input
                type="text"
                className="input"
                placeholder="请输入修改原因，方便后续追溯"
                value={changeReason}
                onChange={e => setChangeReason(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                当前操作员：{getCurrentOperator()}
              </p>
            </div>
          )}
          
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
              disabled={!formData.name || !formData.authorization}
            >
              {editingSeries ? '保存修改' : '创建剧集'}
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
          <p className="text-gray-800 mb-2">确定要删除这部剧集吗？</p>
          <p className="text-sm text-gray-500 mb-6">
            删除后将同时删除相关的投流消耗、充值流水、渠道回款和测算记录，此操作不可撤销。
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
