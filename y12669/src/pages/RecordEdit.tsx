import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import PageHeader from "@/components/PageHeader";
import RopeAngleCanvas from "@/components/RopeAngleCanvas";
import CrossSectionCanvas from "@/components/CrossSectionCanvas";
import { useRecordsStore } from "@/store/useRecordsStore";
import { SAFETY_THRESHOLDS } from "../../shared/constants";
import { cn } from "@/lib/utils";

const schema = z.object({
  timeParameter: z.string().min(1, "请选择时间"),
  riskNote: z
    .string()
    .min(10, "风险备注至少 10 字，需包含角度/张力/现场判断"),
  ropeAngle: z
    .number()
    .min(0, "角度不能小于 0°")
    .max(180, "角度不能大于 180°"),
  ropeLength: z
    .number()
    .min(5, "长度不能小于 5m")
    .max(200, "长度不能大于 200m"),
  ropeTension: z
    .number()
    .min(0, "张力不能小于 0kgf")
    .max(5000, "张力不能大于 5000kgf"),
  transparentOcclusion: z
    .number()
    .min(0, "系数不能小于 0")
    .max(1, "系数不能大于 1"),
  correctionNote: z.string().min(1, "请填写本次修改原因"),
});

type FormValues = z.infer<typeof schema>;

