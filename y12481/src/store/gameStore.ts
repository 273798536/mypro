import { create } from 'zustand';
import {
  GameState,
  Planet,
  Sample,
  RhythmPackage,
  HistoryRecord,
  CopyrightClaim,
  NoiseEvent,
  PlanetId,
  SampleId,
  PackageId,
} from '../types';
import { initialPlanets, initialSamples } from '../data/initialData';

interface GameStore extends GameState {
  planets: Planet[];
  allSamples: Sample[];
  selectedSample: SampleId | null;
  currentPackage: SampleId[];
  
  travelToPlanet: (planetId: PlanetId) => boolean;
  collectSample: (sampleId: SampleId) => boolean;
  addToPackage: (sampleId: SampleId) => void;
  removeFromPackage: (sampleId: SampleId) => void;
  createPackage: (name: string) => PackageId | null;
  deliverPackage: (packageId: PackageId) => boolean;
  selectSample: (sampleId: SampleId | null) => void;
  getSampleById: (sampleId: SampleId) => Sample | undefined;
  getPlanetById: (planetId: PlanetId) => Planet | undefined;
  getPackageById: (packageId: PackageId) => RhythmPackage | undefined;
  getHistoryTrace: (recordId: string) => HistoryRecord | undefined;
  resetGame: () => void;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

const createHistoryRecord = (
  type: HistoryRecord['type'],
  action: string,
  result: HistoryRecord['result'],
  details: Record<string, unknown>,
  sourceRef?: HistoryRecord['sourceRef']
): HistoryRecord => ({
  id: generateId(),
  timestamp: Date.now(),
  type,
  action,
  result,
  details,
  sourceRef,
});

const checkCopyright = (samples: Sample[]): CopyrightClaim[] => {
  const claims: CopyrightClaim[] = [];
  samples.forEach((sample) => {
    const riskRoll = Math.random() * 100;
    if (riskRoll < sample.copyrightRisk) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (sample.copyrightRisk > 60) severity = 'high';
      else if (sample.copyrightRisk > 30) severity = 'medium';

      claims.push({
        id: generateId(),
        sampleId: sample.id,
        reason: `采样「${sample.name}」涉嫌版权冲突`,
        severity,
        timestamp: Date.now(),
      });
    }
  });
  return claims;
};

const checkNoise = (samples: Sample[], dangerLevel: number): NoiseEvent[] => {
  const events: NoiseEvent[] = [];
  samples.forEach((sample) => {
    const noiseChance = Math.random() * 100;
    const threshold = dangerLevel * 15;
    if (noiseChance < threshold) {
      const types: NoiseEvent['type'][] = ['static', 'interference', 'corruption'];
      const type = types[Math.floor(Math.random() * types.length)];
      const descriptions: Record<NoiseEvent['type'], string> = {
        static: '静电噪声干扰',
        interference: '信号干扰',
        corruption: '数据损坏',
      };
      events.push({
        id: generateId(),
        type,
        affectedSampleId: sample.id,
        severity: Math.random() * 50 + 10,
        description: descriptions[type],
      });
    }
  });
  return events;
};

const calculatePackageScore = (
  samples: Sample[],
  copyrightClaims: CopyrightClaim[],
  noiseEvents: NoiseEvent[]
): number => {
  let baseScore = 0;
  samples.forEach((sample) => {
    baseScore += sample.quality * 0.5 + sample.uniqueness * 0.5;
  });

  const genreBonus = new Set(samples.map((s) => s.genre)).size === 1 ? 1.2 : 1;
  baseScore *= genreBonus;

  const copyrightPenalty = copyrightClaims.reduce((sum, claim) => {
    const penalties = { low: 20, medium: 50, high: 100 };
    return sum + penalties[claim.severity];
  }, 0);

  const noisePenalty = noiseEvents.reduce((sum, event) => sum + event.severity, 0);

  return Math.max(0, Math.round(baseScore - copyrightPenalty - noisePenalty));
};

