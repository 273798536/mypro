import { useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  AlertTriangle, 
  FileX, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { useReserveStore } from '../store/useReserveStore';
import { formatCurrency, formatDate } from '../utils/calculationEngine';
import { exportToExcel } from '../utils/exportUtils';

const COLORS = ['#1e3a5f', '#334e68', '#486581', '#627d98', '#829ab1', '#9fb3c8'];

export default function Dashboard() {
  const { 
    dashboardMetrics, 
    calculations, 
    duplicateGroups, 
    batchMismatches,
    rules,
    performTrialCalculation,
    selectedModel
  } = useReserveStore();
  
  useEffect(() => {
    if (calculations.length === 0) {
      performTrialCalculation();
    }
  }, [calculations.length, performTrialCalculation]);
  
  if (!dashboardMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse-slow text-primary-600 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          <span>正在计算准备金数据...</span>
        </div>
      </div>
    );
  }
  
  const pendingDuplicates = duplicateGroups.filter(g => g.status === 'pending');
  const pendingMismatches = batchMismatches.filter(m => m.status === 'pending');
  const expiringRules = rules.filter(r => 
    r.isActive && new Date(r.expiryDate) < new Date(new Date().setMonth(new Date().getMonth() + 3))
  );
  
  const highRiskBatches = calculations
    .filter(c => c.endingReserve < 0 || c.duplicateClaimAmount > c.claimAmount * 0.3)
    .slice(0, 5);
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-medium text-slate-700 text-sm">{label}</p>
          {payload.map((entry: any, idx: number) => (
            <p key={idx} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="准备金余额" 
          value={dashboardMetrics.totalReserve} 
          icon={Wallet}
          color="primary"
          trend={5.2}
          subtitle="当前应计提准备金总额"
        />
        <MetricCard 
          title="本期计提" 
          value={dashboardMetrics.totalAccrual} 
          icon={ArrowUpCircle}
          color="emerald"
          trend={3.8}
          subtitle="本期新增计提金额"
        />
        <MetricCard 
          title="本期冲回" 
          value={dashboardMetrics.totalWriteBack} 
          icon={ArrowDownCircle}
          color="amber"
          trend={-2.1}
          subtitle="索赔实际发生冲回"
        />
        <MetricCard 
          title="重复索赔金额" 
          value={dashboardMetrics.duplicateClaimAmount} 
          icon={AlertTriangle}
          color="rose"
          subtitle="已检测到的重复索赔"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-serif font-semibold text-slate-800">准备金滚动趋势</h3>
              <p className="text-sm text-slate-500">按批次准备金余额变化趋势</p>
            </div>
            <button 
              onClick={() => exportToExcel(calculations, { includeHash: true, includeEvidence: true })}
              className="btn-secondary text-sm"
            >
              导出数据
            </button>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dashboardMetrics.reserveTrend}>
                <defs>
                  <linearGradient id="colorReserve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `¥${(v/10000).toFixed(0)}万`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  name="准备金余额" 
                  stroke="#1e3a5f" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorReserve)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card">
          <h3 className="text-lg font-serif font-semibold text-slate-800 mb-2">批次分布</h3>
          <p className="text-sm text-slate-500 mb-4">各批次准备金占比</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboardMetrics.batchDistribution.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="reserve"
                  nameKey="batch"
                >
                  {dashboardMetrics.batchDistribution.slice(0, 6).map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `批次: ${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {dashboardMetrics.batchDistribution.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                  <span className="text-slate-600 truncate max-w-[120px]">{item.batch}</span>
                </div>
                <span className="text-slate-800 font-medium">{item.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-serif font-semibold text-slate-800 mb-2">月度索赔分布</h3>
          <p className="text-sm text-slate-500 mb-6">正常索赔 vs 重复索赔 vs 错配索赔</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardMetrics.claimDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `¥${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="normal" name="正常索赔" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="duplicate" name="重复索赔" stackId="a" fill="#d97706" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mismatch" name="错配索赔" stackId="a" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-serif font-semibold text-slate-800">预警与待处理</h3>
              <p className="text-sm text-slate-500">需要人工干预的事项</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {pendingDuplicates.length > 0 && (
              <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900">待审核重复索赔</p>
                  <p className="text-sm text-amber-700">{pendingDuplicates.length} 组重复索赔等待人工审核</p>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-500" />
              </div>
            )}
            
            {pendingMismatches.length > 0 && (
              <div className="flex items-start gap-4 p-4 bg-rose-50 rounded-lg border border-rose-200">
                <FileX className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-rose-900">批次错配待核对</p>
                  <p className="text-sm text-rose-700">{pendingMismatches.length} 条批次错配记录待处理</p>
                </div>
                <ChevronRight className="w-5 h-5 text-rose-500" />
              </div>
            )}
            
            {expiringRules.length > 0 && (
              <div className="flex items-start gap-4 p-4 bg-primary-50 rounded-lg border border-primary-200">
                <Clock className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-primary-900">规则即将过期</p>
                  <p className="text-sm text-primary-700">{expiringRules.length} 条准备金规则将在3个月内过期</p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary-500" />
              </div>
            )}
            
            {highRiskBatches.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 mt-4">高风险批次</p>
                {highRiskBatches.map((batch, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`w-4 h-4 ${batch.endingReserve < 0 ? 'text-rose-500' : 'text-amber-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{batch.batchNo}</p>
                        <p className="text-xs text-slate-500">
                          {batch.endingReserve < 0 ? '准备金赤字' : '高重复索赔率'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${batch.endingReserve < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      {formatCurrency(batch.endingReserve)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {pendingDuplicates.length === 0 && pendingMismatches.length === 0 && expiringRules.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <p className="text-emerald-800">所有事项已处理完毕，暂无预警</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-serif font-semibold text-slate-800">准备金计算明细</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="px-2 py-1 bg-primary-100 text-primary-800 rounded">
              型号: {selectedModel}
            </span>
            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded">
              共 {calculations.length} 个批次
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="px-4 py-3 text-left">批次</th>
                <th className="px-4 py-3 text-right">期初余额</th>
                <th className="px-4 py-3 text-right">本期计提</th>
                <th className="px-4 py-3 text-right">本期冲回</th>
                <th className="px-4 py-3 text-right">期末余额</th>
                <th className="px-4 py-3 text-right">出货金额</th>
                <th className="px-4 py-3 text-right">有效索赔</th>
                <th className="px-4 py-3 text-right">重复索赔</th>
                <th className="px-4 py-3 text-center">规则版本</th>
                <th className="px-4 py-3 text-center">数据快照</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((calc, idx) => (
                <tr key={calc.id} className="table-row">
                  <td className="px-4 py-3 font-medium text-slate-800">{calc.batchNo}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(calc.beginningReserve)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">+{formatCurrency(calc.currentAccrual)}</td>
                  <td className="px-4 py-3 text-right text-amber-600 font-medium">-{formatCurrency(calc.currentWriteBack)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${calc.endingReserve < 0 ? 'text-rose-600' : 'text-primary-800'}`}>
                    {formatCurrency(calc.endingReserve)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(calc.shipmentAmount)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(calc.claimAmount)}</td>
                  <td className={`px-4 py-3 text-right ${calc.duplicateClaimAmount > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {formatCurrency(calc.duplicateClaimAmount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="badge badge-info">{calc.ruleVersion}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-mono text-slate-500" title={calc.dataSnapshot.dataHash}>
                      {calc.dataSnapshot.dataHash.slice(0, 8)}...
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