function formatDateTimeLocal(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export default function RecordEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedRecord, loading, fetchRecord, updateRecord } =
    useRecordsStore();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      timeParameter: "",
      riskNote: "",
      ropeAngle: 45,
      ropeLength: 40,
      ropeTension: 2000,
      transparentOcclusion: 0,
      correctionNote: "",
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (id) {
      fetchRecord(id);
    }
  }, [id, fetchRecord]);

  useEffect(() => {
    if (selectedRecord) {
      reset({
        timeParameter: formatDateTimeLocal(selectedRecord.timeParameter),
        riskNote: selectedRecord.riskNote,
        ropeAngle: selectedRecord.ropeAngle,
        ropeLength: selectedRecord.ropeLength,
        ropeTension: selectedRecord.ropeTension,
        transparentOcclusion: 0,
        correctionNote: "",
      });
    }
  }, [selectedRecord, reset]);

  const impactAnalysis = useMemo(() => {
    const impacts: Array<{ title: string; detail: string }> = [];
    if (isDirty && selectedRecord) {
      if (watchedValues.ropeAngle !== selectedRecord.ropeAngle) {
        impacts.push({
          title: "角度变化 → 风险等级重算",
          detail: `角度由 ${selectedRecord.ropeAngle}° 调整为 ${watchedValues.ropeAngle}°，系统将重新评估角度是否处于安全区间 ${SAFETY_THRESHOLDS.ANGLE_MIN}°~${SAFETY_THRESHOLDS.ANGLE_MAX}°。`,
        });
      }
      if (watchedValues.ropeTension !== selectedRecord.ropeTension) {
        impacts.push({
          title: "张力变化 → 载荷安全判定重算",
          detail: `张力由 ${selectedRecord.ropeTension}kgf 调整为 ${watchedValues.ropeTension}kgf，系统将重新判定是否低于安全阈值 ${SAFETY_THRESHOLDS.TENSION_MAX}kgf。`,
        });
      }
      if (
        watchedValues.timeParameter !==
          formatDateTimeLocal(selectedRecord.timeParameter) ||
        watchedValues.riskNote !== selectedRecord.riskNote
      ) {
        impacts.push({
          title: "时间/备注变化 → 一致性重校验",
          detail: "时间参数或风险备注已修改，系统将重新校验两者是否一致（±5 分钟阈值），以及备注是否包含关键指标说明。",
        });
      }
      if (watchedValues.ropeLength !== selectedRecord.ropeLength) {
        impacts.push({
          title: "绳长变化 → 剖面与锚点距重算",
          detail: `绳长由 ${selectedRecord.ropeLength}m 调整为 ${watchedValues.ropeLength}m，将影响绳索下挠度估算与剖面测点关联计算。`,
        });
      }
    }
    return impacts;
  }, [watchedValues, selectedRecord, isDirty]);

  const onSubmit = async (data: FormValues) => {
    if (!id) return;
    const patch = {
      timeParameter: new Date(data.timeParameter).toISOString(),
      riskNote: data.riskNote,
      ropeAngle: data.ropeAngle,
      ropeLength: data.ropeLength,
      ropeTension: data.ropeTension,
    };
    await updateRecord(id, patch);
    alert("修正已保存，历史版本已自动生成");
    navigate(-1);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!selectedRecord) {
    return (
      <div className="p-8 text-center text-slate-500">
        {loading ? "加载中..." : "未找到记录"}
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="修正记录"
        description="修正参数后实时预览，保存后自动生成历史版本"
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
            >
              取消
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={loading || !isDirty}
            >
              保存修正
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 space-y-5">
          <div>
            <label className="label">时间参数</label>
            <Controller
              name="timeParameter"
              control={control}
              render={({ field }) => (
                <input
                  type="datetime-local"
                  className="input-field"
                  {...field}
                />
              )}
            />
            {errors.timeParameter && (
              <p className="mt-1 text-xs text-danger-600">
                {errors.timeParameter.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              风险备注 <span className="text-slate-400 font-normal">（至少 10 字，含角度/张力/现场判断）</span>
            </label>
            <Controller
              name="riskNote"
              control={control}
              render={({ field }) => (
                <textarea
                  rows={4}
                  className="input-field resize-none"
                  placeholder="例如：角度 45°，张力 2000kgf，现场环境良好..."
                  {...field}
                />
              )}
            />
            {errors.riskNote && (
              <p className="mt-1 text-xs text-danger-600">
                {errors.riskNote.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">
              绳索角度 <span className="text-slate-400 font-normal">（0°~180°）</span>
            </label>
            <div className="flex items-center gap-3">
              <Controller
                name="ropeAngle"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    max={180}
                    step={0.1}
                    className="input-field w-28"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <span className="text-slate-500 text-sm">°</span>
              <Controller
                name="ropeAngle"
                control={control}
                render={({ field }) => (
                  <input
                    type="range"
                    min={0}
                    max={180}
                    step={0.5}
                    className="flex-1 accent-primary-600"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="text-slate-400">安全阈值：</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full",
                  watchedValues.ropeAngle >= SAFETY_THRESHOLDS.ANGLE_MIN &&
                    watchedValues.ropeAngle <= SAFETY_THRESHOLDS.ANGLE_MAX
                    ? "bg-success-50 text-success-700"
                    : "bg-warning-50 text-warning-700"
                )}
              >
                {SAFETY_THRESHOLDS.ANGLE_MIN}° ~ {SAFETY_THRESHOLDS.ANGLE_MAX}°
              </span>
              {errors.ropeAngle && (
                <span className="text-danger-600">
                  {errors.ropeAngle.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              绳索长度 <span className="text-slate-400 font-normal">（5m~200m）</span>
            </label>
            <div className="flex items-center gap-2">
              <Controller
                name="ropeLength"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={5}
                    max={200}
                    step={0.1}
                    className="input-field w-40"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <span className="text-slate-500 text-sm">m</span>
              {errors.ropeLength && (
                <span className="text-xs text-danger-600">
                  {errors.ropeLength.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              绳索张力 <span className="text-slate-400 font-normal">（0~5000kgf）</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <Controller
                name="ropeTension"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    max={5000}
                    step={1}
                    className="input-field w-40"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <span className="text-slate-500 text-sm">kgf</span>
              <span className="text-xs text-slate-400">安全阈值：</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  watchedValues.ropeTension >= SAFETY_THRESHOLDS.TENSION_MIN &&
                    watchedValues.ropeTension <= SAFETY_THRESHOLDS.TENSION_MAX
                    ? "bg-success-50 text-success-700"
                    : "bg-warning-50 text-warning-700"
                )}
              >
                {SAFETY_THRESHOLDS.TENSION_MIN} ~ {SAFETY_THRESHOLDS.TENSION_MAX}kgf
              </span>
              {errors.ropeTension && (
                <span className="text-xs text-danger-600">
                  {errors.ropeTension.message}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="label">
              透明遮挡系数{" "}
              <span className="text-slate-400 font-normal">
                （0 = 无遮挡，0.5 = 中等遮挡）
              </span>
            </label>
            <div className="flex items-center gap-3">
              <Controller
                name="transparentOcclusion"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    className="input-field w-28"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
              <Controller
                name="transparentOcclusion"
                control={control}
                render={({ field }) => (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    className="flex-1 accent-primary-600"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                )}
              />
            </div>
            {errors.transparentOcclusion && (
              <p className="mt-1 text-xs text-danger-600">
                {errors.transparentOcclusion.message}
              </p>
            )}
          </div>

          <div>
            <label className="label">修正备注</label>
            <Controller
              name="correctionNote"
              control={control}
              render={({ field }) => (
                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="说明本次修改原因，便于后续追溯..."
                  {...field}
                />
              )}
            />
            {errors.correctionNote && (
              <p className="mt-1 text-xs text-danger-600">
                {errors.correctionNote.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                绳索角度实时预览
              </h3>
            </div>
            <RopeAngleCanvas
              angle={watchedValues.ropeAngle}
              length={watchedValues.ropeLength}
              tension={watchedValues.ropeTension}
            />
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                当前剖面
              </h3>
            </div>
            <CrossSectionCanvas crossSectionData={selectedRecord.crossSectionData} />
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 rounded-full bg-accent-500" />
              <h3 className="text-sm font-semibold text-slate-900">
                影响分析
              </h3>
            </div>
            {impactAnalysis.length === 0 ? (
              <p className="text-sm text-slate-500">
                修改参数后，此处将显示本次修改会影响的下游计算。
              </p>
            ) : (
              <ul className="space-y-3">
                {impactAnalysis.map((item, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-lg bg-accent-50 border border-accent-100"
                  >
                    <div className="text-sm font-semibold text-accent-600 mb-1">
                      {item.title}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {item.detail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
