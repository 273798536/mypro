import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import DataCard from '@/components/DataCard';
import Timeline from '@/components/Timeline';
import { formatCurrency, formatPercent, formatDateStr, formatDateFull } from '@/utils/format';
import { exportSeriesDetail } from '@/utils/export';
import { getCurrentOperator } from '@/engine/changeTracker';

import type { Series, SeriesStatus } from '@/types';
import { 
  Film, 
  Edit, 
  Plus, 
  Download, 
  ArrowLeft, 
  Layers, 
  User, 
  CalendarDays, 
  DollarSign,
  TrendingUp,
  Wallet,
  Banknote,
  ChevronRight,
  AlertTriangle,
  Clock,
  Calendar,
  Calculator
} from 'lucide-react';

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    getSeriesById, 
    getSeriesCalculations, 
    getSeriesCosts, 
    getSeriesFlows, 
    getSeriesPayments,
    getSeriesChangeLogs,
    updateSeries,
    triggerCalculation
  } = useAppStore();
  
  const series = id ? getSeriesById(id) : undefined;
  const calculations = id ? getSeriesCalculations(id) : [];
  const costs = id ? getSeriesCosts(id) : [];
  const flows = id ? getSeriesFlows(id) : [];
  const payments = id ? getSeriesPayments(id) : [];
  const changeLogs = id ? getSeriesChangeLogs(id) : [];
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    episodes: 0,
    productionCost: 0,
    authorization: '',
    status: 'pending' as SeriesStatus,
  });
  const [changeReason, setChangeReason] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  
  const stats = useMemo(() => {
    const totalCost = costs.reduce((sum, c) => sum + c.amount, 0);
    const totalFlow = flows.reduce((sum, f) => sum + f.amount, 0);
    const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
    const affectedCalcIds = new Set(changeLogs.flatMap(log => log.affectedCalculations));
    
    return {
      totalCost,
      totalFlow,
      totalPayment,
      affectedCalcIds,
    };
  }, [costs, flows, payments, changeLogs]);
  
  const sortedCalculations = useMemo(() => {
    return [...calculations].sort(
      (a, b) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime()
    );
  }, [calculations]);
  
  const openEditModal = () => {
    if (!series) return;
    setFormData({
      name: series.name,
      episodes: series.episodes,
      productionCost: series.productionCost,
      authorization: series.authorization,
      status: series.status,
    });
    setChangeReason('');
    setShowEditModal(true);
  };
  
  const openCalcModal = () => {
    const today = new Date();
    const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEnd = today.toISOString().split('T')[0];
    setPeriodStart(defaultStart);
    setPeriodEnd(defaultEnd);
    setShowCalcModal(true);
  };
  
  const handleEditSubmit = () => {
    if (!series || !formData.name || !formData.authorization) return;
    
    const updates: Partial<Series> = {};
    if (formData.name !== series.name) updates.name = formData.name;
    if (formData.episodes !== series.episodes) updates.episodes = formData.episodes;
    if (formData.productionCost !== series.productionCost) updates.productionCost = formData.productionCost;
    if (formData.authorization !== series.authorization) updates.authorization = formData.authorization;
    if (formData.status !== series.status) updates.status = formData.status;
    
    if (Object.keys(updates).length > 0) {
      updateSeries(series.id, updates, changeReason || '修改剧集信息');
    }
    
    setShowEditModal(false);
  };
  
  const handleCalcSubmit = async () => {
    if (!series || !periodStart || !periodEnd) return;
    
    setIsCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    triggerCalculation(series.id, periodStart, periodEnd);
    
    setIsCalculating(false);
    setShowCalcModal(false);
  };
  
  const handleExport = () => {
    if (!series) return;
    exportSeriesDetail(series, calculations, costs, flows, payments);
  };
  
  if (!series) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Film className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">剧集不存在</p>
        <button
          className="mt-4 text-primary-600 hover:text-primary-700 flex items-center gap-1"
          onClick={() => navigate('/series')}
        >
          <ArrowLeft className="w-4 h-4" />
          返回剧集列表
        </button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <button
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => navigate('/series')}
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 font-serif">{series.name}</h1>
          <p className="text-gray-500 mt-1">剧集详情与关联数据概览</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={openEditModal}>
            <Edit className="w-4 h-4" />
            编辑剧集
          </button>
          <button className="btn-secondary" onClick={openCalcModal}>
            <Plus className="w-4 h-4" />
            新增测算
          </button>
          <button className="btn-primary" onClick={handleExport}>
            <Download className="w-4 h-4" />
            导出明细
          </button>
        </div>
      </div>
      
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-800 font-serif mb-4">基本信息</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Layers className="w-4 h-4" />
              集数
            </div>
            <p className="text-xl font-semibold text-gray-800">{series.episodes} 集</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              制作成本
            </div>
            <p className="text-xl font-semibold text-gray-800">{formatCurrency(series.productionCost)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <User className="w-4 h-4" />
              授权方
            </div>
            <p className="text-xl font-semibold text-gray-800 truncate">{series.authorization}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              状态
            </div>
            <div className="mt-1">
              <StatusBadge status={series.status} type="calculation" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CalendarDays className="w-4 h-4" />
              创建时间
            </div>
            <p className="text-xl font-semibold text-gray-800">{formatDateFull(series.createdAt)}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DataCard
          title="累计投流消耗"
          value={formatCurrency(stats.totalCost)}
          icon={TrendingUp}
          iconBg="bg-red-50"
          className="animate-stagger-1"
        />
        <DataCard
          title="累计充值流水"
          value={formatCurrency(stats.totalFlow)}
          icon={Wallet}
          iconBg="bg-blue-50"
          className="animate-stagger-2"
        />
        <DataCard
          title="累计渠道回款"
          value={formatCurrency(stats.totalPayment)}
          icon={Banknote}
          iconBg="bg-emerald-50"
          className="animate-stagger-3"
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-800 font-serif mb-4">
            变动历史
            <span className="ml-2 text-sm font-normal text-gray-400">({changeLogs.length} 条记录)</span>
          </h2>
          <div className="max-h-96 overflow-y-auto pr-2">
            <Timeline changes={changeLogs} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 font-serif">
              影响分析
              <span className="ml-2 text-sm font-normal text-gray-400">({calculations.length} 份测算)</span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">测算周期</th>
                  <th className="table-header">回收率</th>
                  <th className="table-header">利润</th>
                  <th className="table-header">版本</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedCalculations.map(calc => {
                  const isAffected = stats.affectedCalcIds.has(calc.id);
                  
                  return (
                    <tr 
                      key={calc.id} 
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isAffected ? 'bg-amber-50/30' : ''}`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-500 text-sm">
                            {formatDateStr(calc.periodStart)} ~ {formatDateStr(calc.periodEnd)}
                          </span>
                        </div>
                        {isAffected && (
                          <div className="flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-amber-600">数据变动影响</span>
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={calc.recoveryRate >= 0.5 ? 'text-emerald-600' : 'text-amber-600'}>
                          {formatPercent(calc.recoveryRate)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={calc.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                          {calc.profit >= 0 ? '+' : ''}{formatCurrency(calc.profit)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">v{calc.version}</span>
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={calc.status} type="calculation" />
                      </td>
                      <td className="table-cell">
                        <button
                          className="text-primary-600 hover:text-primary-700 flex items-center gap-1 text-sm"
                          onClick={() => navigate(`/calculation/${calc.id}`)}
                        >
                          详情
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {calculations.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无测算记录</p>
                <p className="text-sm mt-1">点击右上角"新增测算"开始</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="编辑剧集"
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
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn-secondary"
              onClick={() => setShowEditModal(false)}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleEditSubmit}
              disabled={!formData.name || !formData.authorization}
            >
              保存修改
            </button>
          </div>
        </div>
      </Modal>
      
      <Modal
        isOpen={showCalcModal}
        onClose={() => setShowCalcModal(false)}
        title="新增测算"
      >
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              为剧集 <span className="font-medium text-gray-800">{series.name}</span> 创建新的测算
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">开始日期</label>
              <input
                type="date"
                className="input"
                value={periodStart}
                onChange={e => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="label">结束日期</label>
              <input
                type="date"
                className="input"
                value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              className="btn-secondary"
              onClick={() => setShowCalcModal(false)}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleCalcSubmit}
              disabled={!periodStart || !periodEnd || isCalculating}
            >
              {isCalculating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  测算中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  创建测算
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
