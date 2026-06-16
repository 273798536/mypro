import type { RecordStatus, ChangeType, BadDataType } from "../../types";

interface StatusTagProps {
  status: RecordStatus;
}

export function RecordStatusTag({ status }: StatusTagProps) {
  const map: Record<RecordStatus, { label: string; cls: string; dot: string }> = {
    normal: {
      label: "正常",
      cls: "bg-teal-50 text-teal-700 border-teal-200",
      dot: "bg-teal-500",
    },
    duplicate: {
      label: "重复·已去重",
      cls: "bg-zinc-100 text-zinc-600 border-zinc-300",
      dot: "bg-zinc-500",
    },
    merged: {
      label: "合并记录",
      cls: "bg-government-50 text-government-700 border-government-200",
      dot: "bg-government-500",
    },
  };
  const { label, cls, dot } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

interface ChangeTypeTagProps {
  type: ChangeType;
}

export function ChangeTypeTag({ type }: ChangeTypeTagProps) {
  const map: Record<ChangeType, { label: string; cls: string }> = {
    add: { label: "新增", cls: "bg-teal-50 text-teal-700" },
    duplicate: { label: "重复提交", cls: "bg-zinc-100 text-zinc-600" },
    intersection_error: {
      label: "路口合错",
      cls: "bg-warning-50 text-warning-700",
    },
    bad_data: { label: "坏数据", cls: "bg-databad-50 text-databad-700" },
    update: { label: "更新", cls: "bg-government-50 text-government-700" },
  };
  const { label, cls } = map[type];
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

interface BadDataTagProps {
  type: BadDataType;
}

export function BadDataTag({ type }: BadDataTagProps) {
  const map: Record<BadDataType, { label: string; cls: string }> = {
    missing: { label: "字段缺失", cls: "bg-amber-50 text-amber-700 border-amber-200" },
    invalid: { label: "值异常", cls: "bg-databad-50 text-databad-700 border-databad-200" },
    outlier: { label: "疑似离谱", cls: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  };
  const { label, cls } = map[type];
  return (
    <span
      className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

export function IntersectionErrorTag({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 border border-dashed px-2 py-0.5 rounded text-warning-700 ${
        small ? "text-[10px]" : "text-xs"
      } bg-warning-50 border-warning-400 font-medium`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse" />
      路口合错
    </span>
  );
}