export const useGameStore = create<GameStore>((set, get) => ({
  fuel: 100,
  maxFuel: 100,
  score: 0,
  currentPlanet: 'planet-ambient',
  collectedSamples: [],
  packages: [],
  history: [],
  isGameOver: false,
  planets: initialPlanets,
  allSamples: initialSamples,
  selectedSample: null,
  currentPackage: [],

  travelToPlanet: (planetId: PlanetId) => {
    const state = get();
    const planet = state.getPlanetById(planetId);
    if (!planet || state.currentPlanet === planetId) return false;
    if (state.fuel < planet.fuelCost) return false;

    const travelNoise = checkNoise(
      state.collectedSamples.map((id) => state.getSampleById(id)!).filter(Boolean),
      planet.dangerLevel
    );

    const historyRecord = createHistoryRecord(
      'collect',
      `航行至 ${planet.name}`,
      'success',
      { fuelCost: planet.fuelCost, dangerLevel: planet.dangerLevel },
      { planetId }
    );

    set((state) => ({
      fuel: state.fuel - planet.fuelCost,
      currentPlanet: planetId,
      history: [...state.history, historyRecord],
    }));

    if (travelNoise.length > 0) {
      travelNoise.forEach((noise) => {
        const noiseRecord = createHistoryRecord(
          'noise',
          noise.description,
          'warning',
          { severity: noise.severity, type: noise.type },
          { sampleId: noise.affectedSampleId, planetId }
        );
        set((state) => ({
          history: [...state.history, noiseRecord],
        }));
      });
    }

    return true;
  },

  collectSample: (sampleId: SampleId) => {
    const state = get();
    const sample = state.getSampleById(sampleId);
    const currentPlanet = state.getPlanetById(state.currentPlanet);

    if (!sample || !currentPlanet) return false;
    if (state.collectedSamples.includes(sampleId)) return false;
    if (!currentPlanet.availableSamples.includes(sampleId)) return false;

    const historyRecord = createHistoryRecord(
      'collect',
      `采集采样「${sample.name}」`,
      'success',
      {
        quality: sample.quality,
        uniqueness: sample.uniqueness,
        copyrightRisk: sample.copyrightRisk,
        genre: sample.genre,
      },
      { planetId: state.currentPlanet, sampleId }
    );

    set((state) => ({
      collectedSamples: [...state.collectedSamples, sampleId],
      history: [...state.history, historyRecord],
    }));

    return true;
  },

  addToPackage: (sampleId: SampleId) => {
    const state = get();
    if (!state.collectedSamples.includes(sampleId)) return;
    if (state.currentPackage.includes(sampleId)) return;

    set((state) => ({
      currentPackage: [...state.currentPackage, sampleId],
    }));
  },

  removeFromPackage: (sampleId: SampleId) => {
    set((state) => ({
      currentPackage: state.currentPackage.filter((id) => id !== sampleId),
    }));
  },

  createPackage: (name: string) => {
    const state = get();
    if (state.currentPackage.length === 0) return null;

    const packageSamples = state.currentPackage
      .map((id) => state.getSampleById(id)!)
      .filter(Boolean);

    const copyrightClaims = checkCopyright(packageSamples);
    const currentPlanetData = state.getPlanetById(state.currentPlanet);
    const noiseEvents = checkNoise(packageSamples, currentPlanetData?.dangerLevel || 1);

    const score = calculatePackageScore(packageSamples, copyrightClaims, noiseEvents);

    const newPackage: RhythmPackage = {
      id: generateId(),
      name,
      samples: state.currentPackage,
      createdAt: Date.now(),
      status: 'draft',
      score,
      copyrightClaims,
      noiseEvents,
    };

    const historyRecord = createHistoryRecord(
      'synthesize',
      `创建包裹「${name}」`,
      copyrightClaims.length > 0 ? 'warning' : 'success',
      {
        sampleCount: packageSamples.length,
        score,
        copyrightClaims: copyrightClaims.length,
        noiseEvents: noiseEvents.length,
      },
      { packageId: newPackage.id }
    );

    copyrightClaims.forEach((claim) => {
      const claimRecord = createHistoryRecord(
        'copyright',
        claim.reason,
        claim.severity === 'high' ? 'failure' : 'warning',
        { severity: claim.severity },
        { sampleId: claim.sampleId, packageId: newPackage.id }
      );
      set((state) => ({
        history: [...state.history, claimRecord],
      }));
    });

    set((state) => ({
      packages: [...state.packages, newPackage],
      currentPackage: [],
      history: [...state.history, historyRecord],
    }));

    return newPackage.id;
  },

  deliverPackage: (packageId: PackageId) => {
    const state = get();
    const pkg = state.getPackageById(packageId);
    if (!pkg || pkg.status !== 'draft') return false;

    const hasHighRiskCopyright = pkg.copyrightClaims.some((c) => c.severity === 'high');

    if (hasHighRiskCopyright) {
      const historyRecord = createHistoryRecord(
        'delivery',
        `包裹「${pkg.name}」投递失败 - 存在高风险版权冲突`,
        'failure',
        { score: pkg.score, copyrightClaims: pkg.copyrightClaims.length },
        { packageId }
      );

      set((state) => ({
        packages: state.packages.map((p) =>
          p.id === packageId ? { ...p, status: 'rejected' as const } : p
        ),
        history: [...state.history, historyRecord],
      }));

      return false;
    }

    const historyRecord = createHistoryRecord(
      'delivery',
      `包裹「${pkg.name}」投递成功`,
      'success',
      { score: pkg.score, delivered: true },
      { packageId }
    );

    set((state) => ({
      score: state.score + pkg.score,
      packages: state.packages.map((p) =>
        p.id === packageId ? { ...p, status: 'delivered' as const } : p
      ),
      history: [...state.history, historyRecord],
    }));

    return true;
  },

  selectSample: (sampleId: SampleId | null) => {
    set({ selectedSample: sampleId });
  },

  getSampleById: (sampleId: SampleId) => {
    return get().allSamples.find((s) => s.id === sampleId);
  },

  getPlanetById: (planetId: PlanetId) => {
    return get().planets.find((p) => p.id === planetId);
  },

  getPackageById: (packageId: PackageId) => {
    return get().packages.find((p) => p.id === packageId);
  },

  getHistoryTrace: (recordId: string) => {
    return get().history.find((r) => r.id === recordId);
  },

  resetGame: () => {
    set({
      fuel: 100,
      score: 0,
      currentPlanet: 'planet-ambient',
      collectedSamples: [],
      packages: [],
      history: [],
      isGameOver: false,
      selectedSample: null,
      currentPackage: [],
    });
  },
}));
