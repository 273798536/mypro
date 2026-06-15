import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  FileText,
  HelpCircle,
  Layers,
  MapPin,
  PlayCircle,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: "entry" | "normal" | "exit";
}

const STEPS: GuideStep[] = [
  {
    id: "entry",
    title: "材料入口 · 从这里开始",
    description:
      "所有投诉点位已呈现在3D地图中。橙色闪烁的是街口冲突点位，品红色的是重复投诉。点击任意点位查看详情。",
    icon: <MapPin size={20} />,
    type: "entry",
  },
  {
    id: "filter",
    title: "筛选面板",
    description:
      "左侧面板支持按来源、状态过滤。注意：「来源」和「处理状态」是保底字段，无论GIS字段名如何变化都能识别。",
    icon: <SlidersHorizontal size={20} />,
    type: "normal",
  },
  {
    id: "timeline",
    title: "时间轴回放",
    description:
      "拖动底部时间轴可回放投诉从受理到裁定的全流程。播放按钮可自动演示各阶段状态变化。",
    icon: <PlayCircle size={20} />,
    type: "normal",
  },
  {
    id: "csv",
    title: "CSV明细联动",
    description:
      "右侧表格与地图双向联动。点选表格行，地图自动聚焦对应点位。重复投诉行有斜纹底色标注。",
    icon: <FileText size={20} />,
    type: "normal",
  },
  {
    id: "history",
    title: "判断历史留痕",
    description:
      "点位详情中可展开历史抽屉。规划师的每次修改都会完整记录，接班人可看到全部修改过程，不只是最终结果。",
    icon: <Layers size={20} />,
    type: "normal",
  },
  {
    id: "exit",
    title: "异常出口 · 遇到问题？",
    description:
      "字段缺失？数据异常？点击「重置筛选」回到初始状态。所有操作均可回溯，历史判断不可删除。",
    icon: <AlertCircle size={20} />,
    type: "exit",
  },
];

export function GuideLayer() {
  const isVisible = useAppStore((s) => s.isGuideVisible);
  const setGuideVisible = useAppStore((s) => s.setGuideVisible);
  const [step, setStep] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  if (!isVisible && !showHelp) {
    return (
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => {
          setShowHelp(true);
          setGuideVisible(true);
          setStep(0);
        }}
        className="absolute top-4 right-4 z-30 p-3 glass-panel rounded-full hover:bg-deepsea-500/60 text-slategray-300 hover:text-white transition-all shadow-lg"
        title="操作帮助"
      >
        <HelpCircle size={20} />
      </motion.button>
    );
  }

  const handleClose = () => {
    setGuideVisible(false);
    setShowHelp(false);
    setStep(0);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50"
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[92vw] glass-panel-strong rounded-2xl overflow-hidden shadow-2xl border-2 ${
            currentStep.type === "entry"
              ? "border-mint-500/50"
              : currentStep.type === "exit"
                ? "border-magenta-500/50"
                : "border-deepsea-400/30"
          }`}
        >
          <div
            className={`px-6 py-4 ${
              currentStep.type === "entry"
                ? "bg-gradient-to-r from-mint-500/20 to-transparent"
                : currentStep.type === "exit"
                  ? "bg-gradient-to-r from-magenta-500/20 to-transparent"
                  : "bg-deepsea-700/40"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    currentStep.type === "entry"
                      ? "bg-mint-500/30 text-mint-300"
                      : currentStep.type === "exit"
                        ? "bg-magenta-500/30 text-magenta-300"
                        : "bg-amberwarm-500/30 text-amberwarm-300"
                  }`}
                >
                  {currentStep.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        currentStep.type === "entry"
                          ? "bg-mint-500/30 text-mint-200"
                          : currentStep.type === "exit"
                            ? "bg-magenta-500/30 text-magenta-200"
                            : "bg-deepsea-500/50 text-deepsea-200"
                      }`}
                    >
                      {currentStep.type === "entry"
                        ? "材料入口"
                        : currentStep.type === "exit"
                          ? "异常出口"
                          : "功能说明"}
                    </span>
                    <span className="text-xs text-slategray-500 font-mono">
                      {step + 1}/{STEPS.length}
                    </span>
                  </div>
                  <h3 className="font-serif text-white text-lg mt-0.5">{currentStep.title}</h3>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-deepsea-500/40 text-slategray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6">
            <p className="text-slategray-200 text-sm leading-relaxed font-serif">
              {currentStep.description}
            </p>
          </div>

          <div className="flex items-center justify-between px-6 pb-6">
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === step
                      ? s.type === "entry"
                        ? "bg-mint-400 w-6"
                        : s.type === "exit"
                          ? "bg-magenta-400 w-6"
                          : "bg-amberwarm-400 w-6"
                      : i < step
                        ? "bg-deepsea-400"
                        : "bg-deepsea-600"
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {!isFirst && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-xl bg-deepsea-600/60 text-slategray-300 text-sm hover:bg-deepsea-500/60 transition-colors"
                >
                  上一步
                </button>
              )}
              <button
                onClick={() => {
                  if (isLast) {
                    handleClose();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all ${
                  currentStep.type === "entry"
                    ? "bg-gradient-to-r from-mint-500 to-mint-600 hover:shadow-glow-mint"
                    : currentStep.type === "exit"
                      ? "bg-gradient-to-r from-magenta-500 to-magenta-600 hover:shadow-glow-magenta"
                      : "bg-gradient-to-r from-amberwarm-400 to-amberwarm-600 hover:shadow-glow"
                }`}
              >
                {isLast ? "开始使用" : "继续"}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => setStep(isLast ? 0 : step + 1)}
          className="absolute top-1/2 left-8 -translate-y-1/2 hidden"
        >
          <ArrowRight size={32} className="text-white/40" />
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}
