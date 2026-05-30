import { ErrorRecord, ErrorType, JudgmentResult } from '../types';

interface ErrorSuggestion {
  description: string;
  suggestions: string[];
}

const ERROR_MESSAGES: Record<ErrorType, ErrorSuggestion> = {
  syncopation_miss: {
    description: '切分音节奏偏差较大',
    suggestions: [
      '提前半拍做好准备，注意力集中在反拍上',
      '使用节拍器单独练习切分节奏型',
      '大声数拍，强调"空哒"中的"哒"',
      '把手放在腿上打拍子，感受切分的律动'
    ]
  },
  speed_change: {
    description: '演奏速度出现明显变化',
    suggestions: [
      '保持稳定的身体律动（脚打拍、点头等）',
      '使用节拍器跟练，从慢速开始',
      '每组练习前先打4拍预备拍',
      '注意不要越打越快，保持匀速'
    ]
  },
  combo_break: {
    description: '连击中断，可能是紧张导致',
    suggestions: [
      '注意不要抢拍，保持平稳',
      '保持放松，肩膀和手臂不要紧张',
      '每组连击后做一次深呼吸',
      '眼睛看前方2-3个音符，不要只看当前'
    ]
  },
  wrong_track: {
    description: '选择了错误的轨道',
    suggestions: [
      '提前观察火车颜色，对应正确轨道',
      '眼睛看前方2-3个音符，预判调度',
      '手指预先放在对应键位上',
      '慢速练习，先确保准确再追求速度'
    ]
  },
  data_anomaly: {
    description: '遇到数据异常（缺失字段/延迟到达）',
    suggestions: [
      '保持冷静，不要慌乱',
      '按照原节奏继续演奏',
      '结束后查看备注说明',
      '可以调整灵敏度设置以适应'
    ]
  }
};

export function createErrorRecord(
  type: ErrorType,
  time: number,
  noteId?: string,
  customDescription?: string
): ErrorRecord {
  const message = ERROR_MESSAGES[type];
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    time,
    description: customDescription || message.description,
    suggestion: message.suggestions.join('\n'),
    noteId
  };
}

export function detectSyncopationMiss(
  judgment: JudgmentResult
): ErrorRecord | null {
  if (judgment.isSyncopated && 
      (judgment.judgment === 'miss' || 
       judgment.judgment === 'early' || 
       judgment.judgment === 'late' ||
       Math.abs(judgment.timingError) > 100)) {
    return createErrorRecord(
      'syncopation_miss',
      judgment.hitTime,
      judgment.noteId,
      `切分音${judgment.judgment === 'early' ? '抢拍' : '漏拍/慢拍'}，偏差${Math.abs(judgment.timingError)}ms`
    );
  }
  return null;
}

export function detectSpeedChange(
  recentJudgments: JudgmentResult[]
): ErrorRecord | null {
  if (recentJudgments.length < 3) return null;
  
  const errors = recentJudgments.map(j => j.timingError);
  
  const allSameDirection = errors.every(e => e > 0) || errors.every(e => e < 0);
  if (!allSameDirection) return null;
  
  const increasingMagnitude = errors.every((e, i) => 
    i === 0 || Math.abs(e) >= Math.abs(errors[i - 1])
  );
  
  if (increasingMagnitude && Math.abs(errors[errors.length - 1]) > 80) {
    const direction = errors[0] > 0 ? '越来越慢' : '越来越快';
    return createErrorRecord(
      'speed_change',
      recentJudgments[recentJudgments.length - 1].hitTime,
      undefined,
      `速度${direction}，连续3拍偏差逐渐增大`
    );
  }
  
  return null;
}

export function detectComboBreak(
  combo: number,
  judgment: JudgmentResult
): ErrorRecord | null {
  if (combo > 5 && 
      judgment.judgment !== 'perfect' && 
      judgment.judgment !== 'great' &&
      Math.abs(judgment.timingError) < 50) {
    return createErrorRecord(
      'combo_break',
      judgment.hitTime,
      judgment.noteId,
      `连击${combo}后失误，可能是紧张导致`
    );
  }
  return null;
}

export function detectWrongTrack(
  judgment: JudgmentResult
): ErrorRecord | null {
  if (judgment.selectedTrack !== undefined && 
      judgment.selectedTrack !== judgment.correctTrack) {
    return createErrorRecord(
      'wrong_track',
      judgment.hitTime,
      judgment.noteId,
      `调度错误：应选轨道${judgment.correctTrack}，实际选了${judgment.selectedTrack}`
    );
  }
  return null;
}

export function getErrorLabel(type: ErrorType): string {
  const labels: Record<ErrorType, string> = {
    syncopation_miss: '切分音漏拍',
    speed_change: '速度突变',
    combo_break: '连击误判',
    wrong_track: '调度错误',
    data_anomaly: '数据异常'
  };
  return labels[type];
}

export function getErrorColor(type: ErrorType): string {
  const colors: Record<ErrorType, string> = {
    syncopation_miss: '#ecc94b',
    speed_change: '#ed8936',
    combo_break: '#f56565',
    wrong_track: '#9f7aea',
    data_anomaly: '#718096'
  };
  return colors[type];
}
