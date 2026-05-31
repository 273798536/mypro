import { Link } from 'react-router-dom';
import { useAppStore } from '../store';
import {
  LayoutDashboard,
  Settings,
  Gauge,
  Calculator,
  FileBarChart,
  Download,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { StatusBadge } from '../components/ui/StatusBadge';
import { getSprayQualityLabel, getSprayQualityColor } from '../services/calculation';

export function Dashboard() {
  const { nozzles, pressureRecords, calculationResults } = useAppStore();
  
  const pendingCount = calculationResults.filter(r => r.status === 'pending').length;
  const blockedCount = calculationResults.filter(r => r.status === 'blocked').length;
  const normalCount = calculationResults.filter(r => r.status === 'normal').length;
  
  const recentResults = calculationResults.slice(-5).reverse();
  
  const quickActions = [
    { icon: Settings, label: '喷嘴参数管理', path: '/nozzles', count: nozzles.length, color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: Gauge, label: '压力记录', path: '/pressure', count: pressureRecords.length, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: Calculator, label: '开始试算', path: '/calculation', count: null, color: 'text-green-600', bg: 'bg-green-50' },
    { icon: FileBarChart, label: '查看结果', path: '/results', count: calculationResults.length, color: 'text-orange-600', bg: 'bg-orange-50' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">仪表盘</h1>
        <p className="text-slate-500 mt-1">欢迎使用流体喷嘴雾化试算系统</p>
      </div>
      
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">总试算次数</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{calculationResults.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calculator className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">正常</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{normalCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">待确认</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="text-amber-600" size={24} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">堵塞预警</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{blockedCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.path}
              to={action.path}
              className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${action.bg} rounded-lg flex items-center justify-center`}>
                    <Icon className={action.color} size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{action.label}</p>
                    {action.count !== null && (
                      <p className="text-sm text-slate-500">{action.count} 条记录</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors" size={20} />
              </div>
            </Link>
          );
        })}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">最近试算</h2>
          <Link to="/results" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            查看全部
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentResults.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              暂无试算记录，前往开始试算
            </div>
          ) : (
            recentResults.map((result) => {
              const nozzle = useAppStore.getState().getNozzleById(result.nozzleId);
              const pressure = useAppStore.getState().getPressureRecordById(result.pressureRecordId);
              
              let badgeType: 'success' | 'warning' | 'error' | 'pending' = 'success';
              if (result.status === 'pending') badgeType = 'pending';
              if (result.status === 'blocked') badgeType = 'error';
              else if (result.validationResult.viscosityMissing) badgeType = 'warning';
              
              return (
                <Link
                  key={result.id}
                  to={`/results/${result.id}`}
                  className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                      <FileBarChart className="text-slate-600" size={20} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{nozzle?.model || '未知喷嘴'}</p>
                      <p className="text-sm text-slate-500">
                        {pressure?.pressure || '-'} bar · {result.dropletSize.toFixed(1)} μm
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span 
                      className="font-medium"
                      style={{ color: getSprayQualityColor(result.sprayQuality) }}
                    >
                      {getSprayQualityLabel(result.sprayQuality)}
                    </span>
                    <StatusBadge type={badgeType}>
                      {result.status === 'pending' ? '待确认' : result.status === 'blocked' ? '堵塞预警' : result.validationResult.viscosityMissing ? '黏度待补' : '正常'}
                    </StatusBadge>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
