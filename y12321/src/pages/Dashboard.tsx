import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Upload, 
  Download, 
  Database,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Sparkles,
  Trash2
} from 'lucide-react';
import { useAnalysisStore } from '../store/useAnalysisStore';
import { cn } from '../lib/utils';

const statCardColors: Record<string, { border: string; text: string; bg: string }> = {
  emerald: { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  amber: { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500/10' },
  red: { border: 'border-red-500/30', text: 'text-red-400', bg: 'bg-red-500/10' },
  purple: { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  blue: { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500/10' },
};

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color,
  delay = 0 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color: keyof typeof statCardColors;
  delay?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const colorConfig = statCardColors[color] || statCardColors.blue;

  useEffect(() => {
    const timer = setTimeout(() => {
      const duration = 800;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className={cn(
      'bg-slate-800/50 border rounded-lg p-5 transition-all duration-300 hover:bg-slate-800 hover:shadow-lg',
      colorConfig.border
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className={cn(
            'text-3xl font-bold mt-2 font-mono',
            colorConfig.text
          )}>
            {displayValue}
          </p>
        </div>
        <div className={cn(
          'p-3 rounded-lg',
          colorConfig.bg
        )}>
          <Icon className={cn('w-6 h-6', colorConfig.text)} />
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ 
  icon: Icon, 
  label, 
  description, 
  to, 
  variant = 'default',
  onClick
}: { 
  icon: any; 
  label: string; 
  description: string; 
  to?: string;
  variant?: 'default' | 'primary' | 'danger';
  onClick?: () => void;
}) => {
  const variantStyles = {
    default: 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50',
    primary: 'border-blue-500/30 hover:border-blue-500/50 hover:bg-blue-500/5',
    danger: 'border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5',
  };

  const content = (
    <div className={cn(
      'p-4 border rounded-lg transition-all duration-200 cursor-pointer',
      variantStyles[variant]
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          variant === 'primary' ? 'bg-blue-500/10' : 
          variant === 'danger' ? 'bg-red-500/10' : 'bg-slate-800'
        )}>
          <Icon className={cn(
            'w-5 h-5',
            variant === 'primary' ? 'text-blue-400' :
            variant === 'danger' ? 'text-red-400' : 'text-slate-400'
          )} />
        </div>
        <div>
          <p className="font-medium text-white">{label}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );

  if (to) {
    return <Link to={to}>{content}</Link>;
  }
  
  return <div onClick={onClick}>{content}</div>;
};

export default function Dashboard() {
  const { records, auditLogs, loadDemoData, clearAllData } = useAnalysisStore();
  
  const normalCount = records.filter(r => r.status === 'normal').length;
  const pendingCount = records.filter(r => r.status === 'pending').length;
  const abnormalCount = records.filter(r => r.status === 'abnormal').length;
  const modifiedCount = records.filter(r => r.lagModified).length;

  const hasData = records.length > 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="w-6 h-6 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">工作台</h1>
        </div>
        <p className="text-slate-400">批量检测相关性误判，将来源、判断、结果串联成完整证据链</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard 
          icon={CheckCircle} 
          label="正常明细" 
          value={normalCount} 
          color="emerald"
          delay={0}
        />
        <StatCard 
          icon={Clock} 
          label="待确认" 
          value={pendingCount} 
          color="amber"
          delay={100}
        />
        <StatCard 
          icon={AlertTriangle} 
          label="异常" 
          value={abnormalCount} 
          color="red"
          delay={200}
        />
        <StatCard 
          icon={FileText} 
          label="人工修改" 
          value={modifiedCount} 
          color="purple"
          delay={300}
        />
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickAction
            icon={PlusCircle}
            label="新增分析记录"
            description="录入指标数据进行相关性分析"
            to="/data-entry"
            variant="primary"
          />
          <QuickAction
            icon={Upload}
            label="批量导入数据"
            description="通过CSV批量导入多组实验数据"
            to="/data-entry"
          />
          <QuickAction
            icon={Sparkles}
            label="加载样例数据"
            description="加载1条正常+1条待确认+1条异常的演示数据"
            onClick={loadDemoData}
          />
          <QuickAction
            icon={Database}
            label="查看分析结果"
            description="三清单体系：正常/待确认/异常"
            to="/analysis"
          />
          <QuickAction
            icon={Download}
            label="导出分析报告"
            description="导出正常结果和算不了的原因"
            to="/export"
          />
          <QuickAction
            icon={Trash2}
            label="清空所有数据"
            description="清除本地存储的所有记录"
            variant="danger"
            onClick={() => {
              if (confirm('确定要清空所有数据吗？此操作不可撤销。')) {
                clearAllData();
              }
            }}
          />
        </div>
      </div>

      {!hasData ? (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
          <Sparkles className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">开始你的分析</h3>
          <p className="text-slate-400 mb-4">点击"加载样例数据"查看三条演示记录，验证正常、待确认、样本太少分支是否生效</p>
          <button
            onClick={loadDemoData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            加载样例数据
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-white mb-4">最近记录</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left py-2 px-3 font-medium">记录ID</th>
                  <th className="text-left py-2 px-3 font-medium">指标对</th>
                  <th className="text-left py-2 px-3 font-medium">样本量</th>
                  <th className="text-left py-2 px-3 font-medium">状态</th>
                  <th className="text-left py-2 px-3 font-medium">相关系数</th>
                  <th className="text-left py-2 px-3 font-medium">判断结论</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(-5).reverse().map((record) => (
                  <tr key={record.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {record.id}
                      {record.lagModified && <span className="text-purple-400 ml-1">*</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-blue-400">{record.metricA}</span>
                      <span className="text-slate-600 mx-1">→</span>
                      <span className="text-cyan-400">{record.metricB}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{record.sampleSize}</td>
                    <td className="py-3 px-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        record.status === 'normal' && 'bg-emerald-500/10 text-emerald-400',
                        record.status === 'pending' && 'bg-amber-500/10 text-amber-400',
                        record.status === 'abnormal' && 'bg-red-500/10 text-red-400'
                      )}>
                        {record.status === 'normal' ? '正常' : record.status === 'pending' ? '待确认' : '异常'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      r = {record.correlationCoeff.toFixed(3)}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate" title={record.judgment}>
                      {record.judgment}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              显示最近 {Math.min(5, records.length)} 条记录，共 {records.length} 条
              {auditLogs.length > 0 && ` · ${auditLogs.length} 条改动记录`}
            </p>
            <Link 
              to="/analysis" 
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              查看全部 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
