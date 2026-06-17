import { useState } from "react"
import { useStore } from "@/store/useStore"
import type { TrajectoryInput, ResultStatus } from "@/types"
import {
  Navigation,
  MessageSquare,
  Eraser,
  Calculator,
  AlertTriangle,
  Plus,
  ArrowRight,
  Clock,
  User,
  Link2,
  Anchor,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  Ruler,
  Target,
  Waves,
  Wind,
  Sparkles,
  ExternalLink,
  XCircle,
} from "lucide-react"

const inputFields: { key: keyof TrajectoryInput; label: string; unit: string }[] = [
  { key: "startLat", label: "起点纬度", unit: "°" },
  { key: "startLng", label: "起点经度", unit: "°" },
  { key: "endLat", label: "终点纬度", unit: "°" },
  { key: "endLng", label: "终点经度", unit: "°" },
  { key: "timeElapsed", label: "时间间隔", unit: "min" },
  { key: "vesselSpeed", label: "船速", unit: "kn" },
  { key: "currentSpeed", label: "海流速度", unit: "kn" },
  { key: "windSpeed", label: "风速", unit: "kn" },
]

const defaultInput: TrajectoryInput = {
  startLat: 0,
  startLng: 0,
  endLat: 0,
  endLng: 0,
  timeElapsed: 0,
  vesselSpeed: 0,
  currentSpeed: 0,
  windSpeed: 0,
}

const sampleInput: TrajectoryInput = {
  startLat: 29.9525,
  startLng: 122.2075,
  endLat: 29.9975,
  endLng: 122.2430,
  timeElapsed: 27,
  vesselSpeed: 8.5,
  currentSpeed: 0.5,
  windSpeed: 3.0,
}

const whyReviewItems = [
  {
    icon: AlertTriangle,
    title: "GPS信号漂移",
    desc: "卫星信号遮挡或多路径效应导致坐标跳变，可能造成航速计算偏差>30%",
  },
  {
    icon: Waves,
    title: "海流影响",
    desc: "近海复杂洋流可能使实际航线偏离理论航迹，影响靠港时间估算",
  },
  {
    icon: Wind,
    title: "风压差",
    desc: "大风天气下船舶漂移量可达2nm/h，需修正后才能作为结算依据",
  },
  {
    icon: Clock,
    title: "时间同步",
    desc: "AIS与GPS时间差超过5min时，轨迹拼接会出现明显断点",
  },
]

const driftIndexGuide = [
  { range: "0 ~ 0.2", label: "正常", color: "text-reef", bg: "bg-reef/15", border: "border-reef/30" },
  { range: "0.2 ~ 0.4", label: "需关注", color: "text-amber", bg: "bg-amber/15", border: "border-amber/30" },
  { range: "> 0.4", label: "异常", color: "text-coral", bg: "bg-coral/15", border: "border-coral/30" },
]

