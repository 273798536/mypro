import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useReplayStore } from "../store/useReplayStore";
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "../types";
import {
  FolderKanban,
  ChevronRight,
  Play,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Github,
} from "lucide-react";

function formatTime(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function StatusBadge({ status }: { status: string }) {
  const label = PROJECT_STATUS_LABELS[status as keyof typeof PROJECT_STATUS_LABELS] ?? status;
  const color = PROJECT_STATUS_COLORS[status as keyof typeof PROJECT_STATUS_COLORS] ?? "#64748b";
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "error"
      ? AlertTriangle
      : Clock;
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${color}15`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}40`,
      }}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { projects, loadProjects } = useReplayStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center shadow-lg shadow-primary-900/30">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                棋类 AI 落子复盘
              </h1>
              <p className="text-sm text-slate-500">
                轨迹记录 · 图层管理 · 撤销重做 · 导出复核
              </p>
            </div>
          </div>
          <div className="mt-6 p-5 rounded-2xl border border-primary-200 bg-gradient-to-br from-primary-50 via-white to-amber-50/60">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary-800 text-white flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-slate-900">
                  训练员使用指引
                </h2>
                <ul className="mt-2 text-sm text-slate-600 space-y-1.5">
                  <li>
                    · 颜色规则：
                    <span className="text-emerald-600 font-medium mx-1">
                      ✅ 绿色=通过
                    </span>
                    <span className="text-amber-600 font-medium mx-1">
                      ⚠️ 橙色=待确认
                    </span>
                    <span className="text-red-600 font-medium mx-1">
                      ❌ 红色=失败
                    </span>
                    <span className="text-blue-600 font-medium mx-1">
                      🔵 蓝色=进行中
                    </span>
                  </li>
                  <li>
                    · 示例包含三类场景：越界失败、撤销重开、标准结算，依次体验即可掌握所有功能
                  </li>
                  <li>
                    · 导出的 JSON 与页面状态一致，可一眼区分「直接可用」与「需地图编辑复核」
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-primary-700 rounded-full" />
            示例复盘（推荐新手从此处开始）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projects.map((project, idx) => (
              <button
                key={project.id}
                onClick={() => navigate(`/editor/${project.id}`)}
                className="group text-left card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{
                    background: `linear-gradient(90deg, ${project.layers[0]?.color ?? "#1e40af"}, ${project.layers[1]?.color ?? "#f59e0b"})`,
                  }}
                />
                <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br opacity-10 group-hover:opacity-20 transition-opacity"
                  style={{
                    background: `radial-gradient(circle, ${project.layers[0]?.color ?? "#1e40af"}, transparent)`,
                  }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-slate-400">
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <StatusBadge status={project.status} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1.5 group-hover:text-primary-800 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed min-h-[36px]">
                    {project.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{project.moves.length} 手</span>
                      <span>·</span>
                      <span>{project.layers.length} 图层</span>
                      {project.issues.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-red-500 font-medium">
                            {project.issues.length} 问题
                          </span>
                        </>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary-700 group-hover:gap-2 transition-all">
                      打开
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-accent-600 rounded-full" />
            快速启动指南
          </h2>
          <div className="card p-5 space-y-4 text-sm text-slate-700">
            <div>
              <h3 className="font-semibold text-slate-900 mb-1">
                从空目录开始的完整流程
              </h3>
              <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-100 space-y-1.5 overflow-x-auto">
                <div>
                  <span className="text-slate-500"># 1. 安装依赖</span>
                </div>
                <div className="text-emerald-300">npm install</div>
                <div className="mt-2">
                  <span className="text-slate-500"># 2. 启动开发服务器</span>
                </div>
                <div className="text-emerald-300">npm run dev</div>
                <div className="mt-2">
                  <span className="text-slate-500"># 3. 浏览器打开提示的本地地址（默认 http://localhost:5173）</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500"># 第一份样例位置：首页上方「示例复盘」卡片列表，点击任意卡片即可进入</span>
                </div>
                <div className="text-slate-400 mt-1">
                  示例项目定义在 <span className="text-amber-300">src/data/samples.ts</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-2">常用快捷键</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <kbd className="px-2 py-1 bg-white rounded border border-slate-200 font-mono text-[10px] shadow-sm">
                    Ctrl+Z
                  </kbd>
                  <span className="text-slate-600">撤销</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <kbd className="px-2 py-1 bg-white rounded border border-slate-200 font-mono text-[10px] shadow-sm">
                    Ctrl+Shift+Z
                  </kbd>
                  <span className="text-slate-600">重做</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">点击棋盘空位 = 添加落子</span>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                  <span className="text-slate-600">点击棋子 = 查看轨迹详情</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-400 pb-6">
          <div className="flex items-center justify-center gap-1.5">
            <Github className="w-3.5 h-3.5" />
            棋类 AI 落子复盘工具 · 图层与撤销重做优先
          </div>
        </footer>
      </div>
    </div>
  );
}
