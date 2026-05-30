import { useNavigate } from "react-router-dom";
import { Shield, Zap, ArrowRight, CheckCircle, PlayCircle, Lock, RotateCcw } from "lucide-react";
import { useGameStore } from "@/store/gameStore";
import { levels } from "@/data/levels";

const steps = [
  { label: "审单", icon: Shield },
  { label: "校验", icon: Lock },
  { label: "判断", icon: Zap },
  { label: "复盘", icon: CheckCircle },
];

const statusConfig = {
  completed: { label: "已完成", color: "bg-safe/20 text-safe", bar: "bg-safe", icon: CheckCircle },
  in_progress: { label: "进行中", color: "bg-amber/20 text-amber", bar: "bg-amber", icon: PlayCircle },
  pending: { label: "未开始", color: "bg-base-600/40 text-base-400", bar: "bg-base-600", icon: Lock },
};

export default function Lobby() {
  const navigate = useNavigate();
  const getLevelState = useGameStore((s) => s.getLevelState);
  const resetLevel = useGameStore((s) => s.resetLevel);

  const handleLevelClick = (levelId: string) => {
    navigate(`/workspace/${levelId}`);
  };

  const handleReset = (e: React.MouseEvent, levelId: string) => {
    e.stopPropagation();
    resetLevel(levelId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-base-900 via-base-900 to-base-800/50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center opacity-0 animate-fade-in-up">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-base-800 px-4 py-1.5 text-sm text-base-300">
            <Shield size={16} className="text-info" />
            <span>FX-RCB Training System</span>
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-base-100 sm:text-5xl">
            外汇交易风控局
          </h1>
          <p className="mt-2 text-lg text-base-400">风控实训原型系统</p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {levels.map((level, index) => {
            const state = getLevelState(level.id);
            const config = statusConfig[state.status];
            const StatusIcon = config.icon;
            const LevelIcon = level.id === "1" ? Shield : Zap;

            return (
              <div
                key={level.id}
                className={`stagger-${index + 1} group relative overflow-hidden rounded-xl border border-base-700 bg-base-800 opacity-0 animate-fade-in-up transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30`}
              >
                <div className={`absolute left-0 top-0 h-full w-1.5 ${config.bar}`} />

                <div className="p-6 pl-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-base-700">
                        <LevelIcon size={20} className="text-base-200" />
                      </div>
                      <div>
                        <p className="text-xs text-base-400">
                          Level {level.id}
                        </p>
                        <h2 className="text-lg font-semibold text-base-100">
                          {level.name}
                        </h2>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.color}`}
                    >
                      <StatusIcon size={12} />
                      {config.label}
                    </span>
                  </div>

                  <p className="mb-4 text-sm leading-relaxed text-base-300">
                    {level.description}
                  </p>

                  <div className="mb-4 flex items-center gap-4 text-xs text-base-400">
                    <span>
                      订单 <span className="font-mono text-base-200">{level.orders.length}</span> 笔
                    </span>
                    {level.quotaLoadDelay > 0 && (
                      <span className="text-amber">额度延迟加载</span>
                    )}
                    {level.quotaLoadDelay === 0 && (
                      <span>额度正常</span>
                    )}
                  </div>

                  {state.status === "completed" && (
                    <div className="mb-4 flex items-center gap-3">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-safe/10 px-3 py-1.5">
                        <CheckCircle size={14} className="text-safe" />
                        <span className="text-sm text-safe">
                          得分 <span className="font-mono font-semibold">{state.score}</span>
                        </span>
                      </div>
                      <button
                        onClick={(e) => handleReset(e, level.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-base-700 px-2.5 py-1.5 text-xs text-base-400 hover:bg-base-600 hover:text-base-200 transition-colors"
                      >
                        <RotateCcw size={12} />
                        重置
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => handleLevelClick(level.id)}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-base-700 px-4 py-2.5 text-sm font-medium text-base-200 transition-colors hover:bg-base-600 hover:text-base-100"
                  >
                    进入
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-14 opacity-0 animate-fade-in-up stagger-3">
          <p className="mb-6 text-center text-sm text-base-400">实训流程</p>
          <div className="flex items-center justify-center">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.label} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-base-600 bg-base-800">
                      <StepIcon size={20} className="text-base-300" />
                    </div>
                    <span className="text-xs text-base-400">{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="mx-3 h-px w-10 bg-base-600 sm:w-16" />
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
