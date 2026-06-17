import { useNavigate } from "react-router-dom";
import { FolderOpen, AlertTriangle, Download } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

interface NavCard {
  key: string;
  title: string;
  subtitle: string;
  hint: string;
  icon: typeof FolderOpen;
  to: string;
  gradient: string;
  iconBg: string;
  action?: () => void;
}

const items: NavCard[] = [
  {
    key: "materials",
    title: "材料位置",
    subtitle: "导入线上工单、异常样本、后补说明",
    hint: "算法值班人接手时第一站",
    icon: FolderOpen,
    to: "/materials",
    gradient: "from-navy-600 to-navy-800",
    iconBg: "bg-navy-700/30",
  },
  {
    key: "review",
    title: "异常分析",
    subtitle: "追踪拉偏总结论的具体样本",
    hint: "评审追问时直接点开逐条解释",
    icon: AlertTriangle,
    to: "/review",
    gradient: "from-amber-500 to-amber-700",
    iconBg: "bg-amber-600/30",
    action: () => {
      const store = useAppStore.getState();
      store.setReviewFocusFilter("high");
    },
  },
  {
    key: "history",
    title: "重新导出",
    subtitle: "社区公示复盘材料包一键生成",
    hint: "含完整解释材料与变更历史",
    icon: Download,
    to: "/history",
    gradient: "from-moss-500 to-moss-700",
    iconBg: "bg-moss-600/30",
  },
];

export default function QuickNav() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up stagger-3">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => {
            it.action?.();
            navigate(it.to);
          }}
          className={cn(
            "group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200",
            "bg-gradient-to-br text-white shadow-lg hover:shadow-xl hover:-translate-y-1",
            it.gradient
          )}
        >
          <div
            className={cn(
              "absolute -right-10 -top-10 w-40 h-40 rounded-full blur-3xl opacity-30",
              it.iconBg
            )}
          />
          <div className="relative">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm",
                it.iconBg
              )}
            >
              <it.icon
                className="w-6 h-6"
                strokeWidth={1.75}
              />
            </div>
            <h3 className="font-serif font-semibold text-lg leading-tight">
              {it.title}
            </h3>
            <p className="mt-1 text-sm text-white/85">{it.subtitle}</p>
            <p className="mt-4 text-xs text-white/70 font-medium tracking-wide">
              · {it.hint}
            </p>
            <div className="mt-5 flex items-center text-sm font-medium text-white/90 group-hover:translate-x-1 transition-transform">
              <span>立即前往</span>
              <svg
                className="w-4 h-4 ml-1.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
