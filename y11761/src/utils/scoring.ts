import {
  WaveParams,
  ScoreRecord,
  ScoreBreakdown,
  AnomalyRecord,
  SamplePoint,
} from '@/types';
import { getInterferenceContrast, calculateTheoreticalAmplitude } from './physicsEngine';

export function calculateScore(
  params: WaveParams,
  amplitudes: Float32Array,
  anomalies: AnomalyRecord[],
  samplePoints: SamplePoint[],
  currentTime: number
): ScoreRecord {
  const breakdown: ScoreBreakdown[] = [];
  const { contrast, maxAmp, minAmp } = getInterferenceContrast(amplitudes);

  const clarityScore = Math.round(contrast * 40);
  breakdown.push({
    category: '干涉清晰度',
    score: clarityScore,
    maxScore: 40,
    explanation: `干涉条纹对比度 = (${maxAmp.toFixed(3)} - ${minAmp.toFixed(3)}) / (${maxAmp.toFixed(3)} + ${minAmp.toFixed(3)}) = ${contrast.toFixed(3)}，越接近1表示条纹越清晰`,
  });

  let paramScore = 0;
  const freq1Valid = params.source1.frequency >= 1 && params.source1.frequency <= 3;
  const freq2Valid = params.source2.frequency >= 1 && params.source2.frequency <= 3;
  const freqScore = freq1Valid && freq2Valid ? 10 : 0;
  paramScore += freqScore;

  const phaseDiff = Math.abs(params.source1.phase - params.source2.phase);
  const phaseScore = phaseDiff >= 0 && phaseDiff <= Math.PI * 2 ? 10 : 0;
  paramScore += phaseScore;

  const dx = params.source1.x - params.source2.x;
  const dy = params.source1.y - params.source2.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const distScore = dist >= params.wavelength / 2 ? 10 : 0;
  paramScore += distScore;

  breakdown.push({
    category: '参数合理性',
    score: paramScore,
    maxScore: 30,
    explanation: `频率合理(1-3Hz): ${freqScore}/10分；相位差有效: ${phaseScore}/10分；波源间距合适(>λ/2): ${distScore}/10分`,
  });

  let anomalyScore = 20;
  const hasWarning = anomalies.some((a) => a.severity === 'warning');
  const hasError = anomalies.some((a) => a.severity === 'error');
  if (hasWarning) anomalyScore -= 10;
  if (hasError) anomalyScore -= 10;
  breakdown.push({
    category: '无异常状态',
    score: Math.max(0, anomalyScore),
    maxScore: 20,
    explanation: `无警告得10分，无错误得10分。当前状态：${hasWarning ? '存在警告' : '无警告'}，${hasError ? '存在错误' : '无错误'}`,
  });

  let matchScore = 0;
  let totalMatchError = 0;
  let validMatchPoints = 0;
  if (samplePoints.length > 0) {
    for (const sp of samplePoints) {
      if (sp.measurements.length > 0) {
        const latest = sp.measurements[sp.measurements.length - 1];
        const theoretical = calculateTheoreticalAmplitude(
          sp.position.x,
          sp.position.y,
          params
        );
        const error = Math.abs(latest.amplitude - theoretical) / (theoretical + 0.001);
        totalMatchError += error;
        validMatchPoints++;
      }
    }
    if (validMatchPoints > 0) {
      const avgError = totalMatchError / validMatchPoints;
      if (avgError < 0.05) matchScore = 10;
      else if (avgError < 0.15) matchScore = 5;
      else matchScore = 0;
    }
  }
  breakdown.push({
    category: '采样点匹配度',
    score: matchScore,
    maxScore: 10,
    explanation: validMatchPoints > 0
      ? `采样点测量值与理论值平均误差 ${(totalMatchError / validMatchPoints * 100).toFixed(1)}%，误差<5%得10分，5%-15%得5分，>15%得0分`
      : '暂无采样点数据，请在3D场景中点击水面添加采样点进行测量',
  });

  const totalScore = breakdown.reduce((sum, b) => sum + b.score, 0);

  return {
    id: `score_${currentTime}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: currentTime,
    totalScore,
    breakdown,
    paramsSnapshot: JSON.parse(JSON.stringify(params)),
  };
}

export function getScoreGrade(score: number): { grade: string; color: string } {
  if (score >= 90) return { grade: 'A+', color: '#2A9D8F' };
  if (score >= 80) return { grade: 'A', color: '#2A9D8F' };
  if (score >= 70) return { grade: 'B', color: '#3E92CC' };
  if (score >= 60) return { grade: 'C', color: '#F4A261' };
  return { grade: 'D', color: '#E63946' };
}
