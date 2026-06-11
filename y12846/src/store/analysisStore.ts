import { create } from 'zustand';
import type {
  ReferenceSequence,
  PrimerPair,
  Mutation,
  AnalysisResult,
  AnalysisConfig,
  AnomalyRecord,
  MutationImpact,
  CoverageRegion,
  SampleResult,
} from '../lib/utils/types';
import {
  createPrimerPair,
  calculateCoverage,
  calculateCoveragePercent,
  deduplicatePrimerPairs,
  validatePrimerPair,
} from '../lib/bio/primer';
import {
  evaluateAllMutations,
  generateAllSampleResults,
} from '../lib/bio/mutation';
import { generateUniqueId, computeSHA256Sync } from '../lib/utils/hash';
import { parseFastaSync } from '../lib/parsers/fasta';
import { parsePrimersCsvSync, parseMutationsCsvSync } from '../lib/parsers/csv';

const DEFAULT_CONFIG: AnalysisConfig = {
  minTm: 55,
  maxTm: 65,
  threePrimeCriticalBases: 5,
  maxAllowedMismatches: 3,
  minimumAmpliconSize: 70,
  maximumAmpliconSize: 1000,
};

interface AnalysisState {
  reference: ReferenceSequence | null;
  primerPairs: PrimerPair[];
  mutations: Mutation[];
  analysisResult: AnalysisResult | null;
  config: AnalysisConfig;
  loading: boolean;
  error: string | null;
  importWarnings: string[];

  setReference: (reference: ReferenceSequence | null) => void;
  setConfig: (config: Partial<AnalysisConfig>) => void;
  addPrimerPair: (pair: PrimerPair) => void;
  addPrimerPairs: (pairs: PrimerPair[]) => void;
  addMutation: (mutation: Mutation) => void;
  addMutations: (mutations: Mutation[]) => void;
  removePrimerPair: (id: string) => void;
  removeMutation: (id: string) => void;
  runAnalysis: () => void;
  clearData: () => void;
  loadSampleData: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setImportWarnings: (warnings: string[]) => void;
}

function collectAnomalies(primerPairs: PrimerPair[], config: AnalysisConfig): AnomalyRecord[] {
  const anomalies: AnomalyRecord[] = [];
  const nameMap = new Map<string, string[]>();

  for (const pair of primerPairs) {
    const pairAnomalies = validatePrimerPair(pair.forward, pair.reverse, config);
    for (const anomaly of pairAnomalies) {
      anomalies.push({
        ...anomaly,
        primerPairId: pair.id,
      });
    }

    if (!nameMap.has(pair.name)) {
      nameMap.set(pair.name, []);
    }
    nameMap.get(pair.name)!.push(pair.id);
  }

  for (const [name, ids] of nameMap.entries()) {
    if (ids.length > 1) {
      anomalies.push({
        id: generateUniqueId('an'),
        type: 'duplicate_name',
        severity: 'warning',
        message: `Duplicate primer pair name detected: "${name}" (${ids.length} instances)`,
        suggestion: 'Rename primer pairs to unique names to avoid confusion',
      });
    }
  }

  return anomalies;
}

function buildAnalysisResult(
  reference: ReferenceSequence,
  primerPairs: PrimerPair[],
  mutations: Mutation[],
  config: AnalysisConfig
): AnalysisResult {
  const coverage: CoverageRegion[] = calculateCoverage(primerPairs, reference);
  const mutationImpacts: MutationImpact[] = evaluateAllMutations(mutations, primerPairs, config);
  const sampleResults: SampleResult[] = generateAllSampleResults(mutations, primerPairs, mutationImpacts, config);
  const anomalies: AnomalyRecord[] = collectAnomalies(primerPairs, config);
  const coveragePercent = calculateCoveragePercent(coverage, reference.length);

  const validPrimers = primerPairs.filter(
    (p) => p.status === 'valid' || p.status === 'warning'
  ).length;
  const samplesNeedingAttention = sampleResults.filter(
    (s) => s.needsAlternativePrimers
  ).length;
  const gapCount = coverage.filter((r) => r.isGap).length;

  const dataString = [
    reference.id,
    reference.sequence,
    ...primerPairs.map((p) => p.importHash),
    ...mutations.map((m) => `${m.sampleId}:${m.position}:${m.refBase}>${m.altBase}`),
  ].join('|');

  return {
    id: generateUniqueId('ar'),
    createdAt: Date.now(),
    dataHash: computeSHA256Sync(dataString),
    reference,
    primerPairs,
    mutations,
    coverage,
    mutationImpacts,
    sampleResults,
    anomalies,
    config,
    summary: {
      totalPrimers: primerPairs.length,
      validPrimers,
      coveragePercent,
      gapCount,
      samplesNeedingAttention,
      anomalyCount: anomalies.length,
    },
  };
}

