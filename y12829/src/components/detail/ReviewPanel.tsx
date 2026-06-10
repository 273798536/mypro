import { useState } from "react";
import {
  MessageSquarePlus,
  CheckSquare,
  GitBranch,
  RotateCcw,
  History,
  ShieldCheck,
  GitPullRequestArrow,
  RefreshCw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PrimerSample, ReviewAction, SampleStatus } from "@/types";
import { formatDate, statusBgClass, statusLabel, statusTextClass } from "@/utils/boundaryCheck";
import { useSampleStore } from "@/store/useSampleStore";

interface ReviewPanelProps {
  sample: PrimerSample;
}

const roleOptions = [
  "动物房管理员",
  "质量负责人",
  "实验员",
  "导师",
  "学生",
];

const actionConfig = {
  [ReviewAction.CONFIRM]: {
    label: "确认",
    icon: ShieldCheck,
    badge: "bg-teal-50 text-teal-700 border-teal-200",
  },
  [ReviewAction.ADJUST]: {
    label: "调整",
    icon: GitPullRequestArrow,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  [ReviewAction.REQUEST_RECHECK]: {
    label: "重测",
    icon: RefreshCw,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const avatarColors = [
  "bg-primary-700",
  "bg-lab-teal",
  "bg-indigo-500",
  "bg-lab-amber",
  "bg-lab-danger",
  "bg-violet-500",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function initialsOf(name: string): string {
  return name.slice(-2);
}

export default function ReviewPanel({ sample }: ReviewPanelProps) {
  const addReviewNote = useSampleStore((s) => s.addReviewNote);

  const [role, setRole] = useState("动物房管理员");
  const [author, setAuthor] = useState("");
  const [action, setAction] = useState<ReviewAction>(ReviewAction.CONFIRM);
  const [newStatus, setNewStatus] = useState<SampleStatus>(sample.status);
  const [content, setContent] = useState("");
  const [updatesLineage, setUpdatesLineage] = useState(true);

  const handleSubmit = () => {
    if (!author.trim() || !content.trim()) return;
    const lineageNote =
      action === ReviewAction.ADJUST
        ? `[${actionConfig[action].label}] ${statusLabel(sample.status)} → ${statusLabel(newStatus)}：${content.trim()}`
        : `[${actionConfig[action].label}] ${content.trim()}`;
    addReviewNote(
      sample.id,
      {
        author: author.trim(),
        role,
        content: content.trim(),
        action,
        newStatus: action === ReviewAction.ADJUST ? newStatus : undefined,
        updatesLineage,
      },
      lineageNote
    );
    setContent("");
    setAuthor("");
  };

  const ActionIcon = actionConfig[action].icon;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-primary-100 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-primary-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5 text-primary-700" />
          <h3 className="text-lg font-bold text-primary-900">多轮复核面板</h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600">
          <History className="h-3.5 w-3.5" />
          共 {sample.reviews.length} 条复核意见
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        {sample.reviews.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary-200 bg-primary-50/50 text-center">
            <CheckSquare className="h-10 w-10 text-primary-300" />
            <p className="text-sm font-medium text-primary-500">暂无复核意见</p>
            <p className="text-xs text-primary-400">请管理员在下方输入区追加第一条复核</p>
          </div>
        ) : (
          <ol className="relative space-y-5 border-l-2 border-primary-100 pl-6">
            {sample.reviews.map((r, idx) => {
              const cfg = actionConfig[r.action];
              const CfgIcon = cfg.icon;
              return (
                <li key={r.id} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                  <span
                    className={cn(
                      "absolute -left-[34px] top-0 flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-white shadow-md",
                      getAvatarColor(r.author)
                    )}
                  >
                    <span className="text-xs font-bold text-white">{initialsOf(r.author)}</span>
                  </span>

                  <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-white to-primary-50/40 p-4 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-sm font-bold text-primary-900">{r.author}</span>
                      <span className="text-xs text-primary-500">· {r.role}</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          cfg.badge
                        )}
                      >
                        <CfgIcon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {r.newStatus && r.action === ReviewAction.ADJUST && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            statusBgClass(r.newStatus),
                            statusTextClass(r.newStatus)
                          )}
                        >
                          状态调整为 {statusLabel(r.newStatus)}
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-primary-400">
                        {formatDate(r.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-primary-700">{r.content}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="border-t border-primary-100 bg-primary-50/60 px-6 py-5">
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-primary-600">角色</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-800 shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            >
              {roleOptions.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-primary-600">作者名</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="例如：李主管"
              className="w-full rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm text-primary-800 shadow-sm outline-none transition placeholder:text-primary-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-primary-600">动作</label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-primary-200 bg-white p-1">
              {(Object.keys(actionConfig) as ReviewAction[]).map((a) => {
                const ac = actionConfig[a];
                const AcIcon = ac.icon;
                const active = action === a;
                return (
                  <button
                    key={a}
                    onClick={() => setAction(a)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition",
                      active
                        ? "bg-primary-800 text-white shadow"
                        : "text-primary-600 hover:bg-primary-50"
                    )}
                  >
                    <AcIcon className="h-3.5 w-3.5" />
                    {ac.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {action === ReviewAction.ADJUST && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-primary-600">
              调整后的新状态
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([SampleStatus.NORMAL, SampleStatus.BORDERLINE, SampleStatus.ABNORMAL] as const).map(
                (s) => {
                  const active = newStatus === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-semibold transition",
                        active
                          ? cn(statusBgClass(s), statusTextClass(s), "shadow-md ring-2 ring-offset-1 ring-offset-white")
                          : "border-primary-200 bg-white text-primary-600 hover:border-primary-300"
                      )}
                    >
                      {active && <Check className="h-4 w-4" />}
                      {statusLabel(s)}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        )}

        <div className="mb-3">
          <label className="mb-1 block text-xs font-semibold text-primary-600">复核意见</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="请详细说明复核依据、后续建议等内容…"
            className="w-full resize-none rounded-lg border border-primary-200 bg-white px-3 py-2 text-sm leading-relaxed text-primary-800 shadow-sm outline-none transition placeholder:text-primary-300 focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
          />
        </div>

        <div className="mb-4 flex items-center justify-between">
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-md px-1 py-1">
            <input
              type="checkbox"
              checked={updatesLineage}
              onChange={(e) => setUpdatesLineage(e.target.checked)}
              className="h-4 w-4 rounded border-primary-300 text-primary-700 focus:ring-primary-300"
            />
            <span className="flex items-center gap-1.5 text-xs font-medium text-primary-600">
              <GitBranch className="h-3.5 w-3.5" />
              同步更新谱系追踪
            </span>
          </label>

          <button
            onClick={handleSubmit}
            disabled={!author.trim() || !content.trim()}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed",
              !author.trim() || !content.trim()
                ? "bg-primary-200 text-primary-400"
                : "bg-primary-800 text-white hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg active:translate-y-0"
            )}
          >
            <ActionIcon className="h-4 w-4" />
            追加复核意见
          </button>
        </div>
      </div>
    </div>
  );
}
