import { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../store/AppContext';
import { generateId, calculateGuaranteeStatus } from '../../utils/dateUtils';
import { generateEmptyRepayments } from '../../utils/import';
import type { Customer, Guarantee, Approval } from '../../types';

interface CustomerFormProps {
  onClose: () => void;
}

export default function CustomerForm({ onClose }: CustomerFormProps) {
  const navigate = useNavigate();
  const { dispatch, state } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    idCard: '',
    creditAmount: '',
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    source: '手动录入',
    guaranteeType: 'mortgage' as 'mortgage' | 'pledge' | 'guarantor',
    guarantor: '',
    guaranteeExpiryDate: '',
    approvalStage: '续授信审批',
    approvalResult: 'pending' as 'approved' | 'rejected' | 'pending' | 'withdrawn',
    approvalOpinion: '',
    approvalOperator: state.currentUser?.displayName || '客户经理',
    generateRepayments: true
  });
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    const newErrors: string[] = [];
    
    if (!formData.name.trim()) newErrors.push('客户名称不能为空');
    if (!formData.idCard.trim()) newErrors.push('身份证号不能为空');
    if (!formData.creditAmount || Number(formData.creditAmount) <= 0) newErrors.push('授信额度必须大于0');
    if (!formData.expiryDate) newErrors.push('授信到期日不能为空');
    if (!formData.guarantor.trim()) newErrors.push('担保信息不能为空');
    if (!formData.guaranteeExpiryDate) newErrors.push('担保到期日不能为空');
    
    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }
    
    const customerId = generateId();
    
    const customer: Customer = {
      id: customerId,
      name: formData.name.trim(),
      idCard: formData.idCard.trim(),
      creditAmount: Number(formData.creditAmount),
      startDate: formData.startDate,
      expiryDate: formData.expiryDate,
      status: 'normal',
      source: formData.source,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      anomalies: []
    };
    
    dispatch({ type: 'ADD_CUSTOMER', payload: customer });
    
    if (formData.generateRepayments) {
      const repayments = generateEmptyRepayments(customerId);
      dispatch({ type: 'SET_REPAYMENTS', payload: [...state.repayments, ...repayments] });
    }
    
    const guarantee: Guarantee = {
      id: generateId(),
      customerId,
      type: formData.guaranteeType,
      guarantor: formData.guarantor.trim(),
      startDate: formData.startDate,
      expiryDate: formData.guaranteeExpiryDate,
      status: formData.guaranteeExpiryDate ? calculateGuaranteeStatus(formData.guaranteeExpiryDate) : 'valid',
      source: '手动录入'
    };
    dispatch({ type: 'ADD_GUARANTEE', payload: guarantee });
    
    const approval: Approval = {
      id: generateId(),
      customerId,
      stage: formData.approvalStage,
      result: formData.approvalResult,
      opinion: formData.approvalOpinion,
      operator: formData.approvalOperator,
      timestamp: new Date().toISOString(),
      isWithdrawn: formData.approvalResult === 'withdrawn',
      source: '手动录入'
    };
    dispatch({ type: 'ADD_APPROVAL', payload: approval });
    
    onClose();
    navigate(`/loans/${customerId}`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">新增客户</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <Minus size={18} />
                请修正以下错误
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={18} />
                客户基本信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="input-field"
                    placeholder="请输入客户名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">身份证号 *</label>
                  <input
                    type="text"
                    value={formData.idCard}
                    onChange={(e) => setFormData(f => ({ ...f, idCard: e.target.value }))}
                    className="input-field"
                    placeholder="请输入身份证号"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">授信额度(元) *</label>
                  <input
                    type="number"
                    value={formData.creditAmount}
                    onChange={(e) => setFormData(f => ({ ...f, creditAmount: e.target.value }))}
                    className="input-field"
                    placeholder="请输入授信额度"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据来源</label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData(f => ({ ...f, source: e.target.value }))}
                    className="input-field"
                    placeholder="请输入数据来源"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">授信起始日</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(f => ({ ...f, startDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">授信到期日 *</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(f => ({ ...f, expiryDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={18} />
                担保信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担保类型</label>
                  <select
                    value={formData.guaranteeType}
                    onChange={(e) => setFormData(f => ({ ...f, guaranteeType: e.target.value as 'mortgage' | 'pledge' | 'guarantor' }))}
                    className="input-field"
                  >
                    <option value="mortgage">抵押</option>
                    <option value="pledge">质押</option>
                    <option value="guarantor">保证</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">担保人/物 *</label>
                  <input
                    type="text"
                    value={formData.guarantor}
                    onChange={(e) => setFormData(f => ({ ...f, guarantor: e.target.value }))}
                    className="input-field"
                    placeholder="请输入担保人或抵押物"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">担保到期日 *</label>
                  <input
                    type="date"
                    value={formData.guaranteeExpiryDate}
                    onChange={(e) => setFormData(f => ({ ...f, guaranteeExpiryDate: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Plus size={18} />
                审批信息
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">审批阶段</label>
                  <input
                    type="text"
                    value={formData.approvalStage}
                    onChange={(e) => setFormData(f => ({ ...f, approvalStage: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">审批结果</label>
                  <select
                    value={formData.approvalResult}
                    onChange={(e) => setFormData(f => ({ ...f, approvalResult: e.target.value as 'approved' | 'rejected' | 'pending' | 'withdrawn' }))}
                    className="input-field"
                  >
                    <option value="pending">待审批</option>
                    <option value="approved">通过</option>
                    <option value="rejected">拒绝</option>
                    <option value="withdrawn">撤回</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作人</label>
                  <input
                    type="text"
                    value={formData.approvalOperator}
                    onChange={(e) => setFormData(f => ({ ...f, approvalOperator: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">审批意见</label>
                  <textarea
                    value={formData.approvalOpinion}
                    onChange={(e) => setFormData(f => ({ ...f, approvalOpinion: e.target.value }))}
                    className="input-field min-h-20"
                    placeholder="请输入审批意见"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="generateRepayments"
                checked={formData.generateRepayments}
                onChange={(e) => setFormData(f => ({ ...f, generateRepayments: e.target.checked }))}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <label htmlFor="generateRepayments" className="text-sm text-gray-700">
                自动生成最近12个月的还款流水模板
              </label>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              保存客户
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