const SAMPLE_REFERENCE_FASTA = `>Sample_Virus_Reference|Mock_SARS-CoV-2|3000bp Simulated Sequence
ATGTTTGTTTTTCTTGTTTTATTGCCACTAGTCTCTAGTCAGTGTGTTAATCTTACAACC
AGAATACAAACCGTTGTGTGATTTGTTAATTAGACCTGCCGTTTCCGCAACAAGCCCTAAT
ATTGGTCCATGGCAGATTCCAACGGTACTATTACCGTTGAAGAGCTTAAAGGCTTTGAAGT
TTCACGGATGAGCATTCAAACAAATTGTTGAATCACCTTGGACTTTGAAAATCTCCAGAGG
CAAGATTATGACACGCATTCAGGTGAATTTGAGAATTTGGAAATGGGAGTCCTTCGATTAG
ATAAAGCTTCAGAAAATATTATCGCTAAATTATGTGCCACTTATGCTAATACGACTGAGGC
TGTCAGACGCTTTGACTATGTGATACAGAGGCTTATGGAAGAGACTTGTTTCTTCCATGT
TGTCAATATGGCAATTGGTGACATACGTGCTCAGACTTGTCGACTGTAGTACTAATGCTG
ACTTTGGTTCCACTATGATGACTTTGAGACAGACAGTGGCTGATGTTCGTATGATTAAGG
TTGAGTACGACCATGTCCCAATTCAAGCATCACGTTTGCATGGAATATTACCCATGAATT
TAGTGTTTGACAGACATTTCACAAGTATTAACTATGAGTACTTGAGAGTGTTGAGACATTG
TGCAATTCCAGAAACAAGATACTCTATTTCAAATGATGCTTACCAATTGCGGCAAGATGC
AGATCAAGAAGTTTTAGTTTGGTTAAACACCTACAGGAACGGTGGTTTACCAGTTAATAG
TGGCAGGTATTGGCCTTGATGATGCTGTCAACATCGTTGAATACTGCCGTCACTTCTTGC
TAAATGAAGGCTACTATGAAGTTGAGAAGTTCCGTTACTTAGGTGACATGGAAGATCTTC
TCATCAAGAAGCTGCGTCGTTGCTTACGACATTGACTTGCTGATAAGATGGTTGATAGTG
ACATCTTTGATGAAATCAATAGACGTTATGACCATTTGGGTGTCATGTGTGAGCTAACAG
AATCGTATGGATTTGATCGTTTCCATGGAGGAGCCATGCAACGCGTAGTGCAACTGTGGA
AGAAGGTGCATTTGAGAAGGCTGTCATAAGACAACAAATATTGCAAAATCTTGATGATTT
AGAAGACTTCTTTGAACAACAATTACCAGAAGAACCTTTCAATAAATTGATGAATTTGAA
CAAAATAGAGAGAGACTGGAATCTGATTATTATGGCCATGTGGACATGGAAAAGATCACA
GTGTTTGAGAAGTATGAAAAGAAGCTTGAAGAAATCCGTCAAATTGTTACACGTAAACAT
GTTATTCAATCATTGCCTGACAATACTGTTGTTCAAGAATTGGACAGAAACCAATCACTA
AACTTTAATGCTACTTACATGAACAACCTTACTAAGGCTGCAAAGCAAGATTTGATTGAT
GGCTTCCAAGAGTTTGTTAAACAGCTAATGGACTTCTTGCAAGAAGCTTGTTATGATTTT
ATGCAAGAGTTTGTTCAAAATAAATGTGACCTACGTAAACGTGTACTGTTTGAATACACT
CAAAATTCAAGACTTGTTGAACTCAATGATTACAAGAAGCTTGAAAAGTATAAGAAAGAA
GAAATTGCTCAAATTGCAGAGTCATTAGAAGATGAATCAGAAATGATAGAAGAATGGTTG
CAAAAAAGTCCTCTGGTTATGAACATCATGAACATCATCATCAAGAACCATGAGCAGACA
GTGCTAGATGACATCACGTTGCATTTAAATGGACATCCTCGTAGTAGTGGACTTGGTTCA
GTTTTGGAACATGGTTTAGATGGAGTCAATCGTTACTATTCTGGTATCAGACAGTATGAG
TTAATCAGTCCTTACCTAGAAAAAGGTGACATCCAAGCCATGAAGAAAGTTATTCAACTA
ATGTATGGTTTCAACACTACTGAGTTTGGTAAACCATTACCTTCTTCTCTTGTGAAACTT
GGCGAAGCTGCATTAAAAGAGAAAGATGAAACTGTTGGTTTCTTTAATAAGTTGCTTATG
CAACAACTAATGACAACAACTTTGCAAGTAGGTGAAGATGAAGACTCAAACGACTCACTG
ATCGCCATCAACAAGCAAATGACCAACCTCGCCAAGTGGAATGAGAATTTCTATTGCATA
ATACCTCAAATCAAAAACACAATTAACATTGTTGAAGGACAAGAAACACAAGTTGATCAA
ATGTCAACACGTAATGATACCAACTATAGAGTGAATTCAACAATATTTTGTGAAGCTGCA
TCTACGCTAGAAAAATGGATGAAGCCATTGAAACAACATTTGTCGATCCATGGCAGGATA
GTCAAGCTGTTGAACTTGATGAATGTGTCGATGGATATGGTGACATAGAAAAAGAAATCA
TTGCCCGCATACGTGATGGTCAAGTGGAAATACAAGAGCATCCTGAAATTATGGAACGTC
TTAAAAAGTCAGATGAGTTCATAAGTCCTATTGATAAGTATTTACAGTATAGAGATTCTA
ATGGTCTTAACATTAAGAAGACTTATGACTGCTATTTTGTCGCTAATGGGGAAGCCATCA
AAGATATGCCAATGGATCAAGACATGGCAACTGATATGGCCGCTTGGGATTTAATCGGAG
ACTATGGTAAGAACTACAAGTGTGAACTTGAACTAGAAGAATGGCATCTTTGTGCCAACC
TCTTGATGAATATTCGTATTAATCCTTCAACGAACTGGTGCCGCTGTTTGCAACAATGGT
ACATTGGTACTTGGATCACTTCAGGAATGGTCGTCTACAAGGAATTGAAGATGCTGGACA
GAGGTATGTTGTATCTGCAGCAGCATGGAATCACACTATTGACAAACAAGCTATCAATGC
AGTAAACATCATGACATTGCCTACAGAACTTCAAGGTCAAGCTATGGACACTTACTTATG
CAACAAAGCAGATAAATTGAAAGATGATCAATTCAATCAAGCATTTAACTATTTGAAAGA
TGATAAGCAACAATCTTTAGAAGAACTTCAAGAGTTGTTAAAAGAAAACTTTGAAAAGAA
GGTGACAACAGTTGACGAAATGACAAGACTCCAGTCAGTTAAAGCTTATGGATACTTGA
TGGGGCAAATTGTTATGGAACAACCACAAGACCTTCGTGAAATACTGTCAGTAAATGAA
GTAGTGGTTAAAGAACTTGATAAAGGTAAGTTTATTGAACAAGTGAAGAATTTACAAGA
CATTACCATGAAAAATGACCGTTTATGTGAAACAGTCCGCAAGATCATGAGAGAATGGTT
TGAGAAAGACCAATTCAACAGAGATGCTAATTTCAAAGAAAATATGCATTTCTATAAAG
TAGTACCAAACTTAGGTTGTGGTTGTCATAAATTACTACTCTTTGCTCCACAGAGATCAT
CTGAAGAGGCTGAAAGTCAAGATATTACTGATTTGTGTGTACTGAAGCATGGTAATTTG
CAAAATATAAAAGAGTGGTATAACAACATGAGTGGATGGGTTTATCTTACTGGCTCTACT`;

