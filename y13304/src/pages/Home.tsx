import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Copy
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../components/MetricCard';
import { StatusBadge, EvaluationTypeBadge } from '../components/StatusBadge';
import { useDashboardStore } from '../store/dashboardStore';
import { modelVersions } from '../data/mockData';
import { cn } from '../lib/utils';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Home() {
  const { getMetrics, getDuplicateRecords, tickets } = useDashboardStore();
  const metrics = getMetrics();
  const duplicateRecords = getDuplicateRecords();
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const statusData = [
    { name: '已处理', value: metrics.processedCount, color: '#10B981' },
    { name: '待处理', value: metrics.pendingCount, color: '#F59E0B' },
    { name: '需补证据', value: metrics.needEvidenceCount, color: '#F97316' },
    { name: '重复评测', value: metrics.duplicateCount, color: '#EF4444' },
  ];

  const versionData = modelVersions.map(version => {
    const versionEvals = tickets.flatMap(t => t.evaluations)
      .filter(e => e.modelVersion === version && !e.isDuplicate);
    const correct = versionEvals.filter(e => e.judgment === 'correct').length;
    const incorrect = versionEvals.filter(e => e.judgment === 'incorrect').length;
    return {
      name: version,
      正确: correct,
      错误: incorrect,
    };
  });

  return (
    <div className="space-y-6" style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 0.5s ease' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="评测总量"
          value={metrics.totalEvaluations}
          icon={<BarChart3 size={24} />}
          color="info"
          suffix="条"
        />
        <MetricCard
          title="去重后有效量"
          value={metrics.validEvaluations}
          icon={<CheckCircle2 size={24} />}
          color="success"
          suffix="条"
          highlight
        />
        <MetricCard
          title="重复率"
          value={metrics.duplicateRate.toFixed(1)}
          icon={<AlertTriangle size={24} />}
          color="danger"
          suffix="%"
          trend={{ value: 2.3, direction: 'up', label: '较上周' }}
        />
        <MetricCard
          title="后补备注占比"
          value={metrics.supplementaryRate.toFixed(1)}
          icon={<FileText size={24} />}
          color="warning"
          suffix="%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">处理进度统计</h3>
              <p className="text-sm text-slate-500 mt-1">工单处理状态分布</p>
            </div>
            <div className="flex gap-4">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-slate-600">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={versionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                  }} 
                />
                <Bar dataKey="正确" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="错误" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">工单状态分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{item.name}</span>
                <span className="font-mono font-semibold text-slate-800">
                  {item.value} 条 ({((item.value / tickets.length) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <AlertCircle className="text-red-500" size={20} />
              重复评测预警
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              以下工单存在重复评测记录，点击可追溯原始工单说法
            </p>
          </div>
          <Link 
            to="/exceptions"
            className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            处理全部 <ChevronRight size={16} />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {duplicateRecords.map((record, index) => {
            const normalEval = record.evaluations.find(e => !e.isDuplicate);
            const duplicateEvals = record.evaluations.filter(e => e.isDuplicate);
            
            return (
              <div 
                key={record.ticketId} 
                className={cn(
                  "p-5 hover:bg-slate-50 transition-colors",
                  "animate-pulse-once"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {record.ticketNo}
                      </span>
                      <StatusBadge status="duplicate" />
                      <button 
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        onClick={() => navigator.clipboard.writeText(record.ticketNo)}
                        title="复制工单号"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg p-3 mb-3 border border-slate-200">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        <span className="text-xs text-slate-400 font-medium block mb-1">原始工单说法：</span>
                        {record.originalContent}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-slate-500">发现时间：{record.detectedAt}</span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <EvaluationTypeBadge type="normal" />
                        <span className="text-xs text-slate-500">
                          {normalEval?.evaluatedAt} · {normalEval?.evaluatedBy}
                        </span>
                      </div>
                      
                      {duplicateEvals.map((dupEval) => (
                        <div key={dupEval.id} className="flex flex-wrap items-center gap-2">
                          <EvaluationTypeBadge type="duplicate" />
                          <span className="text-xs text-red-600 font-medium">
                            重复提交
                          </span>
                          <span className="text-xs text-slate-500">
                            {dupEval.evaluatedAt} · {dupEval.evaluatedBy}
                          </span>
                          {dupEval.judgeNotes && (
                            <span className="text-xs text-slate-400 italic">
                              备注：{dupEval.judgeNotes}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Link 
                      to={`/tickets?ticket=${record.ticketId}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      查看详情 <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '已处理', count: metrics.processedCount, color: 'bg-green-500', status: 'processed' },
          { label: '待处理', count: metrics.pendingCount, color: 'bg-amber-500', status: 'pending' },
          { label: '需补证据', count: metrics.needEvidenceCount, color: 'bg-orange-500', status: 'need_evidence' },
          { label: '重复评测', count: metrics.duplicateCount, color: 'bg-red-500', status: 'duplicate' },
        ].map((item) => (
          <Link 
            key={item.status}
            to={`/tickets?status=${item.status}`}
            className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={cn("w-3 h-3 rounded-full", item.color)} />
              <span className="text-sm text-slate-600 group-hover:text-slate-800">{item.label}</span>
              <span className="ml-auto text-2xl font-bold font-mono text-slate-800">
                {item.count}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
