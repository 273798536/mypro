import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Trash2,
  Eye,
  Download,
  Calendar,
  User,
  FileText,
  Tag,
  Layers,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../store/useDataStore';
import { formatDate, formatPercent, formatNumber, getStatusColor } from '../utils/formatters';
import { generatePDFReport } from '../utils/exporters';

interface SavedPlan {
  id: string;
  name: string;
  description: string;
  type: 'snapshot' | 'plan';
  portfolioIds: string[];
  filterSettings: any;
  axisMapping: any;
  createdAt: string;
  createdBy: string;
}

export const PortfolioManager: React.FC = () => {
  const navigate = useNavigate();
  const { portfolios, assets, constraints } = useDataStore();

  const [plans, setPlans] = useState<SavedPlan[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('portfolioPlans');
    if (saved) {
      setPlans(JSON.parse(saved));
    }
  }, []);

  const handleDeletePlan = (planId: string) => {
    const updated = plans.filter(p => p.id !== planId);
    setPlans(updated);
    localStorage.setItem('portfolioPlans', JSON.stringify(updated));
  };

  const handleExportPlan = (plan: SavedPlan) => {
    const planPortfolios = portfolios.filter(p => plan.portfolioIds.includes(p.id));
    if (planPortfolios.length > 0) {
      generatePDFReport(planPortfolios[0], assets, constraints);
    }
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    navigate('/workbench', { state: { plan } });
  };

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => navigate('/workbench')}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-2 text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回工作台
            </button>
            <h1 className="text-3xl font-bold text-slate-100" style={{ fontFamily: 'Playfair Display, serif' }}>
              投资方案管理
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              管理已保存的投资方案和快速快照
            </p>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 mb-6 rounded-full bg-slate-800/50 flex items-center justify-center">
              <FileText className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-300 mb-2">暂无保存的方案</h3>
            <p className="text-sm text-slate-500 mb-6">在工作台中选择组合后点击「保存方案」</p>
            <button
              onClick={() => navigate('/workbench')}
              className="px-6 py-2.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
            >
              前往工作台
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((plan) => {
                const planPortfolios = portfolios.filter(p => plan.portfolioIds.includes(p.id));
                const avgReturn = planPortfolios.length > 0
                  ? planPortfolios.reduce((sum, p) => sum + p.expectedReturn, 0) / planPortfolios.length
                  : 0;
                const avgVolatility = planPortfolios.length > 0
                  ? planPortfolios.reduce((sum, p) => sum + p.volatility, 0) / planPortfolios.length
                  : 0;
                const hasWarning = planPortfolios.some(p => p.status === 'warning');
                const hasError = planPortfolios.some(p => p.status === 'error');

                return (
                  <div
                    key={plan.id}
                    className="p-6 rounded-xl bg-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          plan.type === 'plan'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-slate-100">
                              {plan.name}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              plan.type === 'plan'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {plan.type === 'plan' ? '正式方案' : '快速快照'}
                            </span>
                            {hasError && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                包含错误
                              </span>
                            )}
                            {hasWarning && !hasError && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                包含警告
                              </span>
                            )}
                            {!hasWarning && !hasError && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                全部正常
                              </span>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-sm text-slate-400 mb-2">{plan.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(plan.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {plan.createdBy}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {plan.portfolioIds.length} 个组合
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleExportPlan(plan)}
                          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg transition-colors"
                          title="导出PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleLoadPlan(plan)}
                          className="px-4 py-2 text-xs bg-slate-700/50 text-slate-200 rounded-lg hover:bg-slate-600/50 transition-colors flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          加载方案
                        </button>
                        <button
                          onClick={() => handleDeletePlan(plan.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">组合数量</div>
                        <div className="text-lg font-bold text-slate-200">{planPortfolios.length}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">平均收益</div>
                        <div className="text-lg font-bold text-green-400">{formatPercent(avgReturn)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">平均波动</div>
                        <div className="text-lg font-bold text-amber-400">{formatPercent(avgVolatility)}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <div className="text-xs text-slate-500 mb-1">包含组合</div>
                        <div className="flex flex-wrap gap-1">
                          {planPortfolios.slice(0, 3).map(p => (
                            <span
                              key={p.id}
                              className="px-1.5 py-0.5 text-xs rounded"
                              style={{
                                backgroundColor: `${getStatusColor(p.status)}15`,
                                color: getStatusColor(p.status)
                              }}
                            >
                              {p.name}
                            </span>
                          ))}
                          {planPortfolios.length > 3 && (
                            <span className="px-1.5 py-0.5 text-xs text-slate-500">
                              +{planPortfolios.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
