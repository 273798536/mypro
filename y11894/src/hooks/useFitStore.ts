import { create } from 'zustand';
import type { FitModel, FitResult, DiagnosisResult, ResidualAnalysis, DataPoint } from '../utils/types';
import { getModelById, models, sampleDatasets } from '../utils/models';
import { levenbergMarquardt } from '../utils/lmEngine';
import { runFullDiagnosis, computeResidualAnalysis, checkBoundaryTouch } from '../utils/diagnosis';

interface FitState {
  rawData: string;
  xData: number[];
  yData: number[];
  selectedModelId: string;
  initialParams: number[];
  paramBounds: { lower: number; upper: number }[];
  fitResult: FitResult | null;
  diagnosis: DiagnosisResult | null;
  residualAnalysis: ResidualAnalysis | null;
  boundaryTouch: boolean[];
  outliers: DataPoint[];
  isFitting: boolean;

  setRawData: (data: string) => void;
  setSelectedModel: (modelId: string) => void;
  setInitialParam: (index: number, value: number) => void;
  setParamBound: (index: number, type: 'lower' | 'upper', value: number) => void;
  loadSampleData: (datasetId: string) => void;
  runFit: () => void;
  reset: () => void;
}

function parseRawData(raw: string): { x: number[]; y: number[] } {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const x: number[] = [];
  const y: number[] = [];

  for (const line of lines) {
    const parts = line.split(/[\s,;]+/).filter(Boolean);
    if (parts.length >= 2) {
      const xv = parseFloat(parts[0]);
      const yv = parseFloat(parts[1]);
      if (!isNaN(xv) && !isNaN(yv)) {
        x.push(xv);
        y.push(yv);
      }
    }
  }

  return { x, y };
}

export const useFitStore = create<FitState>((set, get) => ({
  rawData: '',
  xData: [],
  yData: [],
  selectedModelId: 'exponential',
  initialParams: [1, 0.1, 0],
  paramBounds: models[0].paramBounds,
  fitResult: null,
  diagnosis: null,
  residualAnalysis: null,
  boundaryTouch: [],
  outliers: [],
  isFitting: false,

  setRawData: (data) => {
    const { x, y } = parseRawData(data);
    set({ rawData: data, xData: x, yData: y });
  },

  setSelectedModel: (modelId) => {
    const model = getModelById(modelId);
    if (model) {
      set({
        selectedModelId: modelId,
        initialParams: [...model.defaultInitial],
        paramBounds: model.paramBounds.map((b) => ({ ...b })),
      });
    }
  },

  setInitialParam: (index, value) => {
    const params = [...get().initialParams];
    params[index] = value;
    set({ initialParams: params });
  },

  setParamBound: (index, type, value) => {
    const bounds = get().paramBounds.map((b) => ({ ...b }));
    if (type === 'lower') bounds[index].lower = value;
    else bounds[index].upper = value;
    set({ paramBounds: bounds });
  },

  loadSampleData: (datasetId) => {
    const dataset = sampleDatasets.find((d) => d.id === datasetId);
    if (!dataset) return;

    const model = getModelById(dataset.modelId);
    const raw = dataset.data.map((d) => `${d.x}, ${d.y}`).join('\n');
    const x = dataset.data.map((d) => d.x);
    const y = dataset.data.map((d) => d.y);

    set({
      rawData: raw,
      xData: x,
      yData: y,
      selectedModelId: dataset.modelId,
      initialParams: dataset.customInitial
        ? [...dataset.customInitial]
        : model
        ? [...model.defaultInitial]
        : [1, 0.1, 0],
      paramBounds: model ? model.paramBounds.map((b) => ({ ...b })) : [],
      fitResult: null,
      diagnosis: null,
      residualAnalysis: null,
      boundaryTouch: [],
      outliers: [],
    });
  },

  runFit: () => {
    const { xData, yData, selectedModelId, initialParams, paramBounds } = get();
    const model = getModelById(selectedModelId);
    if (!model || xData.length < model.paramNames.length + 1) return;

    set({ isFitting: true });

    try {
      const modelWithBounds: FitModel = { ...model, paramBounds };

      const fitResult = levenbergMarquardt(
        modelWithBounds,
        xData,
        yData,
        initialParams
      );

      const diagnosis = runFullDiagnosis(modelWithBounds, fitResult, xData, yData);

      let residualAnalysis: ResidualAnalysis | null = null;
      if (fitResult.success) {
        residualAnalysis = computeResidualAnalysis(
          modelWithBounds,
          fitResult.parameters,
          xData,
          yData
        );
      }

      const boundaryTouch = checkBoundaryTouch(
        fitResult.parameters,
        paramBounds
      );

      set({
        fitResult,
        diagnosis,
        residualAnalysis,
        boundaryTouch,
        outliers: diagnosis.outliers,
        isFitting: false,
      });
    } catch {
      set({ isFitting: false });
    }
  },

  reset: () => {
    const model = getModelById('exponential');
    set({
      rawData: '',
      xData: [],
      yData: [],
      selectedModelId: 'exponential',
      initialParams: model ? [...model.defaultInitial] : [1, 0.1, 0],
      paramBounds: model ? model.paramBounds.map((b) => ({ ...b })) : [],
      fitResult: null,
      diagnosis: null,
      residualAnalysis: null,
      boundaryTouch: [],
      outliers: [],
      isFitting: false,
    });
  },
}));
