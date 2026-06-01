import { useState, useRef, useEffect, useCallback } from "react"
import { Play, Pause, Square } from "lucide-react"
import { useEnvelopeStore } from "@/store"

const FREQS = [100, 220, 440, 880, 1000, 2000]
const SUSTAIN_DUR = 0.5

function formatTime(t: number) {
  const m = Math.floor(t / 60)
  const s = (t % 60).toFixed(2)
  return `${m}:${s.padStart(5, "0")}`
}

export default function AudioPlayer() {
  const envelope = useEnvelopeStore((s) => s.editingEnvelope)
  const [playing, setPlaying] = useState(false)
  const [paused, setPaused] = useState(false)
  const [freq, setFreq] = useState(440)
  const [curTime, setCurTime] = useState(0)
  const [dur, setDur] = useState(0)

  const ctxRef = useRef<AudioContext | null>(null)
  const oscRef = useRef<OscillatorNode | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const startRef = useRef(0)
  const pausedAtRef = useRef(0)
  const rafRef = useRef(0)

  const total = envelope.attack + envelope.decay + SUSTAIN_DUR + envelope.release

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    oscRef.current?.stop()
    oscRef.current?.disconnect()
    gainRef.current?.disconnect()
    oscRef.current = null
    gainRef.current = null
  }, [])

  const startAudio = useCallback((offset = 0) => {
    cleanup()
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    const ctx = ctxRef.current

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    osc.connect(gain)
    gain.connect(ctx.destination)

    const { attack, decay, sustain, release } = envelope
    const now = ctx.currentTime
    const aEnd = attack, dEnd = attack + decay, sEnd = dEnd + SUSTAIN_DUR, rEnd = sEnd + release

    if (offset === 0) {
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(1, now + aEnd)
      gain.gain.linearRampToValueAtTime(sustain, now + dEnd)
      gain.gain.setValueAtTime(sustain, now + sEnd)
      gain.gain.linearRampToValueAtTime(0, now + rEnd)
    } else {
      const t = offset
      const sg = t < aEnd ? t / attack
        : t < dEnd ? 1 - (1 - sustain) * ((t - attack) / decay)
        : t < sEnd ? sustain
        : t < rEnd ? sustain * (1 - (t - sEnd) / release) : 0

      gain.gain.setValueAtTime(sg, now)
      if (t < aEnd) {
        gain.gain.linearRampToValueAtTime(1, now + (aEnd - t))
        gain.gain.linearRampToValueAtTime(sustain, now + (dEnd - t))
        gain.gain.setValueAtTime(sustain, now + (sEnd - t))
        gain.gain.linearRampToValueAtTime(0, now + (rEnd - t))
      } else if (t < dEnd) {
        gain.gain.linearRampToValueAtTime(sustain, now + (dEnd - t))
        gain.gain.setValueAtTime(sustain, now + (sEnd - t))
        gain.gain.linearRampToValueAtTime(0, now + (rEnd - t))
      } else if (t < sEnd) {
        gain.gain.setValueAtTime(sustain, now + (sEnd - t))
        gain.gain.linearRampToValueAtTime(0, now + (rEnd - t))
      } else if (t < rEnd) {
        gain.gain.linearRampToValueAtTime(0, now + (rEnd - t))
      }
    }

    osc.start(now)
    osc.stop(now + total - offset)
    osc.onended = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      setPlaying(false)
      setPaused(false)
      setCurTime(0)
      pausedAtRef.current = 0
    }

    oscRef.current = osc
    gainRef.current = gain
    startRef.current = now - offset
    setDur(total)
    setPlaying(true)
    setPaused(false)
  }, [envelope, freq, total, cleanup])

  useEffect(() => {
    if (!playing || paused) return
    const tick = () => {
      if (ctxRef.current) {
        const elapsed = ctxRef.current.currentTime - startRef.current
        setCurTime(Math.min(elapsed, dur))
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, paused, dur])

  useEffect(() => {
    if (playing && !paused) startAudio(pausedAtRef.current)
  }, [envelope, freq])

  const handlePause = () => {
    if (ctxRef.current && oscRef.current) {
      pausedAtRef.current = ctxRef.current.currentTime - startRef.current
      cleanup()
      setPaused(true)
      setPlaying(false)
    }
  }

  const handleStop = () => {
    cleanup()
    setPlaying(false)
    setPaused(false)
    setCurTime(0)
    pausedAtRef.current = 0
  }

  const progress = dur > 0 ? Math.min((curTime / dur) * 100, 100) : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <button
          onClick={playing ? handlePause : () => startAudio(paused ? pausedAtRef.current : 0)}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-[#00ff88] transition-colors"
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={handleStop}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-[#00ff88] transition-colors"
        >
          <Square size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Freq</span>
        <select
          value={freq}
          onChange={(e) => setFreq(Number(e.target.value))}
          className="bg-gray-800 text-[#00ff88] text-sm rounded px-2 py-1 border border-gray-600 focus:border-[#00ff88] focus:outline-none"
        >
          {FREQS.map((f) => <option key={f} value={f}>{f} Hz</option>)}
        </select>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00ff88] rounded-full"
            style={{ width: `${progress}%`, transition: "width 0.05s linear" }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatTime(curTime)}</span>
          <span>{formatTime(dur)}</span>
        </div>
      </div>
    </div>
  )
}
