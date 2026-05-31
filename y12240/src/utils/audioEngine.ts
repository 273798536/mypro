type OscillatorType = "sine" | "square" | "sawtooth" | "triangle";

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
const activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map();

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.3;
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    masterGain.connect(analyser);
    analyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAnalyser(): AnalyserNode | null {
  return analyser;
}

export function playFrequencyBrick(
  brickId: string,
  centerFreq: number,
  waveType: OscillatorType = "sine",
  duration: number = 0.3
): void {
  const ctx = getAudioContext();
  if (!masterGain) return;

  stopBrick(brickId);

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveType;
  osc.frequency.value = centerFreq;
  gain.gain.value = 0.15;

  osc.connect(gain);
  gain.connect(masterGain);

  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  activeOscillators.set(brickId, { osc, gain });

  setTimeout(() => {
    stopBrick(brickId);
  }, duration * 1000);
}

export function playBrickCombo(
  bricks: { id: string; centerFreq: number }[],
  duration: number = 0.5
): void {
  const ctx = getAudioContext();
  if (!masterGain) return;

  bricks.forEach((b) => {
    stopBrick(b.id);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = b.centerFreq;
    gain.gain.value = Math.max(0.05, 0.15 / bricks.length);

    osc.connect(gain);
    gain.connect(masterGain!);

    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    activeOscillators.set(b.id, { osc, gain });

    setTimeout(() => {
      stopBrick(b.id);
    }, duration * 1000);
  });
}

function stopBrick(brickId: string): void {
  const entry = activeOscillators.get(brickId);
  if (entry) {
    try {
      entry.gain.gain.cancelScheduledValues(0);
      entry.osc.stop();
    } catch {}
    activeOscillators.delete(brickId);
  }
}

export function stopAllAudio(): void {
  activeOscillators.forEach((_, id) => stopBrick(id));
}

export function getFrequencyData(): Uint8Array {
  if (!analyser) return new Uint8Array(0);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  return data;
}

export function getTimeDomainData(): Uint8Array {
  if (!analyser) return new Uint8Array(0);
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  return data;
}

export function generateTargetWaveform(
  brickIds: string[],
  brickFreqs: Map<string, number>,
  sampleCount: number = 512
): Float32Array {
  const result = new Float32Array(sampleCount);
  if (brickIds.length === 0) return result;

  for (let i = 0; i < sampleCount; i++) {
    let val = 0;
    for (const id of brickIds) {
      const freq = brickFreqs.get(id) || 440;
      val += Math.sin((2 * Math.PI * freq * i) / 44100);
    }
    result[i] = val / brickIds.length;
  }

  return result;
}

export function computeSpectrumSimilarity(
  playerBrickIds: string[],
  targetBrickIds: string[],
  allBrickIds: string[]
): number {
  if (targetBrickIds.length === 0) return 1;
  if (playerBrickIds.length === 0) return 0;

  const playerSet = new Set(playerBrickIds);
  const targetSet = new Set(targetBrickIds);

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const id of allBrickIds) {
    const a = playerSet.has(id) ? 1 : 0;
    const b = targetSet.has(id) ? 1 : 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeWaveformMSE(
  waveformA: Float32Array,
  waveformB: Float32Array
): number {
  const len = Math.min(waveformA.length, waveformB.length);
  if (len === 0) return 1;

  let sum = 0;
  for (let i = 0; i < len; i++) {
    const diff = waveformA[i] - waveformB[i];
    sum += diff * diff;
  }
  return sum / len;
}
