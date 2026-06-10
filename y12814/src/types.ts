export type SampleStatus = "pass" | "pending" | "bad"

export interface Sample {
  id: string
  speciesName: string
  standardName: string | null
  titerValue: number
  batchNo: string
  status: SampleStatus
  blockReason: string | null
  isSynonym: boolean
  isContaminated: boolean
  createdAt: string
}

export interface BatchSummary {
  batchNo: string
  total: number
  passCount: number
  pendingCount: number
  badCount: number
}

export interface SynonymRule {
  standardName: string
  synonyms: string[]
}

export interface RunRecord {
  runId: string
  batchNo: string
  timestamp: string
  sampleCount: number
}

export const EXPECTED_SPECIES = [
  "Mus musculus",
  "Rattus norvegicus",
]

export const SYNONYM_RULES: SynonymRule[] = [
  {
    standardName: "Mus musculus",
    synonyms: ["Mus musculus domesticus", "Mus musculus castaneus"],
  },
  {
    standardName: "Rattus norvegicus",
    synonyms: ["Rattus norvegicus albus", "Epimys norvegicus"],
  },
]

export const INITIAL_SAMPLES: Sample[] = [
  {
    id: "S001",
    speciesName: "Mus musculus",
    standardName: null,
    titerValue: 640,
    batchNo: "B20240315",
    status: "pass",
    blockReason: null,
    isSynonym: false,
    isContaminated: false,
    createdAt: "2024-03-15T09:00:00Z",
  },
  {
    id: "S002",
    speciesName: "Mus musculus domesticus",
    standardName: "Mus musculus",
    titerValue: 320,
    batchNo: "B20240315",
    status: "pending",
    blockReason:
      "物种名同义：Mus musculus domesticus 是 Mus musculus 的同义名，需确认是否为同一物种",
    isSynonym: true,
    isContaminated: false,
    createdAt: "2024-03-15T09:30:00Z",
  },
  {
    id: "S003",
    speciesName: "Gallus gallus",
    standardName: null,
    titerValue: 20,
    batchNo: "B20240315",
    status: "bad",
    blockReason:
      "污染样本：Gallus gallus（家鸡）不属于本批次预期物种范围，疑似样本混入",
    isSynonym: false,
    isContaminated: true,
    createdAt: "2024-03-15T10:00:00Z",
  },
]

export const BATCHES = ["B20240315", "B20240201", "B20240110"]

export function detectSynonym(
  speciesName: string
): { isSynonym: boolean; standardName: string | null } {
  for (const rule of SYNONYM_RULES) {
    if (rule.synonyms.includes(speciesName)) {
      return { isSynonym: true, standardName: rule.standardName }
    }
    if (rule.standardName === speciesName) {
      return { isSynonym: false, standardName: null }
    }
  }
  return { isSynonym: false, standardName: null }
}

export function detectContamination(speciesName: string): boolean {
  const allExpected = EXPECTED_SPECIES.flatMap((s) => {
    const rule = SYNONYM_RULES.find((r) => r.standardName === s)
    return rule ? [s, ...rule.synonyms] : [s]
  })
  return !allExpected.includes(speciesName)
}

export function computeSampleStatus(
  speciesName: string
): {
  isSynonym: boolean
  standardName: string | null
  isContaminated: boolean
  status: SampleStatus
  blockReason: string | null
} {
  const { isSynonym, standardName } = detectSynonym(speciesName)
  const isContaminated = detectContamination(speciesName)

  if (isContaminated) {
    return {
      isSynonym: false,
      standardName: null,
      isContaminated: true,
      status: "bad",
      blockReason: `污染样本：${speciesName} 不属于本批次预期物种范围，疑似样本混入`,
    }
  }

  if (isSynonym) {
    return {
      isSynonym: true,
      standardName,
      isContaminated: false,
      status: "pending",
      blockReason: `物种名同义：${speciesName} 是 ${standardName} 的同义名，需确认是否为同一物种`,
    }
  }

  return {
    isSynonym: false,
    standardName: null,
    isContaminated: false,
    status: "pass",
    blockReason: null,
  }
}

export function titerToLabel(value: number): string {
  if (value <= 0) return "0"
  if (!Number.isInteger(Math.log2(value))) return `1:${value}`
  return `1:${value}`
}
