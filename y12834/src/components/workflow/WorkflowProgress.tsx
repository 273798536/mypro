import {
  Database,
  Brain,
  Tags,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

/**
 * 工作流步骤状态类型
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * 工作流进度条组件属性接口
 */
interface WorkflowProgressProps {
  /** 当前步骤索引（0-3） */
  currentStep: number;
  /** 整体状态 */
  status: StepStatus;
  /** 整体进度（0-100） */
  progress?: number;
}

/**
 * 工作流步骤配置
 */
const STEPS = [
  {
    key: 'data_loading',
    label: '数据加载',
    description: '加载样本和元数据',
    Icon: Database,
  },
  {
    key: 'ai_analysis',
    label: 'AI 分析',
    description: 'AI 模型推理处理',
    Icon: Brain,
  },
  {
    key: 'annotation_generation',
    label: '标注生成',
    description: '生成图像标注结果',
    Icon: Tags,
  },
  {
    key: 'qc_check',
    label: '质控检查',
    description: '质量控制和异常检测',
    Icon: ShieldCheck,
  },
] as const;

/**
 * 获取单个步骤的状态
 */
function getStepStatus(
  stepIndex: number,
  currentStep: number,
  overallStatus: StepStatus
): StepStatus {
  if (stepIndex < currentStep) {
    return 'completed';
  }
  if (stepIndex === currentStep) {
    return overallStatus === 'failed' ? 'failed' : overallStatus;
  }
  return 'pending';
}

/**
 * 获取步骤状态对应的样式配置
 */
function getStatusStyle(status: StepStatus) {
  switch (status) {
    case 'completed':
      return {
        iconBg: 'bg-life-green text-paper',
        iconRing: 'ring-4 ring-life-green/20',
        lineColor: 'bg-life-green',
        textColor: 'text-deep-ocean',
        subTextColor: 'text-deep-ocean/60',
      };
    case 'running':
      return {
        iconBg: 'bg-deep-ocean text-paper',
        iconRing: 'ring-4 ring-deep-ocean/20 animate-pulse-soft',
        lineColor: 'bg-deep-ocean/30',
        textColor: 'text-deep-ocean',
        subTextColor: 'text-deep-ocean/60',
      };
    case 'failed':
      return {
        iconBg: 'bg-corral-severe text-paper',
        iconRing: 'ring-4 ring-corral-severe/20',
        lineColor: 'bg-corral-severe/30',
        textColor: 'text-corral-severe',
        subTextColor: 'text-corral-severe/70',
      };
    default:
      return {
        iconBg: 'bg-paper-dark text-deep-ocean/40',
        iconRing: '',
        lineColor: 'bg-deep-ocean/10',
        textColor: 'text-deep-ocean/40',
        subTextColor: 'text-deep-ocean/30',
      };
  }
}

/**
 * 步骤状态灯组件
 */
function StatusIndicator({ status }: { status: StepStatus }) {
  switch (status) {
    case 'completed':
      return (
        <CheckCircle2
          size={14}
          className="text-life-green"
        />
      );
    case 'running':
      return (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-deep-ocean opacity-40" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-deep-ocean" />
        </span>
      );
    case 'failed':
      return <AlertCircle size={14} className="text-corral-severe" />;
    default:
      return <Circle size={14} className="text-deep-ocean/30" />;
  }
}

/**
 * 工作流进度条组件
 * 4 步横向进度条，带图标和状态灯
 */
export function WorkflowProgress({
  currentStep,
  status,
  progress,
}: WorkflowProgressProps) {
  return (
    <div className="bg-white rounded-lg shadow-soft border border-deep-ocean/5 p-6">
      {/* 整体进度条（可选显示） */}
      {progress !== undefined && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-deep-ocean">
              整体进度
            </span>
            <span className="text-sm font-mono text-deep-ocean/60 tabular">
              {progress}%
            </span>
          </div>
          <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'failed'
                  ? 'bg-corral-severe'
                  : status === 'completed'
                  ? 'bg-life-green'
                  : 'bg-deep-ocean'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 步骤横向进度 */}
      <div className="relative">
        {/* 连接线背景 */}
        <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-deep-ocean/10" />
        {/* 已完成连接线 */}
        <div
          className="absolute top-8 left-[12.5%] h-0.5 bg-life-green transition-all duration-500"
          style={{
            width: `${Math.min(
              ((currentStep + (status === 'completed' ? 1 : 0)) /
                (STEPS.length - 1)) *
                100,
              100
            )}%`,
          }}
        />

        {/* 步骤节点 */}
        <div className="grid grid-cols-4 gap-4">
          {STEPS.map((step, index) => {
            const stepStatus = getStepStatus(index, currentStep, status);
            const style = getStatusStyle(stepStatus);
            const { Icon } = step;

            return (
              <div key={step.key} className="relative flex flex-col items-center">
                {/* 图标节点 */}
                <div
                  className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${style.iconBg} ${style.iconRing}`}
                >
                  {stepStatus === 'running' ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Icon size={24} />
                  )}
                </div>

                {/* 步骤名称 */}
                <div
                  className={`mt-3 text-sm font-semibold ${style.textColor}`}
                >
                  {step.label}
                </div>

                {/* 步骤描述 */}
                <div
                  className={`mt-0.5 text-xs ${style.subTextColor}`}
                >
                  {step.description}
                </div>

                {/* 状态灯 */}
                <div className="mt-2">
                  <StatusIndicator status={stepStatus} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
