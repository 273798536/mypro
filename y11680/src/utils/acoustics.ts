import type {
  RoomConfig,
  SoundSource,
  StandingWaveMode,
  PressurePoint,
  FrequencyResponsePoint,
  AcousticMaterial,
  AbsorberPanel,
  MeasurementPoint,
} from '../types';

export const SPEED_OF_SOUND = 343;

export function calculateStandingWaves(
  room: RoomConfig,
  maxFrequency: number = 500
): StandingWaveMode[] {
  const modes: StandingWaveMode[] = [];
  const maxP = Math.floor((2 * maxFrequency * room.width) / SPEED_OF_SOUND);
  const maxQ = Math.floor((2 * maxFrequency * room.height) / SPEED_OF_SOUND);
  const maxR = Math.floor((2 * maxFrequency * room.depth) / SPEED_OF_SOUND);

  for (let p = 0; p <= maxP; p++) {
    for (let q = 0; q <= maxQ; q++) {
      for (let r = 0; r <= maxR; r++) {
        if (p === 0 && q === 0 && r === 0) continue;

        const frequency =
          (SPEED_OF_SOUND / 2) *
          Math.sqrt(
            Math.pow(p / room.width, 2) +
              Math.pow(q / room.height, 2) +
              Math.pow(r / room.depth, 2)
          );

        if (frequency <= maxFrequency) {
          const nonZeroCount = [p, q, r].filter((n) => n > 0).length;
          let type: 'axial' | 'tangential' | 'oblique';
          if (nonZeroCount === 1) type = 'axial';
          else if (nonZeroCount === 2) type = 'tangential';
          else type = 'oblique';

          modes.push({ p, q, r, frequency, type });
        }
      }
    }
  }

  return modes.sort((a, b) => a.frequency - b.frequency);
}

export function calculateSoundPressure(
  room: RoomConfig,
  source: SoundSource,
  x: number,
  y: number,
  z: number,
  time: number = 0
): number {
  const omega = 2 * Math.PI * source.frequency;
  const k = omega / SPEED_OF_SOUND;

  const dx = x - source.x;
  const dy = y - source.y;
  const dz = z - source.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (distance < 0.01) return source.amplitude;

  const directPressure = (source.amplitude * Math.sin(k * distance - omega * time)) / distance;

  let reflectionPressure = 0;
  const reflectionOrders = 1;

  for (let ox = -reflectionOrders; ox <= reflectionOrders; ox++) {
    for (let oy = -reflectionOrders; oy <= reflectionOrders; oy++) {
      for (let oz = -reflectionOrders; oz <= reflectionOrders; oz++) {
        if (ox === 0 && oy === 0 && oz === 0) continue;

        let imageX = source.x;
        let imageY = source.y;
        let imageZ = source.z;

        if (ox !== 0) {
          imageX = ox % 2 === 0 ? source.x + ox * room.width : (ox + 1) * room.width - source.x;
        }
        if (oy !== 0) {
          imageY = oy % 2 === 0 ? source.y + oy * room.height : (oy + 1) * room.height - source.y;
        }
        if (oz !== 0) {
          imageZ = oz % 2 === 0 ? source.z + oz * room.depth : (oz + 1) * room.depth - source.z;
        }

        const imgDx = x - imageX;
        const imgDy = y - imageY;
        const imgDz = z - imageZ;
        const imgDist = Math.sqrt(imgDx * imgDx + imgDy * imgDy + imgDz * imgDz);

        if (imgDist > 0.01) {
          const reflections = Math.abs(ox) + Math.abs(oy) + Math.abs(oz);
          const attenuation = Math.pow(0.7, reflections);
          reflectionPressure +=
            (source.amplitude * attenuation * Math.sin(k * imgDist - omega * time)) / imgDist;
        }
      }
    }
  }

  return directPressure + reflectionPressure * 0.3;
}

