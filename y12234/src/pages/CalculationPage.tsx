import { useState } from 'react';
import { Calculator, Play, CheckCircle, AlertCircle, XCircle, Eye, ArrowRight, Calendar, DollarSign, Clock } from 'lucide-react';
import { useAppStore } from '../store';
import { DeferredRevenueEngine } from '../services/revenueEngine';
import { DeferredRevenue } from '../types';
import { Link } from 'react-router-dom';

export default function CalculationPage() {
  const { plates, flows, bindings, revenues, isDataLoaded, setSelectedRevenueId } = useAppStore();
  const [calculating, setCalculating] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [calculatedResults, setCalculatedResults] = useState<DeferredRevenue[]>([]);

  const handleCalculate = async () => {
    setCalculating(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const results: DeferredRevenue[] = [];
    plates.forEach(plate => {
      const plateFlows = flows.filter(f => f.plateId === plate.id);
      const result = DeferredRevenueEngine.calculate(plate, plateFlows, selectedPeriod);
      const plateBindings = bindings.filter(b => b.plateId === plate.id);
      DeferredRevenueEngine.detectSpecialScenarios(result, plateBindings, plateFlows);
      results.push(result);
    });
    
    setCalculatedResults(results);
    setCalculating(false);
  };

  const displayRevenues = calculatedResults.length > 0 ? calculatedResults : revenues;

  const getStatusBadge = (status: string) => {
    const styles = {
      normal: 'bg-emerald-100 text-emerald-700',
      warning: 'bg-amber-100 text-amber-700',
      error: 'bg-red-100 text-red-700'
    };
    const labels = {
      normal: '正常',
      warning: '警告',
      error: '异常'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <Calculator className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-800">收入递延计算</h2>
              <p className="text-sm text-slate-500">计算包月收入的确认与递延金额</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <label className="text-sm text-slate-600">计算期间:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            >
              <option value="2024-01">2024年1月</option>
              <option value="2024-02">2024年2月</option>
              <option value="2024-03">2024年3月</option>
              <option value="2024-04">2024年4月</option>
            </select>
          </div>
          
          <button
            onClick={handleCalculate}
            disabled={!isDataLoaded || calculating}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium shadow-lg shadow-emerald-500/30"
          >
            {calculating ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {calculating ? '计算中...' : '开始计算'}
          </button>

          {!isDataLoaded && (
            <Link to="/import" className="text-sm text-emerald-600 hover:text-emerald-700">
              请先导入数据 →
            </Link>
          )}
        </div>

        {displayRevenues.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5">
              <div className="flex items-center gap-2 text-emerald-600 text-sm mb-2">
                <DollarSign className="w-4 h-4" />
                已确认收入
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                ¥{displayRevenues.reduce((sum, r) => sum + r.recognizedAmount, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5">
              <div className="flex items-center gap-2 text-blue-600 text-sm mb-2">
                <Clock className="w-4 h-4" />
                递延收入
              </div>
              <div className="text-2xl font-bold text-blue-700">
                ¥{displayRevenues.reduce((sum, r) => sum + r.deferredAmount, 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5">
              <div className="flex items-center gap-2 text-purple-600 text-sm mb-2">
                <Calculator className="w-4 h-4" />
                计算车牌数
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {displayRevenues.length}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">计算结果</h3>
        
        {displayRevenues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">车牌号码</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">期间</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">总金额</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">已确认</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-500">递延</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">状态</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {displayRevenues.map((revenue) => (
                  <tr key={revenue.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <span className="font-medium text-slate-800">{revenue.plateNumber}</span>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{revenue.period}</td>
                    <td className="py-4 px-4 text-right text-slate-800 font-medium">¥{revenue.totalAmount}</td>
                    <td className="py-4 px-4 text-right text-emerald-600 font-medium">¥{revenue.recognizedAmount}</td>
                    <td className="py-4 px-4 text-right text-blue-600 font-medium">¥{revenue.deferredAmount}</td>
                    <td className="py-4 px-4 text-center">{getStatusBadge(revenue.status)}</td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedRevenueId(revenue.id);
                        }}
                        className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                      >
                        <Eye className="w-4 h-4" />
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 text-slate-400">
            <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>暂无计算结果，请先导入数据并点击"开始计算"</p>
          </div>
        )}
      </div>

      {displayRevenues.some(r => r.warnings.length > 0 || r.errors.length > 0) && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">计算异常说明</h3>
          <div className="space-y-4">
            {displayRevenues.filter(r => r.warnings.length > 0 || r.errors.length > 0).map((revenue) => (
              <div key={revenue.id} className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-medium text-slate-800">{revenue.plateNumber}</span>
                  {getStatusBadge(revenue.status)}
                </div>
                {revenue.warnings.map((warning, idx) => (
                  <div key={`w-${idx}`} className="flex items-start gap-2 text-amber-600 text-sm mb-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {warning}
                  </div>
                ))}
                {revenue.errors.map((error, idx) => (
                  <div key={`e-${idx}`} className="flex items-start gap-2 text-red-600 text-sm">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
