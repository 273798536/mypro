import type {
  ConcentrationCalcResult,
  JudgeResult,
  SampleRecord,
} from "@/types";
import { EPSILON_TABLE } from "@/data/mockData";

export const PATH_LENGTH = 1;

export const getEpsilon = (metalIon: string, ligand: string): number => {
  const key1 = `${metalIon}-${ligand}`;
  if (EPSILON_TABLE[key1]) return EPSILON_TABLE[key1];
  return 1000;
};

export const normalizeConcentration = (
  value: number,
  unit: string
): { molL: number; displayValue: number; displayUnit: string } => {
  switch (unit) {
    case "mmol/L":
      return {
        molL: value / 1000,
        displayValue: value,
        displayUnit: "mmol/L",
      };
    case "μmol/L":
      return {
        molL: value / 1_000_000,
        displayValue: value,
        displayUnit: "μmol/L",
      };
    case "mol/L":
    default:
      return { molL: value, displayValue: value, displayUnit: unit || "mol/L" };
  }
};

export const convertConcentrationUnit = (
  valueMolL: number,
  targetUnit: string
): number => {
  switch (targetUnit) {
    case "mmol/L":
      return valueMolL * 1000;
    case "μmol/L":
      return valueMolL * 1_000_000;
    case "mol/L":
    default:
      return valueMolL;
  }
};

export const calculateConcentration = (
  absorbance: number,
  metalIon: string,
  ligand: string,
  targetUnit = "mol/L"
): ConcentrationCalcResult => {
  const epsilon = getEpsilon(metalIon, ligand);
  const concentrationMolL = absorbance / (epsilon * PATH_LENGTH);
  return {
    absorbance,
    epsilon,
    pathLength: PATH_LENGTH,
    concentration: convertConcentrationUnit(concentrationMolL, targetUnit),
    unit: targetUnit,
    formula: "c = A / (ε × l)",
  };
};

export const formatConcentration = (value: number, unit: string): string => {
  if (value >= 1) return `${value.toFixed(4)} ${unit}`;
  if (value >= 0.001) return `${(value * 1000).toFixed(2)} mmol/L`;
  return `${(value * 1_000_000).toFixed(2)} μmol/L`;
};

export const judgeComplexation = (
  sample: Partial<SampleRecord>
): JudgeResult => {
  const missingTime =
    sample.isMissingReactionTime ||
    sample.reactionTime == null ||
    sample.reactionTimeUnit == null;
  const missingUnit = sample.isMissingUnit || sample.concentrationUnit == null;

  if (missingTime || missingUnit) return "待确认";

  const peakOk = sample.peakAbsorbance != null && sample.peakAbsorbance >= 0.3;
  const conc = sample.concentration ?? 0;
  const unit = sample.concentrationUnit ?? "mol/L";
  const { molL } = normalizeConcentration(conc, unit);
  const concOk = molL > 0 && molL < 0.5;

  const reactionOk = (() => {
    if (!sample.reactionTime || !sample.reactionTimeUnit) return false;
    let minutes = sample.reactionTime;
    if (sample.reactionTimeUnit === "sec") minutes = sample.reactionTime / 60;
    if (sample.reactionTimeUnit === "hr") minutes = sample.reactionTime * 60;
    return minutes >= 3 && minutes <= 30;
  })();

  if (sample.anomalyType === "outlier") return "待确认";

  if (peakOk && concOk && reactionOk) return "络合";
  if (!peakOk) return "未络合";
  return "待确认";
};

export const formatTime = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

export const uid = (): string =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
