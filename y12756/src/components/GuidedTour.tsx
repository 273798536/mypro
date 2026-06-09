import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

interface Props {
  step: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  total: number;
}

const steps = [
  {
    title: "欢迎使用金属离子络合判读工作台",
    desc: "本系统将化学老师桌上的安全备注、谱图数据、批次报告整合到一个页面。\n我们通过一个真实教学样例，体验完整的判读流程。",
    tip: "提示：顶部可以切换不同批次的样例。",
  },
  {
    title: "第一步：开始判读",
    desc: "点击「开始判读」按钮，系统会根据 Beer-Lambert 定律和特征吸收峰自动判断络合结果。\n判读后谱图、数据表、报告会同步生成。",
    tip: "如果没点「开始判读」，数据不会出现在右侧报告中。",
  },
  {
    title: "第二步：重复运行 —— 验证可复现性",
    desc: "实验科学的基本要求是可复现。点击「重复运行」，系统会对谱图数据引入 ±1% 的随机波动，模拟真实实验中的误差，观察判读结果是否稳定。",
    tip: "这也能演示给学生看：为什么同一批样本多次测量结果会有细微差别。",
  },
  {
    title: "第三步：补录数据 —— 填写漏记字段",
    desc: "日常实验记录经常出现漏填。在下方数据表中，红色斜纹背景的单元格表示漏记，点击「漏记·点击补录」或「缺单位」按钮即可填写。",
    tip: "补录后，判读结果会自动从「待确认」更新为实际判断。",
  },
  {
    title: "第四步：人工确认 —— 处理异常与离群值",
    desc: "遇到明显离群的数据点或边界情况，点击「人工确认」按钮，可以用教师经验覆盖系统自动判断。\n所有人工操作都会在异常追踪面板中留下完整痕迹。",
    tip: "切到「异常追踪」标签页，可以看到浓度修正前后的对比数值。",
  },
  {
    title: "批号审计 —— 追踪数据来源",
    desc: "当多个学生使用同一批号时，常常出现记录冲突。切到「批号审计」标签页，可以看到重复批号的检测结果对比、漏记字段来源追踪，以及完整的材料溯源链路。",
    tip: "学生只看最后报告时，也能追溯到每条数据的原始记录位置。",
  },
  {
    title: "现在，来试试看吧",
    desc: "三个样例批次分别对应不同教学场景：\n• Fe-CN-2024-0612-A：基准正常样（含轻微异常点）\n• Cu-EDTA-2024-0612-B：问题批次（漏记、缺单位、离群值）\n• Ni-DMG-2024-0612-C：重复批号（单位冲突、时间单位错误）",
    tip: "建议先用 Cu-EDTA 问题批次走一遍完整流程！",
  },
];

export const GuidedTour = ({ step, onClose, onPrev, onNext, total }: Props) => {
  const current = steps[step];
  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-panel overflow-hidden">
        <div className="bg-gradient-to-br from-ink-800 to-ink-700 px-6 py-5 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 text-copper-300 mb-2">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest">
              步骤 {step + 1} / {total}
            </span>
          </div>
          <h2 className="font-serif text-xl font-semibold">{current.title}</h2>
          <div className="flex gap-1 mt-3">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-copper-400" : "bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-ink-700 whitespace-pre-line leading-relaxed font-serif text-sm">
            {current.desc}
          </div>
          <div className="rounded-lg bg-copper-50 border border-copper-100 p-3 text-xs text-copper-800 leading-relaxed">
            💡 {current.tip}
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-100 bg-ink-50/50">
          <button
            onClick={step === 0 ? onClose : onPrev}
            className="btn-secondary !px-3 !py-1.5 !text-xs"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {step === 0 ? "跳过" : "上一步"}
          </button>
          <button onClick={onNext} className="btn-primary !px-4 !py-1.5 !text-xs">
            {step === total - 1 ? "开始使用" : "下一步"}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const TOTAL_TOUR_STEPS = steps.length;
