import { BuoyRecord } from "@/types";
import { classifyForDisplay } from "@/utils/qualityDetector";
import { CheckCircle, HelpCircle } from "lucide-react";

interface Props {
  record: BuoyRecord;
}

export default function DisplayTag({ record }: Props) {
  const cls = classifyForDisplay(record);

  if (cls === "direct_use") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-quality-available/20 text-quality-available ring-1 ring-inset ring-quality-available/40">
        <CheckCircle size={12} />
        直接可用
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-quality-pending/20 text-quality-pending ring-1 ring-inset ring-quality-pending/40">
      <HelpCircle size={12} />
      需复核
    </span>
  );
}
