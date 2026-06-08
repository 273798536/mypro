import { cn } from "@/lib/utils"
import type { TaskStatus, CalibrationStatus } from "@/types"
import { TASK_STATUS_LABEL, CALIBRATION_LABEL } from "@/types"

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: "border-eng-muted text-eng-dim bg-eng-muted/10",
  reviewing: "border-eng-accent text-eng-accent bg-eng-accent/10",
  passed: "border-eng-pass text-eng-pass bg-eng-pass/10",
  conflict: "border-eng-warn text-eng-warn bg-eng-warn/10",
}

const CAL_STYLES: Record<CalibrationStatus, string> = {
  calibrated: "border-eng-pass text-eng-pass bg-eng-pass/10",
  uncalibrated: "border-eng-muted text-eng-dim bg-eng-muted/10",
  conflict: "border-eng-warn text-eng-warn bg-eng-warn/10",
}

export function StatusTag({ status }: { status: TaskStatus }) {
  return (
    <span className={cn("eng-tag", STATUS_STYLES[status])}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {TASK_STATUS_LABEL[status]}
    </span>
  )
}

export function CalibrationTag({ status }: { status: CalibrationStatus }) {
  return (
    <span className={cn("eng-tag", CAL_STYLES[status])}>
      {CALIBRATION_LABEL[status]}
    </span>
  )
}
