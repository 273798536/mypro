import { useMemo } from "react";
import type { AnomalyType } from "../../shared/types";
import { ANOMALY_META } from "../../shared/constants";
import { cn } from "@/lib/utils";

interface AnomalyPanelProps {
  anomalyType: AnomalyType;
}

const CATEGORY_LABELS: Record<AnomalyType, { label: string; className: string }> = {
  TIME_MISMATCH: {
    label: "时间类",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  RISK_NOTE_MISSING: {
    label: "风险类",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  TRANSPARENT_OCCLUSION: {
    label: "遮挡类",
    className: "bg-purple-50 text-purple-700 border border-purple-200",
  },
  PARAM_OUT_OF_RANGE: {
    label: "范围类",
    className: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  DATA_FORMAT_ERROR: {
    label: "格式类",
    className: "bg-slate-50 text-slate-700 border border-slate-200",
  },
};

const ICON_MAP: Record<string, JSX.Element> = {
  clock: (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  "alert-triangle": (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  "eye-off": (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
      />
    </svg>
  ),
  "trending-up": (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  "file-x": (
    <svg
      className="w-8 h-8"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
};

export default function AnomalyPanel({ anomalyType }: AnomalyPanelProps) {
  const meta = useMemo(() => ANOMALY_META[anomalyType], [anomalyType]);
  const category = CATEGORY_LABELS[anomalyType];
  const icon = ICON_MAP[meta.icon] || ICON_MAP["alert-triangle"];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="px-6 py-5 border-b border-slate-100"
        style={{ backgroundColor: `${meta.color}08` }}
      >
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center"
            style={{
              backgroundColor: `${meta.color}15`,
              color: meta.color,
            }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900">{meta.name}</h2>
              <span
                className={cn(
                  "px-2.5 py-0.5 text-xs font-medium rounded-full",
                  category.className
                )}
              >
                {category.label}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {meta.description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900">异常原因</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed pl-3">
            {meta.description}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h3 className="text-sm font-semibold text-slate-900">影响范围</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed pl-3">
            {meta.impact}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-1 h-4 rounded-full bg-purple-500" />
            <h3 className="text-sm font-semibold text-slate-900">拦截原因</h3>
          </div>
          <div className="pl-3">
            <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-300">
              <div className="flex items-start gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  <svg
                    className="w-5 h-5 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-purple-800 mb-1">
                    该记录已被系统拦截
                  </div>
                  <p className="text-sm text-purple-700 leading-relaxed">
                    {meta.blockingReason}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900">下一步操作</h3>
          </div>

          <div className="pl-3 space-y-4">
            {meta.suggestions.length > 0 && (
              <div className="space-y-2.5">
                {meta.suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {s.action}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3">
              {meta.nextActionType === "material" ? (
                <div>
                  <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-base font-semibold text-white bg-orange-500 hover:bg-orange-600 active:bg-orange-700 rounded-xl shadow-md shadow-orange-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2">
                    <span className="text-xl">📋</span>
                    补材料
                  </button>
                  <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed">
                    需要补充更多信息，请在备注中完整填写
                  </p>
                </div>
              ) : (
                <div>
                  <button className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-md shadow-blue-200 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2">
                    <span className="text-xl">🔧</span>
                    改口径
                  </button>
                  <p className="mt-2 text-sm text-slate-500 text-center leading-relaxed">
                    需要修正系统参数，请前往修正页调整
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