export default function Trajectory() {
  const { trajectoryCalcs, calculateDrift, reviewNotes, addReviewNote, trackCleanings, batches, selectedBatchId } = useStore()

  const [formInput, setFormInput] = useState<TrajectoryInput>(defaultInput)
  const [noteAuthor, setNoteAuthor] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [showWhyReview, setShowWhyReview] = useState(true)
  const [lastResult, setLastResult] = useState<{ status: ResultStatus; reason: string; resultId: string } | null>(null)

  const latestCalc = trajectoryCalcs[trajectoryCalcs.length - 1]
  const currentBatch = batches.find((b) => b.id === selectedBatchId)
  const batchCalcs = trajectoryCalcs.filter((c) => c.batchId === selectedBatchId)
  const batchNotes = reviewNotes.filter((n) => n.batchId === selectedBatchId)
  const batchCleanings = trackCleanings.filter((t) => t.batchId === selectedBatchId)
  const cleaning = batchCleanings[0]

  const handleInputChange = (key: keyof TrajectoryInput, value: string) => {
    setFormInput((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  const handleCalculate = () => {
    const result = calculateDrift(formInput)
    if (result) {
      setLastResult({
        status: result.result.status,
        reason: result.result.statusReason,
        resultId: result.result.id,
      })
    }
  }

  const handleUseSample = () => {
    setFormInput(sampleInput)
    setLastResult(null)
  }

  const handleAddNote = () => {
    if (!noteAuthor.trim() || !noteContent.trim()) return
    addReviewNote({
      batchId: selectedBatchId,
      author: noteAuthor.trim(),
      content: noteContent.trim(),
      relatedTrajectoryId: latestCalc?.id ?? "",
    })
    setNoteContent("")
  }

  const getDriftIndexLevel = (index: number) => {
    if (index < 0.2) return driftIndexGuide[0]
    if (index < 0.4) return driftIndexGuide[1]
    return driftIndexGuide[2]
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      {currentBatch && (
        <div className="card-dark flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-ice/15 flex items-center justify-center flex-shrink-0">
            <Anchor className="w-6 h-6 text-ice" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-100 font-bold text-lg">
              {currentBatch.vesselName} · {selectedBatchId}
            </p>
            <p className="text-slate-400 text-sm mt-0.5">
              {currentBatch.portName} · 靠港结算轨迹复核
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">本批次已计算</div>
            <div className="data-mono text-xl font-bold text-ice">{batchCalcs.length} 次</div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Navigation className="w-6 h-6 text-ice" />
          <h1 className="text-2xl font-bold text-slate-100">轨迹漂移复核</h1>
        </div>
        <button
          onClick={() => setShowWhyReview(!showWhyReview)}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <HelpCircle className="w-4 h-4" />
          {showWhyReview ? "隐藏" : "显示"}复核说明
        </button>
      </div>

      {showWhyReview && (
        <div className="card-dark border-ice/30">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-ice" />
            <h2 className="text-lg font-bold text-slate-100">为什么要复核轨迹漂移？</h2>
            <span className="ml-auto text-xs text-slate-500">新同事指引</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {whyReviewItems.map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="bg-ocean-950/60 border border-ocean-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-amber" />
                    <span className="text-sm font-medium text-slate-200">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex items-center gap-4 text-xs">
            <span className="text-slate-500">漂移指数参考：</span>
            {driftIndexGuide.map((g, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${g.bg} ${g.border}`}>
                <CheckCircle2 className={`w-3 h-3 ${g.color}`} />
                <span className={g.color}>{g.range}</span>
                <span className="text-slate-400">{g.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 1: 计算工具 */}
      <div className="card-dark">
        <div className="section-title mb-4">
          <Calculator className="w-5 h-5 text-ice" />
          计算工具
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            {inputFields.map(({ key, label, unit }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="text-sm text-slate-400 w-24 shrink-0">{label}</label>
                <input
                  type="number"
                  step="any"
                  className="input-field flex-1"
                  value={formInput[key] || ""}
                  onChange={(e) => handleInputChange(key, e.target.value)}
                  placeholder={`输入${label}`}
                />
                <span className="text-xs text-slate-500 w-8">{unit}</span>
              </div>
            ))}
            <div className="flex gap-2 mt-4">
              <button
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
                onClick={handleUseSample}
                type="button"
              >
                <Sparkles className="w-4 h-4" />
                使用样例参数
              </button>
              <button
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                onClick={handleCalculate}
                type="button"
              >
                <Calculator className="w-4 h-4" />
                计算
              </button>
            </div>
            <p className="text-[11px] text-slate-600 mt-2 text-center">
              样例参数可复现漂移距离 0.87nm、漂移指数 0.23 的标准结果
            </p>
          </div>

          <div className="space-y-4">
            {latestCalc && latestCalc.batchId === selectedBatchId ? (
              <>
                {lastResult && (
                  <div
                    className={`rounded-lg p-4 border ${
                      lastResult.status === "可用"
                        ? "bg-reef/10 border-reef/30"
                        : lastResult.status === "暂缓"
                        ? "bg-amber/10 border-amber/30"
                        : "bg-coral/10 border-coral/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        {lastResult.status === "可用" ? (
                          <CheckCircle2 className="w-5 h-5 text-reef shrink-0 mt-0.5" />
                        ) : lastResult.status === "暂缓" ? (
                          <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div
                            className={`font-bold text-sm ${
                              lastResult.status === "可用"
                                ? "text-reef-light"
                                : lastResult.status === "暂缓"
                                ? "text-amber-light"
                                : "text-coral-light"
                            }`}
                          >
                            计算结果状态：{lastResult.status}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">{lastResult.reason}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => (window.location.hash = "/results")}
                        className="flex items-center gap-1 text-xs text-ice hover:text-ice-light transition-colors shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        查看结果
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-ocean-950 border border-ocean-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-slate-500">计算结果</div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {latestCalc.calculatedAt}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">漂移距离</div>
                      <div className="data-mono text-2xl font-bold">{latestCalc.result.driftDistance}</div>
                      <div className="text-xs text-slate-500">海里 (nm)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">漂移方向</div>
                      <div className="data-mono text-2xl font-bold">{latestCalc.result.driftDirection}</div>
                      <div className="text-xs text-slate-500">方位角 (°)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-1">漂移指数</div>
                      <div className={`data-mono text-2xl font-bold ${getDriftIndexLevel(latestCalc.result.driftIndex).color}`}>
                        {latestCalc.result.driftIndex}
                      </div>
                      <div className={`text-xs ${getDriftIndexLevel(latestCalc.result.driftIndex).color}`}>
                        {getDriftIndexLevel(latestCalc.result.driftIndex).label}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-ocean-950 border border-amber/30 rounded-lg p-3">
                    <div className="text-xs text-amber mb-2 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5" />
                      <span className="font-bold">计算公式</span>
                    </div>
                    <div className="text-sm text-slate-300 font-mono break-all leading-relaxed">{latestCalc.formula}</div>
                    <div className="mt-2 pt-2 border-t border-ocean-700/40">
                      <div className="text-[11px] text-slate-500">
                        D=实际漂移量，Δlat/Δlng=经纬度差，V_vessel=船速，T=时间
                      </div>
                    </div>
                  </div>
                  <div className="bg-ocean-950 border border-reef/30 rounded-lg p-3">
                    <div className="text-xs text-reef mb-2 flex items-center gap-1.5">
                      <Ruler className="w-3.5 h-3.5" />
                      <span className="font-bold">计量单位</span>
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed">{latestCalc.unit}</div>
                    <div className="mt-2 pt-2 border-t border-ocean-700/40 space-y-1">
                      <div className="text-[11px] text-slate-500">1 海里 = 1.852 公里</div>
                      <div className="text-[11px] text-slate-500">1 节 = 1 海里/小时</div>
                    </div>
                  </div>
                  <div className="bg-ocean-950 border border-ice/30 rounded-lg p-3">
                    <div className="text-xs text-ice mb-2 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span className="font-bold">适用范围</span>
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed">{latestCalc.scope}</div>
                    <div className="mt-2 pt-2 border-t border-ocean-700/40">
                      <div className="text-[11px] text-slate-500">
                        超出范围请启用高级修正模型
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-ocean-950 border border-coral/30 rounded-lg p-4">
                  <div className="text-sm text-coral font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    复核失败原因（任一项触发即需人工复核）
                  </div>
                  <ul className="space-y-2">
                    {latestCalc.failureReasons.map((reason, i) => (
                      <li key={i} className="text-sm text-slate-400 flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-coral/15 border border-coral/30 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] text-coral font-bold">{i + 1}</span>
                        </span>
                        <span className="leading-relaxed">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm py-12">
                <Calculator className="w-10 h-10 mb-3 opacity-30" />
                <p>请输入参数后点击计算</p>
                <p className="text-xs text-slate-600 mt-1">计算结果将自动关联当前批次</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: 复核备注 */}
      <div className="card-dark">
        <div className="section-title mb-4">
          <MessageSquare className="w-5 h-5 text-ice" />
          复核备注
          <span className="ml-auto text-xs font-normal text-slate-500">
            当前批次：{batchNotes.length} 条备注
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400 w-16 shrink-0">作者</label>
              <input
                type="text"
                className="input-field flex-1"
                value={noteAuthor}
                onChange={(e) => setNoteAuthor(e.target.value)}
                placeholder="输入姓名"
              />
            </div>
            <textarea
              className="input-field w-full min-h-[80px] resize-y"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="输入复核备注内容，如：漂移指数正常、GPS信号质量良好等..."
            />
            <button
              className="btn-primary w-full flex items-center justify-center gap-2"
              onClick={handleAddNote}
              disabled={!noteAuthor.trim() || !noteContent.trim()}
            >
              <Plus className="w-4 h-4" />
              添加备注
            </button>
            <div className="text-[11px] text-slate-600 mt-1">
              备注将自动关联当前批次 {selectedBatchId}
            </div>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {batchNotes.length === 0 && (
              <div className="text-slate-500 text-sm text-center py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                当前批次暂无复核备注
              </div>
            )}
            {batchNotes.map((note) => (
              <div
                key={note.id}
                className="bg-ocean-950 border border-ocean-700/50 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {note.author}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {note.createdAt}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{note.content}</p>
                <div className="text-xs text-slate-600 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  关联轨迹计算: {note.relatedTrajectoryId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: 轨迹清洗 */}
      <div className="card-dark">
        <div className="section-title mb-4">
          <Eraser className="w-5 h-5 text-ice" />
          轨迹清洗
          <span className="ml-auto text-xs font-normal text-slate-500">
            当前批次：{batchCleanings.length} 次清洗
          </span>
        </div>

        {cleaning ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-ocean-950 border border-ocean-700/50 rounded-lg p-4 text-center">
                <div className="text-xs text-slate-500 mb-1">原始点数</div>
                <div className="data-mono text-2xl font-bold text-slate-200">{cleaning.originalPoints.length}</div>
              </div>
              <div className="bg-coral/10 border border-coral/30 rounded-lg p-4 text-center">
                <div className="text-xs text-coral mb-1">异常点数</div>
                <div className="data-mono text-2xl font-bold text-coral-light">{cleaning.anomalies.length}</div>
              </div>
              <div className="bg-reef/10 border border-reef/30 rounded-lg p-4 text-center">
                <div className="text-xs text-reef mb-1">清洗后点数</div>
                <div className="data-mono text-2xl font-bold text-reef-light">{cleaning.cleanedPoints.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  原始轨迹点
                  <span className="data-mono text-xs bg-ocean-800 px-2 py-0.5 rounded">
                    {cleaning.originalPoints.length} 点
                  </span>
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {cleaning.originalPoints.map((pt, i) => {
                    const isAnomaly = cleaning.anomalies.some((a) => a.index === i)
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 text-sm px-3 py-2 rounded-lg border ${
                          isAnomaly
                            ? "bg-coral/10 border-coral/40 text-coral-light"
                            : "bg-ocean-950 border-ocean-700/50 text-slate-300"
                        }`}
                      >
                        <span className="text-xs text-slate-500 w-8 shrink-0">#{i}</span>
                        <span className="data-mono text-xs flex-1 min-w-0 truncate">
                          {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                        </span>
                        <span className="text-xs text-slate-500 shrink-0">{pt.timestamp.split(" ")[1]}</span>
                        {isAnomaly && <AlertTriangle className="w-3.5 h-3.5 text-coral shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  清洗后轨迹点
                  <span className="data-mono text-xs bg-reef/15 text-reef-light border border-reef/30 px-2 py-0.5 rounded">
                    {cleaning.cleanedPoints.length} 点
                  </span>
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {cleaning.cleanedPoints.map((pt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-sm bg-ocean-950 border border-ocean-700/50 text-slate-300 px-3 py-2 rounded-lg"
                    >
                      <span className="text-xs text-slate-500 w-8 shrink-0">#{i}</span>
                      <span className="data-mono text-xs flex-1 min-w-0 truncate">
                        {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                      </span>
                      <span className="text-xs text-slate-500 shrink-0">{pt.timestamp.split(" ")[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {cleaning.anomalies.length > 0 && (
              <div className="mt-4 bg-ocean-950 border border-coral/30 rounded-lg p-4">
                <div className="text-sm text-coral font-medium mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  异常点详情（已自动清洗）
                </div>
                <div className="space-y-2">
                  {cleaning.anomalies.map((anomaly, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="data-mono text-coral-light bg-coral/10 px-2 py-0.5 rounded text-xs shrink-0">
                        原始点 #{anomaly.index}
                      </span>
                      <span className="text-slate-400 leading-relaxed">
                        <ArrowRight className="w-3.5 h-3.5 inline mr-1.5 text-slate-600" />
                        {anomaly.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 text-sm text-center py-12">
            <Eraser className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>当前批次暂无轨迹清洗数据</p>
            <p className="text-xs text-slate-600 mt-1">清洗后的数据将用于后续结算计算</p>
          </div>
        )}
      </div>
    </div>
  )
}
