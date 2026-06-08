import { useSandboxStore } from "@/store/useSandboxStore";
import { Scene3D } from "@/components/Sandbox/Scene3D";
import { ParameterPanel } from "@/components/Panels/ParameterPanel";
import { CollisionPanel } from "@/components/Panels/CollisionPanel";
import { HistoryPanel } from "@/components/Panels/HistoryPanel";
import { ReportPanel } from "@/components/Panels/ReportPanel";
import {
  Shield,
  History,
  FileText,
  Layers,
  Building2,
  Info,
  X,
  Play,
} from "lucide-react";
import { useState, useEffect } from "react";

export function Workspace() {
  const { currentProject, activePanel, setActivePanel, runCollisionDetection, isDetecting } =
    useSandboxStore();
  const [showWelcome, setShowWelcome] = useState(currentProject.isFirstVisit);

  useEffect(() => {
    setShowWelcome(currentProject.isFirstVisit);
  }, [currentProject.isFirstVisit]);

  const pendingCount = currentProject.collisions.filter(
    (c) => c.status === "pending"
  ).length;

  const rightPanelConfig = [
    {
      key: "collision" as const,
      label: "碰撞检测",
      icon: Shield,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    { key: "history" as const, label: "历史追溯", icon: History, badge: null },
    { key: "report" as const, label: "报告生成", icon: FileText, badge: null },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-surface-950 via-primary-950 to-surface-950 overflow-hidden">
      <header className="h-14 flex items-center justify-between px-6 border-b border-surface-700/50 bg-surface-900/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow-primary">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-serif text-base font-semibold text-surface-100 tracking-wide">
              城市风廊体块沙盘
            </h1>
            <p className="text-[10px] text-surface-500 font-mono">
              {currentProject.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-[11px] text-surface-400">
            <Layers className="w-3.5 h-3.5 text-primary-400" />
            <span>{currentProject.blocks.length} 个体块</span>
            <span className="text-surface-600">·</span>
            <span>{currentProject.corridors.length} 条风廊</span>
            <span className="text-surface-600">·</span>
            <span>{currentProject.history.length} 条操作记录</span>
          </div>

          <button
            onClick={runCollisionDetection}
            disabled={isDetecting}
            className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isDetecting ? "animate-spin" : ""}`} />
            检测碰撞
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden min-h-0">
        <aside className="w-80 border-r border-surface-700/50 panel m-3 mr-1.5 flex-shrink-0 overflow-hidden">
          <ParameterPanel />
        </aside>

        <main className="flex-1 relative min-w-0 p-3 pl-1.5 pr-1.5">
          <div className="w-full h-full rounded-2xl overflow-hidden border border-surface-700/50 shadow-inner-glow relative">
            <Scene3D />

            <div className="absolute bottom-4 left-4 px-3 py-2 rounded-xl bg-surface-900/80 backdrop-blur-md border border-surface-700/50">
              <div className="flex items-center gap-2 text-[10px] text-surface-400 font-mono">
                <Info className="w-3 h-3" />
                拖拽旋转视角 · 滚轮缩放 · 点击体块编辑
              </div>
            </div>

            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {currentProject.collisions.slice(0, 3).map((col) => (
                <div
                  key={col.id}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-mono backdrop-blur-md border ${
                    col.severity === "high"
                      ? "bg-accent-danger/20 border-accent-danger/40 text-accent-danger"
                      : col.severity === "medium"
                      ? "bg-accent-warning/20 border-accent-warning/40 text-accent-warning"
                      : "bg-accent-info/20 border-accent-info/40 text-accent-info"
                  }`}
                >
                  {col.description}
                </div>
              ))}
            </div>

            {showWelcome && (
              <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="max-w-md p-6 rounded-2xl bg-surface-900 border border-primary-500/30 shadow-glow-primary animate-slide-up">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-center font-serif text-xl font-semibold text-surface-100 mb-2">
                    欢迎使用城市风廊体块沙盘
                  </h2>
                  <p className="text-center text-sm text-surface-400 mb-4 leading-relaxed">
                    我们已为您加载了一份包含典型场景的示例项目，
                    <br />
                    其中包括相机视角丢失记录、模型重叠等常见情况。
                  </p>
                  <div className="space-y-2 text-xs text-surface-400 mb-5 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
                    <div className="flex items-start gap-2">
                      <span className="text-primary-400">01</span>
                      <span>左侧面板可调整风廊参数，三维场景实时联动</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary-400">02</span>
                      <span>点击右侧"检测碰撞"查看问题列表和坐标</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary-400">03</span>
                      <span>每条记录都可追溯操作人和完整变更链路</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-primary-400">04</span>
                      <span>报告面板可一键复制普通话版本给同事</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWelcome(false)}
                    className="btn-primary w-full justify-center"
                  >
                    <Play className="w-4 h-4" />
                    开始使用示例项目
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="w-80 border-l border-surface-700/50 panel m-3 ml-1.5 flex-shrink-0 overflow-hidden flex flex-col">
          <div className="flex border-b border-surface-700/50">
            {rightPanelConfig.map((item) => {
              const Icon = item.icon;
              const isActive = activePanel === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActivePanel(item.key)}
                  className={`flex-1 px-2 py-3 text-xs font-medium flex flex-col items-center gap-1 transition-all relative ${
                    isActive
                      ? "text-primary-400 bg-surface-800/50"
                      : "text-surface-500 hover:text-surface-300 hover:bg-surface-800/30"
                  }`}
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {item.badge && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-1 rounded-full bg-accent-danger text-[9px] font-bold text-white flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary-400 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            {activePanel === "collision" && <CollisionPanel />}
            {activePanel === "history" && <HistoryPanel />}
            {activePanel === "report" && <ReportPanel />}
          </div>
        </aside>
      </div>
    </div>
  );
}
