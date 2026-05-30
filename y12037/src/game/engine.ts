import { ProblemSpot, ProblemType, ToolType, ActionRecord, ErrorType, Severity } from '@/types/game';
import { errorExplanations, getSuccessMessage, getWrongToolExplanation } from './explanations';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const toolProblemMapping: Record<ToolType, ProblemType> = {
  removeNoise: 'noise',
  fixPop: 'pop',
  calibrateBeat: 'drift',
};

const scoreConfig = {
  correct: 10,
  comboBonus: 5,
  wrongTool: -10,
  missedOriginal: -20,
  beatDrift: -15,
  noProblem: -5,
};

export const generateProblemSpots = (): ProblemSpot[] => {
  const problems: ProblemSpot[] = [];
  const problemTypes: ProblemType[] = ['noise', 'pop', 'drift'];
  const severities: Severity[] = ['low', 'medium', 'high'];
  const tracks = [1, 2, 3, 4];

  const usedPositions: Set<string> = new Set();

  for (let i = 0; i < 12; i++) {
    let position: number;
    let track: number;
    let key: string;

    do {
      position = Math.floor(Math.random() * 80) + 10;
      track = tracks[Math.floor(Math.random() * tracks.length)];
      key = `${track}-${position}`;
    } while (usedPositions.has(key));

    usedPositions.add(key);

    const type = problemTypes[Math.floor(Math.random() * problemTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];

    const explanations: Record<ProblemType, string> = {
      noise: `这是一个${severity === 'low' ? '轻微' : severity === 'medium' ? '中等' : '严重'}的噪声点，由唱片表面的灰尘或磨损造成。`,
      pop: `这是一个${severity === 'low' ? '轻微' : severity === 'medium' ? '中等' : '严重'}的爆音点，由唱片划痕造成的瞬间尖锐声音。`,
      drift: `这是一个节拍偏移点，节奏与标准节拍线相差${severity === 'low' ? '10' : severity === 'medium' ? '20' : '30'}毫秒。`,
    };

    problems.push({
      id: generateId(),
      type,
      position,
      track,
      severity,
      isFixed: false,
      explanation: explanations[type],
    });
  }

  return problems.sort((a, b) => a.position - b.position);
};

export const checkClickPosition = (
  clickPosition: number,
  clickTrack: number,
  problemSpots: ProblemSpot[]
): ProblemSpot | null => {
  const tolerance = 5;

  for (const spot of problemSpots) {
    if (spot.isFixed) continue;
    if (spot.track !== clickTrack) continue;
    if (Math.abs(spot.position - clickPosition) <= tolerance) {
      return spot;
    }
  }

  return null;
};

export const checkBeatTiming = (
  beatPosition: number,
  driftSpot: ProblemSpot
): { isCorrect: boolean; drift: number } => {
  const tolerance = 8;
  const drift = Math.abs(driftSpot.position - beatPosition);
  return {
    isCorrect: drift <= tolerance,
    drift,
  };
};

export const processAction = (
  tool: ToolType,
  clickPosition: number,
  clickTrack: number,
  beatPosition: number,
  problemSpots: ProblemSpot[],
  combo: number
): {
  record: ActionRecord;
  updatedSpots: ProblemSpot[];
  newCombo: number;
  feedback: { type: 'success' | 'error'; message: string; errorType?: ErrorType };
} => {
  const targetSpot = checkClickPosition(clickPosition, clickTrack, problemSpots);
  const timestamp = Date.now();

  if (!targetSpot) {
    const isOriginalArea = !problemSpots.some(
      (s) => s.track === clickTrack && Math.abs(s.position - clickPosition) <= 15
    );

    const errorType: ErrorType = isOriginalArea ? 'missedOriginal' : 'noProblem';
    const errorInfo = errorExplanations[errorType];
    const scoreChange = errorType === 'missedOriginal' ? scoreConfig.missedOriginal : scoreConfig.noProblem;

    return {
      record: {
        id: generateId(),
        timestamp,
        toolUsed: tool,
        isCorrect: false,
        scoreChange,
        errorType,
        errorExplanation: errorInfo.message,
      },
      updatedSpots: problemSpots,
      newCombo: 0,
      feedback: {
        type: 'error',
        message: errorInfo.title + ' - ' + errorInfo.message,
        errorType,
      },
    };
  }

  const expectedProblem = toolProblemMapping[tool];

  if (tool === 'calibrateBeat') {
    const timing = checkBeatTiming(beatPosition, targetSpot);

    if (!timing.isCorrect) {
      const errorInfo = errorExplanations.beatDrift;
      return {
        record: {
          id: generateId(),
          timestamp,
          toolUsed: tool,
          targetSpotId: targetSpot.id,
          isCorrect: false,
          scoreChange: scoreConfig.beatDrift,
          errorType: 'beatDrift',
          errorExplanation: `${errorInfo.message} 漂移了${timing.drift * 10}毫秒。`,
        },
        updatedSpots: problemSpots,
        newCombo: 0,
        feedback: {
          type: 'error',
          message: `${errorInfo.title} - 漂移了${timing.drift * 10}毫秒`,
          errorType: 'beatDrift',
        },
      };
    }
  }

  if (targetSpot.type !== expectedProblem) {
    const errorInfo = errorExplanations.wrongTool;
    return {
      record: {
        id: generateId(),
        timestamp,
        toolUsed: tool,
        targetSpotId: targetSpot.id,
        isCorrect: false,
        scoreChange: scoreConfig.wrongTool,
        errorType: 'wrongTool',
        errorExplanation: getWrongToolExplanation(tool, targetSpot.type),
      },
      updatedSpots: problemSpots,
      newCombo: 0,
      feedback: {
        type: 'error',
        message: errorInfo.title + ' - ' + getWrongToolExplanation(tool, targetSpot.type),
        errorType: 'wrongTool',
      },
    };
  }

  const updatedSpots = problemSpots.map((s) =>
    s.id === targetSpot.id ? { ...s, isFixed: true } : s
  );

  const newCombo = combo + 1;
  const comboBonus = newCombo >= 3 ? scoreConfig.comboBonus : 0;
  const scoreChange = scoreConfig.correct + comboBonus;

  return {
    record: {
      id: generateId(),
      timestamp,
      toolUsed: tool,
      targetSpotId: targetSpot.id,
      isCorrect: true,
      scoreChange,
    },
    updatedSpots,
    newCombo,
    feedback: {
      type: 'success',
      message: getSuccessMessage(targetSpot.type) + (comboBonus > 0 ? ` 连击奖励+${comboBonus}！` : ''),
    },
  };
};

export const calculateMaxScore = (spotCount: number): number => {
  return spotCount * scoreConfig.correct + Math.floor(spotCount / 3) * scoreConfig.comboBonus;
};

export const calculateFinalStats = (actionHistory: ActionRecord[]) => {
  const correctCount = actionHistory.filter((a) => a.isCorrect).length;
  const wrongCount = actionHistory.filter((a) => !a.isCorrect).length;

  const errorBreakdown = {
    wrongTool: actionHistory.filter((a) => a.errorType === 'wrongTool').length,
    missedOriginal: actionHistory.filter((a) => a.errorType === 'missedOriginal').length,
    beatDrift: actionHistory.filter((a) => a.errorType === 'beatDrift').length,
    noProblem: actionHistory.filter((a) => a.errorType === 'noProblem').length,
  };

  const accuracy = actionHistory.length > 0 ? Math.round((correctCount / actionHistory.length) * 100) : 0;

  return {
    correctCount,
    wrongCount,
    errorBreakdown,
    accuracy,
    totalActions: actionHistory.length,
  };
};
