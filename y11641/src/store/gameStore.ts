import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  GameState, 
  GameSession, 
  PlayerAction, 
  ErrorType,
  CorrectionTrail,
  ScoreItem,
  ErrorSummaryItem,
  GameReport
} from '../types';
import { levels, getLevelById } from '../data/levels';

const initialUnlockedLevels = ['level-1', 'level-2'];

export const useGameStore = create<GameState & {
  startGame: (levelId: string) => string;
  selectDrug: (drugId: string) => void;
  confirmUnit: (unit: string) => void;
  checkContraindication: (drugId: string, contraIndex: number, hasContraindication: boolean) => void;
  selectBatch: (batchId: string) => void;
  completeStep: () => void;
  endGame: (status: 'completed' | 'timeout') => void;
  getReport: (sessionId: string) => GameReport | null;
  getHistory: () => void;
  getCurrentStepInfo: () => { prescription: any; level: any } | null;
}>()(
  persist(
    (set, get) => ({
      currentSession: null,
      history: [],
      levels: levels,
      unlockedLevels: initialUnlockedLevels,
      highScores: {},

      startGame: (levelId: string) => {
        const level = getLevelById(levelId);
        if (!level) return '';

        const sessionId = `session-${Date.now()}`;
        const session: GameSession = {
          id: sessionId,
          levelId,
          startTime: Date.now(),
          actions: [],
          totalScore: 0,
          maxScore: level.prescriptions.length * 50,
          errors: [],
          status: 'playing',
          currentStep: 0,
          checkedContraindications: []
        };

        set({ currentSession: session });
        return sessionId;
      },

      selectDrug: (drugId: string) => {
        const state = get();
        const session = state.currentSession;
        if (!session || session.status !== 'playing') return;

        const level = getLevelById(session.levelId);
        if (!level) return;

        const currentPrescription = level.prescriptions[session.currentStep];
        const drug = level.availableDrugs.find(d => d.id === drugId);
        
        if (!drug || !currentPrescription) return;

        const isCorrectDrug = drug.code === currentPrescription.drugCode;
        const hasContraindication = drug.contraindications.some(c => 
          level.patientInfo.allergies.some(a => c.includes(a)) ||
          level.patientInfo.conditions.some(con => c.includes(con))
        );

        const existingAction = session.actions.find(
          a => a.step === session.currentStep && a.type === 'drug_select'
        );

        const action: PlayerAction = {
          step: session.currentStep,
          timestamp: Date.now(),
          type: 'drug_select',
          selectedId: drugId,
          isCorrect: isCorrectDrug && !hasContraindication,
          correctionMade: !!existingAction,
          originalSelection: existingAction?.selectedId,
          pointsDelta: isCorrectDrug && !hasContraindication ? 10 : -15,
          errorType: !isCorrectDrug ? 'WRONG_DRUG' : hasContraindication ? 'CONTRAINDICATION' : undefined,
          errorDetail: !isCorrectDrug 
            ? `选择的药品"${drug.name}"与处方第${currentPrescription.lineNumber}行"${currentPrescription.drugName}"不匹配`
            : hasContraindication
            ? `药品"${drug.name}"与患者${drug.contraindications.find(c => 
                level.patientInfo.allergies.some(a => c.includes(a)) ||
                level.patientInfo.conditions.some(con => c.includes(con))
              )}存在禁忌`
            : undefined,
          sourceLine: currentPrescription.lineNumber
        };

        const newActions = existingAction
          ? session.actions.map(a => 
              a.step === session.currentStep && a.type === 'drug_select' ? action : a
            )
          : [...session.actions, action];

        const newScore = session.totalScore + action.pointsDelta;

        set({
          currentSession: {
            ...session,
            actions: newActions,
            totalScore: newScore,
            errors: !action.isCorrect ? [...session.errors, action] : session.errors,
            selectedDrugId: drugId
          }
        });
      },

      confirmUnit: (unit: string) => {
        const state = get();
        const session = state.currentSession;
        if (!session || session.status !== 'playing') return;

        const level = getLevelById(session.levelId);
        if (!level) return;

        const currentPrescription = level.prescriptions[session.currentStep];
        if (!currentPrescription) return;

        const isCorrect = unit === currentPrescription.dosageUnit;
        const pointsDelta = isCorrect ? 5 : -10;

        const action: PlayerAction = {
          step: session.currentStep,
          timestamp: Date.now(),
          type: 'unit_confirm',
          selectedId: unit,
          isCorrect,
          correctionMade: session.actions.some(a => a.step === session.currentStep && a.type === 'unit_confirm'),
          pointsDelta,
          errorType: isCorrect ? undefined : 'UNIT_MISMATCH',
          errorDetail: isCorrect ? undefined : `剂量单位"${unit}"与处方第${currentPrescription.lineNumber}行"${currentPrescription.dosageUnit}"不符`,
          sourceLine: currentPrescription.lineNumber
        };

        const existingAction = session.actions.find(
          a => a.step === session.currentStep && a.type === 'unit_confirm'
        );

        const newActions = existingAction
          ? session.actions.map(a => 
              a.step === session.currentStep && a.type === 'unit_confirm' ? action : a
            )
          : [...session.actions, action];

        set({
          currentSession: {
            ...session,
            actions: newActions,
            totalScore: session.totalScore + pointsDelta,
            errors: !isCorrect ? [...session.errors, action] : session.errors,
            confirmedUnit: unit
          }
        });
      },

      checkContraindication: (drugId: string, contraIndex: number, hasContraindication: boolean) => {
        const state = get();
        const session = state.currentSession;
        if (!session || session.status !== 'playing') return;

        const level = getLevelById(session.levelId);
        if (!level) return;

        const drug = level.availableDrugs.find(d => d.id === drugId);
        if (!drug) return;

        const contraText = drug.contraindications[contraIndex] || '';
        const actualContraindication = 
          level.patientInfo.allergies.some(a => contraText.includes(a)) ||
          level.patientInfo.conditions.some(con => contraText.includes(con));

        const isCorrect = hasContraindication === actualContraindication;
        const pointsDelta = hasContraindication && isCorrect ? 15 : !isCorrect ? -20 : 0;

        const action: PlayerAction = {
          step: session.currentStep,
          timestamp: Date.now(),
          type: 'contra_check',
          selectedId: `${drugId}-${contraIndex}-${hasContraindication}`,
          isCorrect,
          correctionMade: session.actions.some(a => a.step === session.currentStep && a.type === 'contra_check'),
          pointsDelta,
          errorType: !isCorrect ? 'CONTRAINDICATION' : undefined,
          errorDetail: !isCorrect 
            ? hasContraindication
              ? `误判药品"${drug.name}"的第${contraIndex + 1}条禁忌存在，实际无相关禁忌`
              : `未识别药品"${drug.name}"的禁忌：${contraText}`
            : undefined,
          sourceLine: level.prescriptions[session.currentStep]?.lineNumber
        };

        const existingAction = session.actions.find(
          a => a.step === session.currentStep && a.type === 'contra_check'
        );

        const newActions = existingAction
          ? session.actions.map(a => 
              a.step === session.currentStep && a.type === 'contra_check' ? action : a
            )
          : [...session.actions, action];

        set({
          currentSession: {
            ...session,
            actions: newActions,
            totalScore: session.totalScore + pointsDelta,
            errors: !isCorrect ? [...session.errors, action] : session.errors,
            checkedContraindications: hasContraindication 
              ? [...session.checkedContraindications, drugId] 
              : session.checkedContraindications
          }
        });
      },

      selectBatch: (batchId: string) => {
        const state = get();
        const session = state.currentSession;
        if (!session || session.status !== 'playing') return;

        const level = getLevelById(session.levelId);
        if (!level) return;

        const drug = level.availableDrugs.find(d => d.id === session.selectedDrugId);
        if (!drug) return;

        const batch = drug.batchNumbers.find(b => b.id === batchId);
        if (!batch) return;

        const isExpired = batch.isExpired;
        const pointsDelta = !isExpired ? 10 : -15;

        const action: PlayerAction = {
          step: session.currentStep,
          timestamp: Date.now(),
          type: 'batch_confirm',
          selectedId: batchId,
          isCorrect: !isExpired,
          correctionMade: session.actions.some(a => a.step === session.currentStep && a.type === 'batch_confirm'),
          pointsDelta,
          errorType: isExpired ? 'BATCH_EXPIRED' : undefined,
          errorDetail: isExpired 
            ? `批号"${batch.number}"已过期（有效期至${batch.expiryDate}）`
            : undefined,
          sourceLine: level.prescriptions[session.currentStep]?.lineNumber
        };

        const existingAction = session.actions.find(
          a => a.step === session.currentStep && a.type === 'batch_confirm'
        );

        const newActions = existingAction
          ? session.actions.map(a => 
              a.step === session.currentStep && a.type === 'batch_confirm' ? action : a
            )
          : [...session.actions, action];

        set({
          currentSession: {
            ...session,
            actions: newActions,
            totalScore: session.totalScore + pointsDelta,
            errors: isExpired ? [...session.errors, action] : session.errors,
            selectedBatchId: batchId
          }
        });
      },

      completeStep: () => {
        const state = get();
        const session = state.currentSession;
        if (!session || session.status !== 'playing') return;

        const level = getLevelById(session.levelId);
        if (!level) return;

        const nextStep = session.currentStep + 1;
        
        if (nextStep >= level.prescriptions.length) {
          get().endGame('completed');
        } else {
          set({
            currentSession: {
              ...session,
              currentStep: nextStep,
              selectedDrugId: undefined,
              confirmedUnit: undefined,
              checkedContraindications: [],
              selectedBatchId: undefined
            }
          });
        }
      },

      endGame: (status: 'completed' | 'timeout') => {
        const state = get();
        const session = state.currentSession;
        if (!session) return;

        const level = getLevelById(session.levelId);
        if (!level) return;

        const endedSession: GameSession = {
          ...session,
          endTime: Date.now(),
          status
        };

        const historyRecord = {
          id: session.id,
          levelId: session.levelId,
          levelName: level.name,
          startTime: session.startTime,
          endTime: Date.now(),
          totalScore: session.totalScore,
          maxScore: session.maxScore,
          errorCount: session.errors.length,
          status,
          actions: session.actions,
          errors: session.errors
        };

        const newHighScores = { ...state.highScores };
        if (!newHighScores[session.levelId] || session.totalScore > newHighScores[session.levelId]) {
          newHighScores[session.levelId] = session.totalScore;
        }

        const currentDifficulty = level.difficulty;
        const nextLevel = levels.find(l => l.difficulty === currentDifficulty + 1);
        const newUnlockedLevels = nextLevel 
          ? [...new Set([...state.unlockedLevels, nextLevel.id])]
          : state.unlockedLevels;

        set({
          currentSession: endedSession,
          history: [historyRecord, ...state.history].slice(0, 50),
          highScores: newHighScores,
          unlockedLevels: newUnlockedLevels
        });
      },

      getReport: (sessionId: string) => {
        const state = get();
        let session: GameSession | null = state.currentSession;
        
        if (!session || session.id !== sessionId) {
          const historySession = state.history.find(h => h.id === sessionId);
          session = historySession ? (historySession as unknown as GameSession) : null;
        }
        
        if (!session) return null;

        const level = getLevelById(session.levelId);
        if (!level) return null;

        const scoreBreakdown: ScoreItem[] = level.prescriptions.map((prescription, index) => {
          const stepActions = session?.actions.filter(a => a.step === index) || [];
          const basePoints = 50;
          const deductions = stepActions
            .filter(a => a.pointsDelta < 0)
            .reduce((sum, a) => sum + Math.abs(a.pointsDelta), 0);
          
          return {
            step: index + 1,
            description: `核对${prescription.drugName}（处方第${prescription.lineNumber}行）`,
            basePoints,
            deductions,
            netPoints: basePoints - deductions,
            sourceLine: prescription.lineNumber
          };
        });

        const errorTypeMap: Record<ErrorType, string> = {
          WRONG_DRUG: '药品选择错误',
          UNIT_MISMATCH: '剂量单位错误',
          CONTRAINDICATION: '禁忌识别错误',
          BATCH_EXPIRED: '批号已过期',
          BATCH_WRONG: '批号选择错误',
          CALCULATION_ERROR: '剂量计算错误'
        };

        const errorSummary: ErrorSummaryItem[] = [];
        const errorsByType = new Map<ErrorType, ErrorSummaryItem>();

        (session?.errors || []).forEach(error => {
          if (!error.errorType) return;
          
          if (!errorsByType.has(error.errorType)) {
            errorsByType.set(error.errorType, {
              errorType: error.errorType,
              count: 0,
              instances: []
            });
          }
          
          const summary = errorsByType.get(error.errorType)!;
          summary.count++;
          summary.instances.push({
            step: error.step + 1,
            sourceLine: error.sourceLine || 0,
            detail: error.errorDetail || '',
            correction: ''
          });
        });

        errorsByType.forEach(summary => errorSummary.push(summary));

        const correctionTrail: CorrectionTrail[] = (session?.actions || [])
          .filter(a => a.correctionMade && a.originalSelection)
          .map(a => ({
            step: a.step + 1,
            sourceLine: a.sourceLine || 0,
            originalValue: a.originalSelection || '',
            correctedValue: a.selectedId,
            reason: a.errorDetail || '',
            timestamp: a.timestamp
          }));

        return {
          session: session,
          scoreBreakdown,
          errorSummary,
          correctionTrail
        };
      },

      getHistory: () => {
        return get().history;
      },

      getCurrentStepInfo: () => {
        const state = get();
        const session = state.currentSession;
        if (!session) return null;

        const level = getLevelById(session.levelId);
        if (!level) return null;

        return {
          prescription: level.prescriptions[session.currentStep],
          level
        };
      }
    }),
    {
      name: 'pharmacy-game-storage',
      partialize: (state) => ({
        history: state.history,
        unlockedLevels: state.unlockedLevels,
        highScores: state.highScores
      })
    }
  )
);