export function calculatePressureField(
  room: RoomConfig,
  source: SoundSource,
  resolution: number = 15,
  time: number = 0
): PressurePoint[] {
  const points: PressurePoint[] = [];
  const stepX = room.width / resolution;
  const stepY = room.height / resolution;
  const stepZ = room.depth / resolution;

  let maxPressure = 0;
  const tempPoints: PressurePoint[] = [];

  for (let i = 0; i <= resolution; i++) {
    for (let j = 0; j <= resolution; j++) {
      for (let k = 0; k <= resolution; k++) {
        const x = i * stepX;
        const y = j * stepY;
        const z = k * stepZ;

        const pressure = calculateSoundPressure(room, source, x, y, z, time);
        const absPressure = Math.abs(pressure);
        if (absPressure > maxPressure) maxPressure = absPressure;

        tempPoints.push({ x, y, z, pressure, normalizedPressure: 0 });
      }
    }
  }

  for (const point of tempPoints) {
    point.normalizedPressure = maxPressure > 0 ? Math.abs(point.pressure) / maxPressure : 0;
    points.push(point);
  }

  return points;
}

export function calculateFrequencyResponse(
  room: RoomConfig,
  source: SoundSource,
  point: MeasurementPoint,
  materials: AcousticMaterial[],
  panels: AbsorberPanel[],
  minFreq: number = 20,
  maxFreq: number = 2000,
  steps: number = 100
): FrequencyResponsePoint[] {
  const response: FrequencyResponsePoint[] = [];
  const freqStep = (maxFreq - minFreq) / steps;

  const totalAbsorption = calculateTotalAbsorption(materials, panels, source.frequency);

  for (let i = 0; i <= steps; i++) {
    const frequency = minFreq + i * freqStep;
    const testSource = { ...source, frequency };

    let pressureSum = 0;
    const sampleCount = 5;
    for (let t = 0; t < sampleCount; t++) {
      const time = t / (sampleCount * frequency);
      pressureSum += Math.pow(
        calculateSoundPressure(room, testSource, point.x, point.y, point.z, time),
        2
      );
    }

    const rmsPressure = Math.sqrt(pressureSum / sampleCount);
    const referencePressure = 2e-5;
    let dB = 20 * Math.log10(rmsPressure / referencePressure + 1e-10);

    dB -= totalAbsorption * 5;

    response.push({ frequency, dB });
  }

  return response;
}

function calculateTotalAbsorption(
  materials: AcousticMaterial[],
  panels: AbsorberPanel[],
  frequency: number
): number {
  let totalAbsorption = 0;

  for (const panel of panels) {
    const material = materials.find((m) => m.id === panel.materialId);
    if (material) {
      const area = panel.width * panel.height;
      const absorption = getAbsorptionAtFrequency(material, frequency);
      totalAbsorption += area * absorption;
    }
  }

  return totalAbsorption;
}

export function getAbsorptionAtFrequency(
  material: AcousticMaterial,
  frequency: number
): number {
  const coeffs = material.absorptionCoefficient;
  const freqs = Object.keys(coeffs)
    .map(Number)
    .sort((a, b) => a - b);

  if (freqs.length === 0) return 0;
  if (frequency <= freqs[0]) return coeffs[freqs[0]];
  if (frequency >= freqs[freqs.length - 1]) return coeffs[freqs[freqs.length - 1]];

  for (let i = 0; i < freqs.length - 1; i++) {
    if (frequency >= freqs[i] && frequency <= freqs[i + 1]) {
      const t = (frequency - freqs[i]) / (freqs[i + 1] - freqs[i]);
      return coeffs[freqs[i]] * (1 - t) + coeffs[freqs[i + 1]] * t;
    }
  }

  return 0.5;
}

export function pressureToColor(normalizedPressure: number): [number, number, number] {
  const r = Math.min(1, normalizedPressure * 2);
  const g = Math.min(1, Math.max(0, (normalizedPressure - 0.25) * 2));
  const b = Math.max(0, 1 - normalizedPressure * 1.5);
  return [r, g, b];
}

export function calculateRT60(
  room: RoomConfig,
  materials: AcousticMaterial[],
  panels: AbsorberPanel[],
  frequency: number
): number {
  const volume = room.width * room.height * room.depth;
  const surfaceArea =
    2 * (room.width * room.height + room.width * room.depth + room.height * room.depth);

  let totalAbsorption = 0;
  for (const panel of panels) {
    const material = materials.find((m) => m.id === panel.materialId);
    if (material) {
      const area = panel.width * panel.height;
      totalAbsorption += area * getAbsorptionAtFrequency(material, frequency);
    }
  }

  const defaultAbsorption = surfaceArea * 0.02;
  totalAbsorption = Math.max(totalAbsorption, defaultAbsorption);

  return (0.161 * volume) / totalAbsorption;
}
