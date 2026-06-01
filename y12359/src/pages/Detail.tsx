import { useParams, useNavigate } from "react-router-dom"
import { useStore } from "@/store/useStore"
import DeviationStep from "@/components/DeviationStep"
import EnvironmentStep from "@/components/EnvironmentStep"
import AnomalyStep from "@/components/AnomalyStep"
import TracePanel from "@/components/TracePanel"
import BackfillBadge from "@/components/BackfillBadge"
import { ArrowLeft, CheckCircle2, Circle, Activity } from "lucide-react"
import { useState } from "react"
import type { CalibrationReview } from "@/types"
import { calibrationReviews } from "@/data/mock"

const steps = [
  { key: "deviation", label: "校准偏差" },
  { key: "environment", label: "环境修正" },
  { key: "anomaly", label: "异常解释" },
] as const

type StepKey = (typeof steps)[number]["key"]

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const getSignal = useStore((s) => s.getSignal)
  const getDevice = useStore((s) => s.getDevice)
  const getReading = useStore((s) => s.getReading)
  const [activeStep, setActiveStep] = useState<StepKey>("deviation")

  const review = calibrationReviews.find((r) => r.id === id) as CalibrationReview | undefined
  if (!review) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        未找到复盘记录
      </div>
    )
  }

  const signal = getSignal(review.standardSignalId)
  const device = getDevice(review.deviceRecordId)
  const reading = getReading(review.readingRecordId)

  const stepIndex = steps.findIndex((s) => s.key === activeStep)

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/60 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            返回总览
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <Activity size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {review.batchId}
          </span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-400">{signal?.name ?? "-"}</span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-400 font-mono">{device?.deviceNumber ?? "-"}</span>
          {device?.isBackfilled && (
            <span className="text-xs px-1.5 py-0.5 bg-amber-400/15 text-amber-400 rounded border border-amber-400/30">
              补录
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-0">
            {steps.map((step, i) => (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => setActiveStep(step.key)}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-2">
                    {i < stepIndex ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : i === stepIndex ? (
                      <Circle size={18} className="text-indigo-400 fill-indigo-400" />
                    ) : (
                      <Circle size={18} className="text-slate-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        i === stepIndex
                          ? "text-indigo-300"
                          : i < stepIndex
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className={`w-16 h-px mx-3 ${
                      i < stepIndex ? "bg-emerald-400/40" : "bg-slate-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="max-w-4xl space-y-6">
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-5">
              {activeStep === "deviation" && <DeviationStep review={review} />}
              {activeStep === "environment" && <EnvironmentStep review={review} />}
              {activeStep === "anomaly" && <AnomalyStep review={review} />}
            </div>

            {activeStep === "anomaly" && (
              <>
                <TracePanel review={review} />
                <BackfillBadge review={review} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
