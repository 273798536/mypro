import { create } from 'zustand';
import {
  GameState,
  Card,
  RiskLabel,
  Anomaly,
  OperationLog,
  GameRecord,
  ScoringResult,
} from '@/types';
import { LEVELS } from '@/config/levels';
import { generateLevelData } from '@/utils/dataGenerator';
import { detectAllAnomalies, validateAnomalyDetection } from '@/utils/anomalyDetector';
import { calculateScore } from '@/utils/scoringEngine';
import { saveGameRecord } from '@/utils/storage';

interface GameStore extends GameState {
  scoringResult: ScoringResult | null;
  startGame: (levelId: string) => void;
  selectCard: (cardId: string) => void;
  deselectCard: (cardId: string) => void;
  toggleRiskLabel: (labelId: string) => void;
  updateTime: (timeLeft: number) => void;
  submitAudit: () => void;
  endGame: () => void;
  resetGame: () => void;
}

const initialState: GameState = {
  gameId: '',
  levelId: '',
  timeLeft: 0,
  phase: 'idle',
  cards: [],
  selectedCardIds: [],
  riskLabels: [],
  score: 0,
  anomalies: [],
  operationLog: [],
  startedAt: 0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  scoringResult: null,

  startGame: (levelId: string) => {
    const levelConfig = LEVELS.find(l => l.id === levelId);
    if (!levelConfig) return;

    const gameData = generateLevelData(levelConfig);
    const gameId = `game-${Date.now()}`;

    set({
      gameId,
      levelId,
      timeLeft: levelConfig.timeLimit,
      phase: 'playing',
      cards: gameData.cards,
      selectedCardIds: [],
      riskLabels: gameData.riskLabels,
      score: 0,
      anomalies: gameData.anomalies,
      operationLog: [],
      startedAt: Date.now(),
      scoringResult: null,
    });
  },

  selectCard: (cardId: string) => {
    const { selectedCardIds, operationLog, cards } = get();
    if (selectedCardIds.includes(cardId)) return;

    const card = cards.find(c => c.id === cardId);

    set({
      selectedCardIds: [...selectedCardIds, cardId],
      cards: cards.map(c => (c.id === cardId ? { ...c, isSelected: true } : c)),
      operationLog: [
        ...operationLog,
        {
          timestamp: Date.now(),
          action: 'select',
          cardId,
          details: `选中卡牌: ${card?.type === 'invoice' ? '发票' : card?.type === 'customer' ? '客户' : '付款'}`,
        },
      ],
    });
  },

  deselectCard: (cardId: string) => {
    const { selectedCardIds, operationLog, cards } = get();
    if (!selectedCardIds.includes(cardId)) return;

    const card = cards.find(c => c.id === cardId);

    set({
      selectedCardIds: selectedCardIds.filter(id => id !== cardId),
      cards: cards.map(c => (c.id === cardId ? { ...c, isSelected: false, status: 'unknown' } : c)),
      operationLog: [
        ...operationLog,
        {
          timestamp: Date.now(),
          action: 'deselect',
          cardId,
          details: `取消选中卡牌: ${card?.type === 'invoice' ? '发票' : card?.type === 'customer' ? '客户' : '付款'}`,
        },
      ],
    });
  },

  toggleRiskLabel: (labelId: string) => {
    const { riskLabels, operationLog } = get();
    const label = riskLabels.find(l => l.id === labelId);
    if (!label) return;

    const newIsChecked = !label.isChecked;

    set({
      riskLabels: riskLabels.map(l => (l.id === labelId ? { ...l, isChecked: newIsChecked } : l)),
      operationLog: [
        ...operationLog,
        {
          timestamp: Date.now(),
          action: newIsChecked ? 'check_label' : 'uncheck_label',
          labelId,
          details: `${newIsChecked ? '勾选' : '取消勾选'}风险标签: ${label.name}`,
        },
      ],
    });
  },

  updateTime: (timeLeft: number) => {
    set({ timeLeft });
  },

  submitAudit: () => {
    const {
      cards,
      selectedCardIds,
      anomalies: actualAnomalies,
      operationLog,
      levelId,
      gameId,
      startedAt,
      timeLeft,
    } = get();

    const levelConfig = LEVELS.find(l => l.id === levelId);
    if (!levelConfig) return;

    const detectedAnomalies = detectAllAnomalies(cards, selectedCardIds);
    const { correctDetections, wrongMarks, missedAnomalies } = validateAnomalyDetection(
      detectedAnomalies,
      actualAnomalies
    );

    const usedTime = levelConfig.timeLimit - timeLeft;
    const scoringResult = calculateScore(
      correctDetections,
      wrongMarks,
      actualAnomalies.length,
      timeLeft,
      usedTime
    );

    const allAnomalies = [
      ...correctDetections.map(a => ({ ...a, isDetected: true, isWronglyMarked: false })),
      ...wrongMarks.map(a => ({ ...a, isDetected: false, isWronglyMarked: true })),
      ...missedAnomalies.map(a => ({ ...a, isDetected: false, isWronglyMarked: false })),
    ];

    const updatedCards = cards.map(card => {
      const hasAnomaly = allAnomalies.some(a => a.cardIds.includes(card.id));
      const isCorrect = correctDetections.some(a => a.cardIds.includes(card.id));
      const isWrong = wrongMarks.some(a => a.cardIds.includes(card.id));

      let status: Card['status'] = 'unknown';
      if (isCorrect) status = 'danger';
      else if (isWrong) status = 'warning';
      else if (!hasAnomaly && selectedCardIds.includes(card.id)) status = 'normal';

      return { ...card, status };
    });

    const record: GameRecord = {
      id: gameId,
      levelId,
      levelName: levelConfig.name,
      score: scoringResult.totalScore,
      grade: scoringResult.grade,
      completedAt: Date.now(),
      totalAnomalies: actualAnomalies.length,
      detectedAnomalies: correctDetections.length,
      wrongMarks: wrongMarks.length,
      operationLog: [
        ...operationLog,
        {
          timestamp: Date.now(),
          action: 'submit',
          details: `提交稽核，得分: ${scoringResult.totalScore}，评级: ${scoringResult.grade}`,
        },
      ],
      anomalies: allAnomalies,
      cards: updatedCards,
    };

    saveGameRecord(record);

    set({
      phase: 'submitted',
      cards: updatedCards,
      anomalies: allAnomalies,
      operationLog: record.operationLog,
      scoringResult,
    });
  },

  endGame: () => {
    set({ phase: 'ended' });
  },

  resetGame: () => {
    set(initialState);
  },
}));
