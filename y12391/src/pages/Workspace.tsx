import { useState, useEffect, useMemo } from "react"
import { useEnvelopeStore } from "@/store"
import { Plus } from "lucide-react"
import WaveformDisplay from "@/components/WaveformDisplay"
import EnvelopeControls from "@/components/EnvelopeControls"
import AudioPlayer from "@/components/AudioPlayer"
import VersionTimeline from "@/components/VersionTimeline"
import ClassroomQuestions from "@/components/ClassroomQuestions"

export default function Workspace() {
  const samples = useEnvelopeStore((s) => s.samples)
  const currentSampleId = useEnvelopeStore((s) => s.currentSampleId)
  const setCurrentSample = useEnvelopeStore((s) => s.setCurrentSample)
  const addSample = useEnvelopeStore((s) => s.addSample)
  const editingEnvelope = useEnvelopeStore((s) => s.editingEnvelope)
  const applyEnvelopeToSample = useEnvelopeStore((s) => s.applyEnvelopeToSample)
  const versions = useEnvelopeStore((s) => s.versions)

  const [sampleName, setSampleName] = useState("")
  const [sampleFreq, setSampleFreq] = useState(440)
  const [showAddSample, setShowAddSample] = useState(false)

  useEffect(() => {
    if (samples.length > 0 && !currentSampleId) {
      setCurrentSample(samples[0].id)
    }
  }, [samples, currentSampleId, setCurrentSample])

  const currentSample = useMemo(
    () => samples.find((s) => s.id === currentSampleId),
    [samples, currentSampleId]
  )

  const envelopeData = useMemo(() => {
    if (!currentSample) return []
    return applyEnvelopeToSample(currentSample.id, editingEnvelope)
  }, [currentSample, editingEnvelope, applyEnvelopeToSample])

  const currentVersion = useMemo(
    () => versions.find((v) => v.id === useEnvelopeStore.getState().currentVersionId),
    [versions]
  )

  const handleAddSample = () => {
    const name = sampleName.trim() || `样例 ${samples.length + 1}`
    addSample(name, sampleFreq, 2)
    setSampleName("")
    setShowAddSample(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex gap-4 p-4">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              <select
                value={currentSampleId || ""}
                onChange={(e) => setCurrentSample(e.target.value)}
                className="bg-[#1a1a2e] text-[#00ff88] text-sm rounded-lg px-3 py-2 border border-white/10 focus:border-[#00ff88] focus:outline-none min-w-[180px]"
              >
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <button
                onClick={() => setShowAddSample(!showAddSample)}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-[#00ff8833] text-[#00ff88] bg-[#00ff8810] hover:bg-[#00ff8820] transition-colors"
              >
                <Plus size={14} />
                添加波形
              </button>

              {currentVersion && (
                <span className="ml-auto text-xs text-white/30 font-mono">
                  当前版本: {currentVersion.label}
                </span>
              )}
            </div>

            {showAddSample && (
              <div className="flex items-center gap-2 p-3 bg-[#0d0d1a] rounded-lg border border-white/5">
                <input
                  type="text"
                  value={sampleName}
                  onChange={(e) => setSampleName(e.target.value)}
                  placeholder="样例名称"
                  className="bg-[#1a1a2e] text-white text-sm rounded px-3 py-1.5 border border-white/10 focus:border-[#00ff88] focus:outline-none w-40"
                />
                <select
                  value={sampleFreq}
                  onChange={(e) => setSampleFreq(Number(e.target.value))}
                  className="bg-[#1a1a2e] text-[#00ff88] text-sm rounded px-2 py-1.5 border border-white/10 focus:border-[#00ff88] focus:outline-none"
                >
                  {[100, 220, 440, 880, 1000, 2000].map((f) => (
                    <option key={f} value={f}>{f} Hz</option>
                  ))}
                </select>
                <button
                  onClick={handleAddSample}
                  className="px-3 py-1.5 text-xs bg-[#00ff8820] text-[#00ff88] border border-[#00ff8833] rounded hover:bg-[#00ff8830] transition-colors"
                >
                  确认
                </button>
              </div>
            )}

            <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">波形显示</h3>
                {currentSample && (
                  <span className="text-[10px] text-white/30 font-mono">
                    {currentSample.sampleRate}Hz · {currentSample.duration.toFixed(1)}s · {currentSample.data.length.toLocaleString()} samples
                  </span>
                )}
              </div>
              {currentSample ? (
                <WaveformDisplay
                  data={currentSample.data}
                  envelopeData={envelopeData.length > 0 ? envelopeData : undefined}
                  sampleRate={currentSample.sampleRate}
                  height={220}
                />
              ) : (
                <div className="h-[220px] bg-[#0a0a0f] rounded-lg flex items-center justify-center text-white/20 text-sm">
                  请添加波形样例
                </div>
              )}
              <div className="flex items-center gap-4 text-[10px] text-white/30">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-[#00ff88] inline-block" />
                  原始波形
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-[2px] bg-[#44aaff] opacity-70 inline-block" />
                  包络后波形
                </span>
              </div>
            </div>

            <EnvelopeControls />
          </div>

          <div className="w-72 shrink-0 space-y-4">
            <div className="bg-[#0d0d1a] rounded-xl border border-white/5 p-4">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3">版本时间线</h3>
              <VersionTimeline />
            </div>

            <ClassroomQuestions />
          </div>
        </div>
      </div>

      <AudioPlayer />
    </div>
  )
}
