import React from 'react';
import { useStore } from '../store/useStore';
import { Edit3, Users, Building2, Scale, FileText, Upload } from 'lucide-react';

export const ScoreTable: React.FC = () => {
  const {
    judges,
    suppliers,
    categories,
    scores,
    reviewLogs,
    activeTab,
    setActiveTab,
    updateScore,
    updateCategoryWeight,
  } = useStore();

  const handleScoreChange = (judgeId: string, supplierId: string, categoryId: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    if (numValue !== null && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
      return;
    }
    updateScore(judgeId, supplierId, categoryId, numValue);
  };

  const getScoreValue = (judgeId: string, supplierId: string, categoryId: string) => {
    const score = scores.find(
      (s) => s.judgeId === judgeId && s.supplierId === supplierId && s.categoryId === categoryId
    );
    return score?.value ?? '';
  };

  const renderJudgesTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">评委ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">姓名</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">角色</th>
          </tr>
        </thead>
        <tbody>
          {judges.map((judge) => (
            <tr key={judge.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-600">{judge.id}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{judge.name}</td>
              <td className="px-4 py-3 text-slate-600">{judge.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSuppliersTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">供应商ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">名称</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">联系方式</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">类别</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => (
            <tr key={supplier.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-600">{supplier.id}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{supplier.name}</td>
              <td className="px-4 py-3 text-slate-600">{supplier.contact}</td>
              <td className="px-4 py-3 text-slate-600">{supplier.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCategoriesTab = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">评分项ID</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">名称</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">权重</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">单位</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">范围</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((category) => (
            <tr key={category.id} className="border-b border-slate-200 hover:bg-slate-50">
              <td className="px-4 py-3 text-slate-600">{category.id}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{category.name}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  value={category.weight}
                  onChange={(e) => updateCategoryWeight(category.id, parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </td>
              <td className="px-4 py-3 text-slate-600">{category.unit}</td>
              <td className="px-4 py-3 text-slate-600">{category.range[0]}-{category.range[1]}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-blue-50">
          <tr>
            <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">权重合计</td>
            <td className="px-4 py-3 font-bold text-blue-600">
              {categories.reduce((sum, c) => sum + c.weight, 0).toFixed(2)}
            </td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderScoresTab = () => (
    <div className="overflow-x-auto">
      <div className="mb-4 px-2">
        <p className="text-sm text-slate-600">
          <span className="font-medium">使用说明：</span>
          行 = 评委 × 供应商 × 评分项。留空表示缺项。
        </p>
      </div>
      {suppliers.map((supplier) => (
        <div key={supplier.id} className="mb-6">
          <h4 className="text-sm font-semibold text-slate-700 mb-2 px-2 bg-blue-50 py-2 rounded">
            {supplier.name}
          </h4>
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">评委</th>
                {categories.map((cat) => (
                  <th key={cat.id} className="px-3 py-2 text-center font-semibold text-slate-700">
                    {cat.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {judges.map((judge) => (
                <tr key={judge.id} className="border-b border-slate-200">
                  <td className="px-3 py-2 font-medium text-slate-700">{judge.name}</td>
                  {categories.map((category) => {
                    const value = getScoreValue(judge.id, supplier.id, category.id);
                    return (
                      <td key={category.id} className="px-3 py-2">
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            handleScoreChange(judge.id, supplier.id, category.id, e.target.value)
                          }
                          className={`w-16 px-2 py-1 border rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            value === null || value === ''
                              ? 'border-orange-300 bg-orange-50'
                              : 'border-slate-300'
                          }`}
                          min="0"
                          max="100"
                          placeholder="-"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const renderReviewsTab = () => (
    <div className="space-y-3">
      {reviewLogs.map((log) => (
        <div
          key={log.id}
          className={`p-4 rounded-lg border-l-4 ${
            log.status === 'resolved'
              ? 'bg-green-50 border-green-500'
              : log.status === 'pending'
              ? 'bg-yellow-50 border-yellow-500'
              : 'bg-red-50 border-red-500'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded ${
                  log.type === 'appeal'
                    ? 'bg-purple-100 text-purple-700'
                    : log.type === 'correction'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {log.type === 'appeal' ? '申诉' : log.type === 'correction' ? '修正' : '核验'}
              </span>
              <span className="text-sm text-slate-600">
                {judges.find((j) => j.id === log.judgeId)?.name || log.judgeId} →{' '}
                {suppliers.find((s) => s.id === log.supplierId)?.name || log.supplierId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${
                  log.status === 'resolved'
                    ? 'text-green-700'
                    : log.status === 'pending'
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}
              >
                {log.status === 'resolved' ? '已解决' : log.status === 'pending' ? '待处理' : '已驳回'}
              </span>
              <span className="text-xs text-slate-500">{log.timestamp}</span>
            </div>
          </div>
          <p className="text-sm text-slate-700">{log.content}</p>
        </div>
      ))}
    </div>
  );

  const tabs = [
    { id: 'judges', label: '评委', icon: Users },
    { id: 'suppliers', label: '供应商', icon: Building2 },
    { id: 'categories', label: '权重配置', icon: Scale },
    { id: 'scores', label: '评委打分', icon: Edit3 },
    { id: 'reviews', label: '复议记录', icon: FileText },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 p-2 bg-slate-50 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'judges' && renderJudgesTab()}
        {activeTab === 'suppliers' && renderSuppliersTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
        {activeTab === 'scores' && renderScoresTab()}
        {activeTab === 'reviews' && renderReviewsTab()}
      </div>
    </div>
  );
};
