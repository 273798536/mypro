import { FileText, FileCheck, DollarSign, AlertTriangle, Play } from 'lucide-react';
import { useAppStore } from '../store';
import { formatCurrency } from '../utils/calculator';
import StatCard from '../components/StatCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { claims, contracts, recoveries, calculateRecovery } = useAppStore();

  const totalLoss = claims.reduce((sum, c) => sum + c.totalLoss, 0);
  const totalRecovery = recoveries.reduce((sum, r) => sum + r.recoverableAmount, 0);
  const deductibleErrors = recoveries.filter((r) => r.hasDeductibleError).length;
  const pendingClaims = claims.filter((c) => c.status === 'pending').length;

  const handleQuickCalculate = () => {
    const pending = claims.filter((c) => c.status !== 'closed');
    const activeContracts = contracts.filter((c) => c.isActive);

    pending.forEach((claim) => {
      activeContracts.forEach((contract) => {
        const existing = recoveries.find(
          (r) => r.claimId === claim.id && r.contractId === contract.id
        );
        if (!existing) {
          calculateRecovery(claim.id, contract.id);
        }
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">仪表盘</h1>
          <p className="text-gray-500 mt-1">欢迎回来，这是您的再保摊回业务概览</p>
        </div>
        <button
          onClick={handleQuickCalculate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
        >
          <Play className="w-4 h-4" />
          一键计算摊回
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="赔款总额"
          value={formatCurrency(totalLoss)}
          icon={DollarSign}
          color="blue"
          trend={{ value: 12.5, isPositive: false }}
        />
        <StatCard
          title="摊回总额"
          value={formatCurrency(totalRecovery)}
          icon={FileCheck}
          color="green"
          trend={{ value: 8.3, isPositive: true }}
        />
        <StatCard
          title="免赔错用"
          value={deductibleErrors}
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="有效合同"
          value={contracts.filter((c) => c.isActive).length}
          icon={FileText}
          color="gold"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => navigate('/claims')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-primary-200 transition-colors">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
              <p className="font-medium text-gray-900">新增赔案单</p>
              <p className="text-xs text-gray-500 mt-1">录入新的赔案信息</p>
            </button>
            <button
              onClick={() => navigate('/contracts')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-accent-200 transition-colors">
                <FileCheck className="w-5 h-5 text-accent-600" />
              </div>
              <p className="font-medium text-gray-900">管理分保合同</p>
              <p className="text-xs text-gray-500 mt-1">查看和修改分保合同</p>
            </button>
            <button
              onClick={() => navigate('/calculation')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-medium text-gray-900">摊回计算</p>
              <p className="text-xs text-gray-500 mt-1">执行摊回计算</p>
            </button>
            <button
              onClick={() => navigate('/history')}
              className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 transition-colors">
                <AlertTriangle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-medium text-gray-900">历史追溯</p>
              <p className="text-xs text-gray-500 mt-1">查看操作历史记录</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">待处理事项</h2>
          <div className="space-y-3">
            {deductibleErrors > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">
                    检测到 {deductibleErrors} 笔免赔错用
                  </p>
                  <p className="text-xs text-red-600">请及时核对并重新计算</p>
                </div>
                <button
                  onClick={() => navigate('/statements')}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  查看
                </button>
              </div>
            )}
            {pendingClaims > 0 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    {pendingClaims} 笔赔案待确认
                  </p>
                  <p className="text-xs text-yellow-600">请完成赔案审核</p>
                </div>
                <button
                  onClick={() => navigate('/claims')}
                  className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                >
                  查看
                </button>
              </div>
            )}
            {deductibleErrors === 0 && pendingClaims === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-medium">暂无待处理事项</p>
                <p className="text-sm mt-1">所有业务运行正常</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
