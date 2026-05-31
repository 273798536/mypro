import { useEffect, useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getBrickById } from "@/config/bricks";
import { playFrequencyBrick, stopAllAudio, generateTargetWaveform } from "@/utils/audioEngine";
import WaveformCanvas from "@/components/WaveformCanvas";
import SpectrumCanvas from "@/components/SpectrumCanvas";
import FreqBrickSelector from "@/components/FreqBrickSelector";
import BeatTrack from "@/components/BeatTrack";
import PauseOverlay from "@/components/PauseOverlay";
import { Pause, VolumeX } from "lucide-react";

export default function Game() {
  const navigate = useNavigate();
  const status = useGameStore((s) => s.status);
  const currentBeat = useGameStore((s) => s.currentBeat);
  const totalBeats = useGameStore((s) => s.totalBeats);
  const bpm = useGameStore((s) => s.bpm);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const beatEvents = useGameStore((s) => s.beatEvents);
  const targetSequence = useGameStore((s) => s.targetSequence);
  const availableBricks = useGameStore((s) => s.availableBricks);
  const selectedBrickId = useGameStore((s) => s.selectedBrickId);
  const placeBrick = useGameStore((s) => s.placeBrick);
  const advanceBeat = useGameStore((s) => s.advanceBeat);
  const pauseGame = useGameStore((s) => s.pauseGame);
  const endGame = useGameStore((s) => s.endGame);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localScore, setLocalScore] = useState(0);

  const brickFreqMap = new Map(availableBricks.map((b) => [b.id, b.centerFreq]));
  const currentTarget = targetSequence[currentBeat] || [];
  const targetWaveform = generateTargetWaveform(currentTarget, brickFreqMap, 512);

  const scheduleNextBeat = useCallback(() => {
    if (status !== "playing") return;
    const beatDuration = 60000 / bpm;

    timerRef.current = setTimeout(() => {
      advanceBeat();
    }, beatDuration);
  }, [status, bpm, advanceBeat]);

  useEffect(() => {
    if (status === "playing") {
      scheduleNextBeat();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [status, currentBeat, scheduleNextBeat]);

  useEffect(() => {
    if (status === "ended") {
      stopAllAudio();
      navigate("/result");
    }
  }, [status, navigate]);

  useEffect(() => {
    let s = 0;
    for (const ev of beatEvents) {
      s += Math.round(ev.spectrumScore * 40 / totalBeats + ev.rhythmScore * 30 / totalBeats);
    }
    setLocalScore(s);
  }, [beatEvents, totalBeats]);

  const handleBeatClick = useCallback(
    (beatIndex: number) => {
      if (status !== "playing" || !selectedBrickId) return;
      placeBrick(beatIndex);

      const brick = getBrickById(selectedBrickId);
      if (brick) {
        playFrequencyBrick(brick.id, brick.centerFreq, "sine", 0.4);
      }
    },
    [status, selectedBrickId, placeBrick]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (status === "playing") pauseGame();
      }
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (status === "playing" && selectedBrickId) {
          handleBeatClick(currentBeat);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, selectedBrickId, currentBeat, pauseGame, handleBeatClick]);

  const playerBrickIdsForSpectrum = selectedBrickId ? [selectedBrickId] : [];

  const progress = totalBeats > 0 ? ((currentBeat + 1) / totalBeats) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a1a3a] bg-[#0a0a1a]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={pauseGame}
            className="p-2 rounded-lg hover:bg-white/5 text-[#6688aa] hover:text-white transition-colors"
          >
            <Pause size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#445566]">BPM</span>
            <span className="text-sm font-bold text-[#33ff99] font-mono">{bpm}</span>
          </div>
        </div>

        <div className="flex-1 mx-8">
          <div className="h-1.5 bg-[#1a1a3a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#ff3366] via-[#33ff99] to-[#3366ff] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-[#445566]">{currentBeat + 1}/{totalBeats}</span>
            <span className="text-[9px] text-[#445566]">拍 {currentBeat + 1}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-[#445566]">连击</span>
            <span className="ml-2 text-sm font-bold text-[#33ccff] font-mono">{combo}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[#445566]">得分</span>
            <span className="ml-2 text-sm font-bold text-[#33ff99] font-mono">{localScore}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-3 px-4 pt-3">
        <div className="flex flex-col gap-2">
          <WaveformCanvas width={280} height={100} targetWaveform={targetWaveform} label="波形预览 · 目标(绿)/合成(白)" />
          <SpectrumCanvas
            width={280}
            height={100}
            playerBrickIds={playerBrickIdsForSpectrum}
            targetBrickIds={currentTarget}
            label="频谱预览 · 实时"
          />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="mb-3 text-center">
            <span className="text-xs text-[#6688aa]">当前目标频段</span>
            <div className="flex gap-2 mt-1 justify-center">
              {currentTarget.map((id) => {
                const brick = getBrickById(id);
                if (!brick) return null;
                return (
                  <div
                    key={id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{
                      backgroundColor: `${brick.color}20`,
                      color: brick.color,
                      border: `1px dashed ${brick.color}`,
                    }}
                  >
                    {brick.label}
                  </div>
                );
              })}
            </div>
          </div>

          <BeatTrack onBeatClick={handleBeatClick} />

          <div className="mt-3 text-center">
            <span className="text-[10px] text-[#445566]">
              {selectedBrickId
                ? `已选: ${getBrickById(selectedBrickId)?.label || ""} — 点击节拍轨放置 或 按空格键`
                : "请先选择下方频段砖"}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[#1a1a3a] py-3 px-4 bg-[#0a0a1a]/80 backdrop-blur-sm">
        <FreqBrickSelector />
      </div>

      <PauseOverlay />
    </div>
  );
}
