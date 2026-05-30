import { ReportCard, QuadraticParams, CollisionRecord, HistoryEntry } from '../types/game';
import { analyzeParams, getFunctionExpression } from './mathEngine';

export const generateReportCard = (
  startTime: number,
  endTime: number,
  score: number,
  finalParams: QuadraticParams,
  paramChanges: QuadraticParams[],
  collisions: CollisionRecord[],
  history: HistoryEntry[]
): ReportCard => {
  const paramEffect = analyzeParamEffects(paramChanges);
  const speedAnalysis = analyzeSpeedAndCollisions(collisions, paramChanges);
  const suggestions = generateSuggestions(collisions, paramChanges);
  const mathSummary = generateMathSummary(finalParams, paramChanges);

  return {
    gameId: `game-${Date.now()}`,
    startTime,
    endTime,
    totalScore: score,
    finalParams,
    paramChanges,
    collisions,
    history,
    conclusions: {
      paramEffect,
      speedAnalysis,
      suggestions,
      mathSummary,
    },
  };
};

const analyzeParamEffects = (paramChanges: QuadraticParams[]): string => {
  if (paramChanges.length === 0) {
    return '游戏过程中未调整参数，保持了初始曲线设置。';
  }

  let aChanges = 0, bChanges = 0, cChanges = 0;
  let prevParams = paramChanges[0];

  for (let i = 1; i < paramChanges.length; i++) {
    const params = paramChanges[i];
    if (Math.abs(params.a - prevParams.a) > 0.001) aChanges++;
    if (Math.abs(params.b - prevParams.b) > 0.001) bChanges++;
    if (Math.abs(params.c - prevParams.c) > 0.001) cChanges++;
    prevParams = params;
  }

  const effects: string[] = [];
  
  if (aChanges > 0) {
    effects.push(`调整了 ${aChanges} 次参数 a，影响了曲线的${aChanges > 2 ? '开口方向和陡峭程度' : '开口形态'}`);
  }
  if (bChanges > 0) {
    effects.push(`调整了 ${bChanges} 次参数 b，${bChanges > 2 ? '多次' : ''}改变了对称轴位置`);
  }
  if (cChanges > 0) {
    effects.push(`调整了 ${cChanges} 次参数 c，使曲线${cChanges > 2 ? '反复' : ''}上下平移`);
  }

  return effects.length > 0 
    ? effects.join('；') + '。' 
    : '参数调整主要集中在精细微调，保持了曲线的整体形态。';
};

const analyzeSpeedAndCollisions = (
  collisions: CollisionRecord[],
  paramChanges: QuadraticParams[]
): string => {
  if (collisions.length === 0) {
    return '完美滑行！全程没有碰撞任何障碍物，展现了优秀的参数控制能力。';
  }

  const collisionParams = collisions.map(c => c.params);
  const avgA = collisionParams.reduce((sum, p) => sum + p.a, 0) / collisionParams.length;
  
  const analysis: string[] = [];
  analysis.push(`共发生 ${collisions.length} 次碰撞`);
  
  if (Math.abs(avgA) > 0.005) {
    analysis.push(avgA > 0 
      ? '碰撞时曲线开口向上，可能导致滑雪者速度过快'
      : '碰撞时曲线开口向下，可能导致滑雪者路径过低');
  }

  return analysis.join('，') + '。';
};

const generateSuggestions = (
  collisions: CollisionRecord[],
  paramChanges: QuadraticParams[]
): string => {
  const suggestions: string[] = [];

  if (collisions.length > 2) {
    suggestions.push('建议在开始滑行前仔细预览完整曲线，提前规划避障路径');
  }

  if (paramChanges.length < 3) {
    suggestions.push('可以尝试更多的参数组合，探索不同曲线形态的滑行效果');
  }

  if (collisions.length === 0) {
    suggestions.push('表现优秀！可以尝试增加参数 a 的绝对值来挑战更陡峭的曲线');
  }

  if (collisions.some(c => Math.abs(c.params.b) > 5)) {
    suggestions.push('注意参数 b 对对称轴的影响，避免曲线过度偏移导致碰撞');
  }

  suggestions.push('观察曲线顶点位置，合理利用参数 c 调整起始高度以避开障碍物');

  return suggestions.slice(0, 3).join('；') + '。';
};

const generateMathSummary = (
  finalParams: QuadraticParams,
  paramChanges: QuadraticParams[]
): string => {
  const analysis = analyzeParams(finalParams);
  const finalExpr = getFunctionExpression(finalParams);

  const summary: string[] = [];
  summary.push(`最终函数表达式：${finalExpr}`);
  summary.push(`曲线开口方向：${analysis.openingDirection}`);
  
  if (Math.abs(finalParams.a) > 0.001) {
    summary.push(`顶点坐标：(${analysis.vertex.x.toFixed(2)}, ${analysis.vertex.y.toFixed(2)})`);
    summary.push(`对称轴：x = ${analysis.axisOfSymmetry.toFixed(2)}`);
  }
  
  summary.push(`Y轴截距：y = ${analysis.yIntercept.toFixed(2)}`);

  if (paramChanges.length > 1) {
    const firstParams = paramChanges[0];
    if (Math.abs(finalParams.a - firstParams.a) > 0.001) {
      const aChange = finalParams.a - firstParams.a;
      summary.push(`参数 a 从 ${firstParams.a.toFixed(3)} 变为 ${finalParams.a.toFixed(3)}，` +
        `${aChange > 0 ? '开口变窄/方向变为向上' : '开口变宽/方向变为向下'}`);
    }
    if (Math.abs(finalParams.b - firstParams.b) > 0.01) {
      summary.push(`参数 b 的变化导致对称轴从 ${
        analyzeParams(firstParams).axisOfSymmetry.toFixed(2)
      } 移到 ${analysis.axisOfSymmetry.toFixed(2)}`);
    }
  }

  return summary.join('；') + '。';
};

export const formatDuration = (startTime: number, endTime: number): string => {
  const seconds = Math.floor((endTime - startTime) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
