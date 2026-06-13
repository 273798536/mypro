import { useState } from 'react';
import {
  Footprints,
  Upload,
  AlertTriangle,
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  ChevronRight,
  ArrowUpRight,
  Lightbulb,
  ListTodo,
  MapPin,
  Download,
  Eye,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  color: string;
  bgColor: string;
  sourceHints?: string[];
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  sourceHints,
  onClick,
}: StatCardProps) {
  const [showHints, setShowHints] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowHints(true)}
      onMouseLeave={() => setShowHints(false)}
      className={cn(
        'relative p-5 rounded-lg border bg-slate-900/50 border-slate-800 transition-all',
        onClick && 'cursor-pointer hover:bg-slate-800/50 hover:border-slate-700'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-slate-400">{title}</div>
          <div className={cn('text-3xl font-bold mt-2', color)}>{value}</div>
          {subtitle && (
            <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
      </div>

      {sourceHints && showHints && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Footprints className="w-3.5 h-3.5" />
            数字来源线索
          </div>
          <div className="space-y-1">
            {sourceHints.map((hint, idx) => (
              <div key={idx} className="text-xs text-slate-500 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                {hint}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface QuickActionProps {
  icon: any;
  title: string;
  description: string;
  color: string;
  onClick?: () => void;
}

function QuickAction({ icon: Icon, title, description, color, onClick }: QuickActionProps) {
  return (
    <div
      onClick={onClick}
      className="p-5 rounded-lg border bg-slate-900/50 border-slate-800 hover:bg-slate-800/50 hover:border-slate-700 cursor-pointer transition-all group"
    >
      <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center mb-4', color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-base font-medium text-slate-200">{title}</div>
          <div className="text-xs text-slate-500 mt-1">{description}</div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </div>
  );
}

interface TodoItemProps {
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

function TodoItem({ text, completed, priority }: TodoItemProps) {
  const priorityColors = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-green-500',
  };

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-md transition-colors',
      completed ? 'opacity-50' : 'hover:bg-slate-800/30'
    )}>
      <div className={cn(
        'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0',
        completed
          ? 'bg-green-500 border-green-500'
          : 'border-slate-600 hover:border-slate-500'
      )}>
        {completed && <CheckCircle className="w-3 h-3 text-white" />}
      </div>
      <span className={cn(
        'text-sm flex-1',
        completed ? 'text-slate-600 line-through' : 'text-slate-300'
      )}>
        {text}
      </span>
      <span className={cn('w-2 h-2 rounded-full', priorityColors[priority])} />
    </div>
  );
}

export default function Handover() {
  const sensorLogs = useAppStore((s) => s.sensorLogs);
  const calculationResults = useAppStore((s) => s.calculationResults);
  const reports = useAppStore((s) => s.reports);
  const manualJudgments = useAppStore((s) => s.manualJudgments);

  const todayLogs = sensorLogs.filter((l) => {
    const logDate = new Date(l.startTime).toDateString();
    return logDate === new Date().toDateString();
  });

  const pendingReview = calculationResults.filter((r) => r.needsManualReview).length;
  const processedReports = reports.filter((r) => r.category === 'processed').length;
  const pendingReports = reports.filter((r) => r.category === 'pending_material').length;
  const manualReports = reports.filter((r) => r.category === 'manual_override').length;

  const highPriorityGaps = calculationResults.reduce(
    (sum, r) => sum + r.samplingGaps.filter((g) => g.severity === 'high').length,
    0
  );

  const todos: TodoItemProps[] = [
    { text: '补全下午实验批次B的传感器数据', completed: false, priority: 'high' },
    { text: '人工复核 2026-06-12 验证实验结果', completed: false, priority: 'high' },
    { text: '导出今日复算报告汇总', completed: false, priority: 'medium' },
    { text: '确认 v1.1.0 参数版本是否为当前标准', completed: true, priority: 'low' },
    { text: '整理上周异常数据归档', completed: true, priority: 'low' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-100">换班交接板</h1>
          <p className="text-sm text-slate-500 mt-1">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })} · 下午班交接
          </p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <StatCard
            title="今日复算"
            value={todayLogs.length}
            subtitle={`共 ${todayLogs.reduce((s, l) => s + l.pointCount, 0).toLocaleString()} 条数据`}
            icon={FileText}
            color="text-cyan-400"
            bgColor="bg-cyan-500/20"
            sourceHints={[
              '上午实验批次A (08:00-11:30)',
              '下午实验批次B (13:00-15:00)',
              '数据均来自传感器日志导入',
            ]}
          />
          <StatCard
            title="待人工确认"
            value={pendingReview}
            subtitle="需要值班人员复核"
            icon={AlertTriangle}
            color="text-amber-400"
            bgColor="bg-amber-500/20"
            sourceHints={[
              '采样缺口超过阈值触发',
              '置信度低于70%触发',
              '可在右侧详情面板处理',
            ]}
          />
          <StatCard
            title="高严重度缺口"
            value={highPriorityGaps}
            subtitle="影响数据完整性"
            icon={Clock}
            color="text-red-400"
            bgColor="bg-red-500/20"
            sourceHints={[
              '持续时间>60秒为高严重度',
              '涉及多个传感器时升级',
              '建议补采或人工确认',
            ]}
          />
          <StatCard
            title="人工改判"
            value={manualReports}
            subtitle={`共 ${manualJudgments.length} 条判读记录`}
            icon={Eye}
            color="text-purple-400"
            bgColor="bg-purple-500/20"
            sourceHints={[
              '改判原因均有记录',
              '包含下一步建议',
              '报告中会标注人工改判',
            ]}
          />
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="col-span-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-medium text-slate-200 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-cyan-400" />
                  待办事项
                </h2>
                <span className="text-xs text-slate-500">
                  {todos.filter((t) => !t.completed).length} / {todos.length} 未完成
                </span>
              </div>
              <div className="space-y-1">
                {todos.map((todo, idx) => (
                  <TodoItem key={idx} {...todo} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
              <h2 className="text-base font-medium text-slate-200 flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-400" />
                快速说明
              </h2>
              <div className="space-y-4 text-sm text-slate-400">
                <div>
                  <div className="text-slate-300 font-medium mb-1">📁 材料放哪里？</div>
                  <p className="text-xs leading-relaxed">
                    左侧「传感器日志」面板点「导入日志文件」，支持 JSON 和 CSV 格式。分批导入会自动合并，不会覆盖早先数据。
                  </p>
                </div>
                <div>
                  <div className="text-slate-300 font-medium mb-1">🔍 哪里看异常？</div>
                  <p className="text-xs leading-relaxed">
                    右侧详情面板有「采样缺口」列表，红橙黄绿分别代表严重程度。带 ⚠️ 标记的需要人工确认。
                  </p>
                </div>
                <div>
                  <div className="text-slate-300 font-medium mb-1">📤 哪里重新导出？</div>
                  <p className="text-xs leading-relaxed">
                    顶部导航去「报告中心」，找到对应报告点右上角「导出」按钮，可下载 .md 格式报告。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-base font-medium text-slate-200 mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-green-400" />
            快速入口
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <QuickAction
              icon={Upload}
              title="上传材料"
              description="导入传感器日志文件"
              color="bg-gradient-to-br from-cyan-600 to-blue-600"
            />
            <QuickAction
              icon={AlertTriangle}
              title="查看异常"
              description="待人工确认的复算结果"
              color="bg-gradient-to-br from-amber-600 to-orange-600"
            />
            <QuickAction
              icon={RefreshCw}
              title="重新导出"
              description="生成或更新 Markdown 报告"
              color="bg-gradient-to-br from-purple-600 to-pink-600"
            />
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
          <h2 className="text-base font-medium text-slate-200 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-green-400" />
            报告分类说明
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-300">已处理</span>
              </div>
              <p className="text-xs text-green-400/70 leading-relaxed">
                系统自动判断通过，无需人工干预的复算结果。数据完整、指标达标、置信度高。
              </p>
            </div>
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">待补材料</span>
              </div>
              <p className="text-xs text-amber-400/70 leading-relaxed">
                数据不完整或有缺口，等待后续批次导入。后补材料不会覆盖早先判断，会重新生成报告。
              </p>
            </div>
            <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">人工改判</span>
              </div>
              <p className="text-xs text-purple-400/70 leading-relaxed">
                值班人员介入改判的结果，保留改判原因和下一步建议，报告中会明确标注。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
