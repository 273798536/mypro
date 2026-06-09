import type { DataGrade } from "@/types";

const GRADE_MAP: Record<
  DataGrade,
  { label: string; desc: string; cls: string; dot: string }
> = {
  available: {
    label: "可用",
    desc: "数据完整、结果可信",
    cls: "bg-confirm/10 text-confirm border-confirm/30",
    dot: "bg-confirm",
  },
  pending: {
    label: "暂缓",
    desc: "部分项存疑，需人工复核",
    cls: "bg-warn/10 text-warn border-warn/30",
    dot: "bg-warn",
  },
  recollect: {
    label: "重采",
    desc: "数据异常，需重新采集",
    cls: "bg-alert/10 text-alert border-alert/30",
    dot: "bg-alert",
  },
};

interface Props {
  grade: DataGrade;
  showDesc?: boolean;
}

export default function GradeBadge({ grade, showDesc }: Props) {
  const g = GRADE_MAP[grade];
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${g.cls}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${g.dot}`} />
        {g.label}
      </span>
      {showDesc && (
        <span className="text-xs text-ink-500">{g.desc}</span>
      )}
    </div>
  );
}