const SAMPLE_PRIMERS_CSV = `name,batch,forward_sequence,reverse_sequence,forward_tm,reverse_tm
PRIMER_001,B20240101,ATGTTTGTTTTTCTTGTTTTATTG,CAATAGAGTCACATTCAATGTG,58.2,57.8
PRIMER_002,B20240101,AACCAATCACTAAACTTTAATGCT,CACTATGATGAAGTAGCCATTGA,59.1,58.5
PRIMER_003,B20240115,GTTTGACAGACATTTCACAAGTA,GTTCAACAAGTCTTGAATTTTGTG,57.5,58.0
PRIMER_004,B20240101,TTGCAAAGTGGAATGAGAATGGT,ACCAAGAACTTTTCATACTTCTTC,58.8,59.2
PRIMER_005,B20240115,ATGCAAGAGTTTGTTCAAAATAAA,ATTCACAGTAAGTGGTTTGACCTG,56.9,57.3
PRIMER_006,B20240201,ACGTAATGATACCAACTATAGAGT,AATCAGTGATGAATCCATGGCTTT,58.0,57.6
PRIMER_007,B20240101,CATTTCTATAAAGTAGTACCAAAC,TTCAGATCATCTCTGTGGAGCAA,57.2,58.1
PRIMER_008,B20240201,TTCTACTGGCTCTACTGATTATGA,ATCCACTCANGTTATACCACTCTT,58.5,58.9
PRIMER_001,B20240201,ATGTTTGTTTTTCTTGTTTTATTG,CAATAGAGTCACATTCAATGTG,58.2,57.8
PRIMER_009,B20240101,GGTATAACAACATGAGTGGATGGG,AGTAGAGCCAGTAAGATAAACCC,59.3,58.7
PRIMER_010,B20240101,TTGAGAAAGACCAATTCAACAGA,ATGGATTTCAATAAATACACAAAG,95.5,96.1
PRIMER_011,B20240201,CAAATGCAGATCAAGAAGTTTTA,TAAAACTTCTTGATCTGCATTTG,58.0,58.0`;

