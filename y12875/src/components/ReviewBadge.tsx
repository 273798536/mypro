import { ReviewStatus } from "@/types";
import { Clock, CheckCircle2 } from "lucide-react";

interface Props {
  status: ReviewStatus;
}

export default function ReviewBadge({ status }: Props) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-quality-available/15 text-quality-available ring-1 ring-inset ring-quality-available/30">
        <CheckCircle2 size={12} />
        <span>已通过</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-quality-pending/15 text-quality-pending ring-1 ring-inset ring-quality-pending/30">
      <Clock size={12} />
      <span>待确认</span>
    </span>
  );
}
