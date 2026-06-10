import { Clock, UserCog, ShieldAlert, CheckCheck, AlertOctagon, AlertCircle, Info, User, Settings, ClipboardCheck, ArrowRight } from "lucide-react";
import { PrimerSample, SampleStatus } from "@/types";

interface SuggestionListProps {
  sample: PrimerSample;
}

interface ActionStep {
  id: number;
  action: string;
  detail: string;
  role: "student" | "admin" | "qa";
  duration: string;
  urgency: "critical" | "high" | "medium" | "low";
}

const roleConfig = {
  student: {
    label: "学生执行",
    icon: <User className="w-4 h-4" />,
    bg: "bg-blue-100 text-blue-700 border-blue-200",
  },
  admin: {
    label: "管理员",
    icon: <Settings className="w-4 h-4" />,
    bg: "bg-primary-100 text-primary-700 border-primary-200",
  },
  qa: {
    label: "质量负责人",
    icon: <ClipboardCheck className="w-4 h-4" />,
    bg: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

const urgencyConfig = {
  critical: {
    label: "立即执行",
    icon: <AlertOctagon className="w-3.5 h-3.5" />,
    badge: "bg-red-500 text-white",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
  high: {
    label: "24小时内",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    badge: "bg-amber-500 text-white",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  medium: {
    label: "3天内",
    icon: <Info className="w-3.5 h-3.5" />,
    badge: "bg-primary-500 text-white",
    dot: "bg-primary-500",
    bar: "bg-primary-500",
  },
  low: {
    label: "建议",
    icon: <CheckCheck className="w-3.5 h-3.5" />,
    badge: "bg-teal-500 text-white",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },
};

function buildSteps(sample: PrimerSample): ActionStep[] {
  switch (sample.status) {
    case SampleStatus.ABNORMAL:
      return [
        {
          id: 1,
          action: "立即停止使用本批次样本",
          detail: `将 ${sample.name}（${sample.id}）从待实验架移出，单独放入"待复核"专区并贴红标签。严禁混入qPCR实验，以免浪费试剂与时间。`,
          role: "student",
          duration: "5分钟",
          urgency: "critical",
        },
        {
          id: 2,
          action: "联系动物房管理员核验采样环境",
          detail: `携带本报告找到李主管，核对 ${sample.location} 的历史记录（本月已3次异常）。确认该笼架消杀进度和可用替代采样位置。`,
          role: "admin",
          duration: "30分钟",
          urgency: "high",
        },
        {
          id: 3,
          action: "安排重新采样",
          detail: `在管理员指定的已消杀笼架位置重新采集 ${sample.name} 的平行样本。采样前用75%乙醇擦拭器械，更换一次性手套，避免交叉污染。`,
          role: "student",
          duration: "1小时",
          urgency: "high",
        },
        {
          id: 4,
          action: "如必须保留原组织样本，执行1:10稀释重提",
          detail: "取原组织5mg，用PBS洗涤3次后1:10稀释重新提取RNA，送样时在备注栏标注\"稀释重提-原样本异常\"。",
          role: "student",
          duration: "2.5小时",
          urgency: "medium",
        },
        {
          id: 5,
          action: "质量负责人确认处置方案",
          detail: "质量负责人张老师复核本批次所有样本（共3份），确认环境污染范围，更新C-2-11笼架状态并通知同批试剂使用者。",
          role: "qa",
          duration: "1小时",
          urgency: "medium",
        },
      ];

    case SampleStatus.BORDERLINE:
      return [
        {
          id: 1,
          action: "提交管理员复核申请",
          detail: `携带本报告到管理员办公室，申请复核 ${sample.name}。复核时请一并提供电泳图或Nanodrop浓度检测记录作为辅助材料。`,
          role: "student",
          duration: "15分钟",
          urgency: "high",
        },
        {
          id: 2,
          action: "管理员核验B-1-07笼架温湿度记录",
          detail: "核查6月10日凌晨温度波动事件，评估是否对样本产生实质影响。调阅该位置前后3天的采样记录对比分析。",
          role: "admin",
          duration: "30分钟",
          urgency: "high",
        },
        {
          id: 3,
          action: "运行梯度PCR验证最佳退火温度",
          detail: "设置温度梯度52℃-60℃（共8个梯度，每格1℃），每孔加样量与标准程序一致。电泳观察各梯度条带亮度与纯度。",
          role: "student",
          duration: "3小时",
          urgency: "medium",
        },
        {
          id: 4,
          action: "并行跑熔解曲线确认引物二聚体",
          detail: "qPCR结束后运行熔解曲线程序（60℃→95℃，每步0.5℃），若出现单尖锐峰且无二聚体峰，可由管理员调整为正常放行。",
          role: "student",
          duration: "1小时",
          urgency: "medium",
        },
        {
          id: 5,
          action: "复核通过后更新状态",
          detail: "若梯度PCR+熔解曲线验证通过，管理员在系统中确认放行，样本状态从\"边界待确认\"更新为\"正常\"，履历自动记录。",
          role: "admin",
          duration: "10分钟",
          urgency: "low",
        },
      ];

    case SampleStatus.NORMAL:
    default:
      return [
        {
          id: 1,
          action: "样本直接用于后续qPCR实验",
          detail: `${sample.name} 六项指标全部合格，可按原定实验计划使用。建议与同批次 ${sample.batch} 其他引物一并安排上机。`,
          role: "student",
          duration: "—",
          urgency: "low",
        },
        {
          id: 2,
          action: "按标准条件保存引物",
          detail: `将引物稀释至10μM工作浓度，分装后保存于-20℃冰箱。避免反复冻融（建议单次使用量分装），长期储存置于-80℃。`,
          role: "student",
          duration: "10分钟",
          urgency: "low",
        },
        {
          id: 3,
          action: "使用相同PCR程序参数",
          detail: `预变性95℃ 30s → 循环阶段（95℃ 5s / 60℃ 30s）×40 → 熔解曲线分析。与本批次其他样本使用相同程序便于后续比对。`,
          role: "student",
          duration: "—",
          urgency: "low",
        },
        {
          id: 4,
          action: "建议保留实验原始记录",
          detail: "实验完成后，将Cq值、熔解曲线峰图、扩增曲线截图整理上传至实验记录系统，便于后续追溯与数据分析。",
          role: "student",
          duration: "15分钟",
          urgency: "low",
        },
      ];
  }
}

export default function SuggestionList({ sample }: SuggestionListProps) {
  const steps = buildSteps(sample);
  const totalSteps = steps.length;
  const criticalCount = steps.filter((s) => s.urgency === "critical").length;
  const highCount = steps.filter((s) => s.urgency === "high").length;

  const headerIcon = sample.status === SampleStatus.ABNORMAL ? (
    <ShieldAlert className="w-6 h-6 text-white print:w-5 print:h-5" />
  ) : sample.status === SampleStatus.BORDERLINE ? (
    <AlertCircle className="w-6 h-6 text-white print:w-5 print:h-5" />
  ) : (
    <CheckCheck className="w-6 h-6 text-white print:w-5 print:h-5" />
  );

  const headerBg = sample.status === SampleStatus.ABNORMAL
    ? "bg-gradient-to-r from-red-600 to-red-700"
    : sample.status === SampleStatus.BORDERLINE
    ? "bg-gradient-to-r from-amber-500 to-amber-600"
    : "bg-gradient-to-r from-teal-600 to-teal-700";

  return (
    <div className="bg-white rounded-xl border border-primary-200 shadow-card overflow-hidden print:shadow-none print:border-2 print:rounded-lg">
      <div className={`${headerBg} px-6 py-4 print:px-5 print:py-3`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {headerIcon}
            <h2 className="text-xl font-bold text-white tracking-wide print:text-lg">
              建议操作清单
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap print:gap-2">
            <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 print:px-2.5 print:py-1">
              <span className="text-[11px] text-white/80 print:text-[9px]">共</span>
              <span className="text-sm font-bold text-white mx-1 print:text-xs">{totalSteps}</span>
              <span className="text-[11px] text-white/80 print:text-[9px]">步</span>
            </div>
            {criticalCount > 0 && (
              <div className="bg-red-400 rounded-lg px-3 py-1.5 print:px-2.5 print:py-1">
                <span className="text-sm font-bold text-white print:text-xs">⚠ {criticalCount} 紧急</span>
              </div>
            )}
            {highCount > 0 && (
              <div className="bg-white/25 backdrop-blur rounded-lg px-3 py-1.5 print:px-2.5 print:py-1">
                <span className="text-sm font-bold text-white print:text-xs">⏱ {highCount} 高优先</span>
              </div>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-sm text-white/90 print:text-xs">
          按顺序逐条执行，每完成一项在纸质报告上打勾确认
        </p>
      </div>

      <div className="p-6 print:p-5">
        <div className="relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-primary-100 print:left-[15px]" />

          <div className="space-y-0">
            {steps.map((step, idx) => {
              const urgency = urgencyConfig[step.urgency];
              const role = roleConfig[step.role];
              const isLast = idx === steps.length - 1;

              return (
                <div key={step.id} className="relative pl-14 pb-6 print:pl-12 print:pb-5 last:pb-0">
                  <div
                    className={`absolute left-0 top-0 w-10 h-10 rounded-full ${urgency.badge} flex items-center justify-center text-white font-bold text-base shadow-lg ring-4 ring-white print:w-8 print:h-8 print:text-sm print:ring-2 z-10`}
                  >
                    {step.id}
                  </div>

                  <div className="bg-white border border-primary-200 rounded-xl p-4 ml-1 shadow-sm hover:shadow-md transition-shadow print:shadow-none print:border print:rounded-lg print:p-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <h3 className="text-base font-bold text-primary-900 leading-snug print:text-sm">
                        {step.action}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold ${urgency.badge} print:px-1.5 print:py-0.5 print:text-[9px]`}>
                          {urgency.icon}
                          {urgency.label}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-primary-700 leading-relaxed mb-3 print:text-xs">
                      {step.detail}
                    </p>

                    <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-primary-100 print:gap-3">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${role.bg} print:px-2 print:py-0.5 print:text-[10px]`}>
                        {role.icon}
                        <span>{role.label}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-primary-500 print:text-[10px]">
                        <Clock className="w-3.5 h-3.5 print:w-3 print:h-3" />
                        <span>预计 {step.duration}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-xs text-primary-500 ml-auto print:ml-0 print:text-[10px]">
                        <UserCog className="w-3.5 h-3.5 print:w-3 print:h-3" />
                        <span>{step.role === "student" ? sample.operator : step.role === "admin" ? "李主管" : "张质量"}</span>
                      </div>
                    </div>
                  </div>

                  {!isLast && (
                    <div className="absolute left-[38px] top-[52px] text-primary-300 print:hidden">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