const SAMPLE_MUTATIONS_CSV = `sample_name,position,ref_base,alt_base,quality,allele_frequency
SAMPLE_A,125,T,C,352.5,0.85
SAMPLE_A,287,G,A,298.3,0.92
SAMPLE_A,543,C,T,410.8,0.78
SAMPLE_B,125,T,C,378.2,0.45
SAMPLE_B,456,A,G,267.5,0.63
SAMPLE_B,879,T,A,389.1,0.99
SAMPLE_B,1245,G,T,321.7,0.58
SAMPLE_C,287,G,A,345.6,0.88
SAMPLE_C,678,C,G,256.9,0.35
SAMPLE_C,1024,A,T,401.2,0.76
SAMPLE_C,1567,T,G,334.8,0.91
SAMPLE_C,2345,G,A,287.4,0.52
SAMPLE_D,543,C,T,367.1,0.81
SAMPLE_D,1890,A,C,299.7,0.67`;

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  reference: null,
  primerPairs: [],
  mutations: [],
  analysisResult: null,
  config: DEFAULT_CONFIG,
  loading: false,
  error: null,
  importWarnings: [],

  setReference: (reference) => set({ reference, analysisResult: null }),

  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
      analysisResult: null,
    })),

  addPrimerPair: (pair) =>
    set((state) => {
      const exists = state.primerPairs.some((p) => p.importHash === pair.importHash);
      if (exists) {
        return {
          importWarnings: [
            ...state.importWarnings,
            `Skipped duplicate primer pair: ${pair.name}`,
          ],
        };
      }
      return {
        primerPairs: [...state.primerPairs, pair],
        analysisResult: null,
      };
    }),

  addPrimerPairs: (pairs) =>
    set((state) => {
      const dedupResult = deduplicatePrimerPairs(pairs);
      const newWarnings = dedupResult.duplicatesRemoved > 0
        ? [...state.importWarnings, `Removed ${dedupResult.duplicatesRemoved} duplicate primer pair(s) during import`]
        : state.importWarnings;

      const existingHashes = new Set(state.primerPairs.map((p) => p.importHash));
      const uniqueNewPairs = dedupResult.uniqueItems.filter(
        (p) => !existingHashes.has(p.importHash)
      );

      if (uniqueNewPairs.length < dedupResult.uniqueItems.length) {
        newWarnings.push(
          `Skipped ${dedupResult.uniqueItems.length - uniqueNewPairs.length} primer pair(s) already in the workspace`
        );
      }

      return {
        primerPairs: [...state.primerPairs, ...uniqueNewPairs],
        importWarnings: newWarnings,
        analysisResult: null,
      };
    }),

  addMutation: (mutation) =>
    set((state) => ({
      mutations: [...state.mutations, mutation],
      analysisResult: null,
    })),

  addMutations: (mutations) =>
    set((state) => ({
      mutations: [...state.mutations, ...mutations],
      analysisResult: null,
    })),

  removePrimerPair: (id) =>
    set((state) => ({
      primerPairs: state.primerPairs.filter((p) => p.id !== id),
      analysisResult: null,
    })),

  removeMutation: (id) =>
    set((state) => ({
      mutations: state.mutations.filter((m) => m.id !== id),
      analysisResult: null,
    })),

  runAnalysis: () => {
    const { reference, primerPairs, mutations, config } = get();
    if (!reference) {
      set({ error: 'Reference sequence is required for analysis' });
      return;
    }
    if (primerPairs.length === 0) {
      set({ error: 'At least one primer pair is required for analysis' });
      return;
    }
    set({ loading: true, error: null });
    try {
      const result = buildAnalysisResult(reference, primerPairs, mutations, config);
      set({ analysisResult: result, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Analysis failed',
        loading: false,
      });
    }
  },

  clearData: () =>
    set({
      reference: null,
      primerPairs: [],
      mutations: [],
      analysisResult: null,
      error: null,
      importWarnings: [],
    }),

  loadSampleData: async () => {
    set({ loading: true, error: null, importWarnings: [] });
    try {
      const fastaResult = parseFastaSync(SAMPLE_REFERENCE_FASTA);
      const refRecord = fastaResult.records[0];
      const reference: ReferenceSequence = {
        id: refRecord.id,
        name: refRecord.description || refRecord.id,
        sequence: refRecord.sequence,
        length: refRecord.length,
        gcContent: refRecord.gcContent,
      };

      const primersResult = parsePrimersCsvSync(SAMPLE_PRIMERS_CSV);
      const primerPairs: PrimerPair[] = primersResult.records.map((record) =>
        createPrimerPair(
          record.name,
          record.forwardSequence,
          record.reverseSequence,
          reference,
          get().config,
          record.batch
        )
      );

      const mutationsResult = parseMutationsCsvSync(SAMPLE_MUTATIONS_CSV);
      const mutations: Mutation[] = mutationsResult.records.map((record, idx) => ({
        id: generateUniqueId('m'),
        sampleId: `sample_${idx}_${record.sampleName.toLowerCase()}`,
        sampleName: record.sampleName,
        position: record.position,
        refBase: record.refBase,
        altBase: record.altBase,
        quality: record.quality,
        alleleFrequency: record.alleleFrequency,
      }));

      const warnings: string[] = [];
      if (primersResult.warnings.length > 0) {
        warnings.push(...primersResult.warnings.slice(0, 10));
      }
      if (mutationsResult.warnings.length > 0) {
        warnings.push(...mutationsResult.warnings.slice(0, 10));
      }

      const dedupResult = deduplicatePrimerPairs(primerPairs);
      if (dedupResult.duplicatesRemoved > 0) {
        warnings.push(`Removed ${dedupResult.duplicatesRemoved} duplicate primer pair(s) from sample data`);
      }

      set({
        reference,
        primerPairs: dedupResult.uniqueItems,
        mutations,
        importWarnings: warnings,
        loading: false,
      });

      get().runAnalysis();
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load sample data',
        loading: false,
      });
    }
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setImportWarnings: (importWarnings) => set({ importWarnings }),
}));
