import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { GameRecord, ScoringResult } from '@/types';
import { getGameRecord } from '@/utils/storage';
import { exportAuditReport } from '@/utils/exportReport';
import { getAnomalyTypeName } from '@/utils/scoringEngine';

export const ResultPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (gameId) {
      const gameRecord = getGameRecord(gameId);
      if (gameRecord) {
        setRecord(gameRecord);
        setScoringResult({
          totalScore: gameRecord.score,
          correctDetections: gameRecord.detectedAnomalies,
          wrongMarks: gameRecord.wrongMarks,
          missedAnomalies: gameRecord.totalAnomalies - gameRecord.detectedAnomalies,
          timeBonus: 0,
          grade: gameRecord.grade,
        });
      }
    }
  }, [gameId]);

  const handleExport = async () => {
    if (record && scoringResult) {
      setExporting(true);
      try {
        await exportAuditReport(record, scoringResult);
      } catch (error) {
        console.error('Export failed:', error);
      } finally {
        setExporting(false);
      }
    }
  };

  if (!record || !scoringResult) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">记录不存在</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const correctDetections = record.anomalies.filter(a => a.isDetected && !a.isWronglyMarked);
  const wrongMarks = record.anomalies.filter(a => a.isWronglyMarked);
  const missedAnomalies = record.anomalies.filter(a => !a.isDetected && !a.isWronglyMarked);

  const gradeColors: Record<string, string> = {
    S: 'from-amber-400 to-amber-600',
    A: 'from-emerald-400 to-emerald-600',
    B: 'from-blue-400 to-blue-600',
    C: 'from-slate-400 to-slate-600',
    D: 'from-red-400 to-red-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-2xl font-bold text-slate-800">稽核报告</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">{record.levelName}</p>
                <p className="text-slate-400 text-sm">
                  {new Date(record.completedAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-amber-400">{scoringResult.totalScore}</div>
                  <div className="text-slate-400 text-sm">总分</div>
                </div>
                <div
                  className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradeColors[record.grade]} flex items-center justify-center shadow-lg`}
                >
                  <span className="text-3xl font-bold text-white">{record.grade}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              评分明细
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-2xl font-bold text-emerald-600">
                    {correctDetections.length}
                  </span>
                </div>
                <p className="text-emerald-700 text-sm">正确识别</p>
                <p className="text-emerald-500 text-xs">
                  +{correctDetections.reduce((sum, a) => sum + a.scoreDelta, 0)} 分
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">{wrongMarks.length}</span>
                </div>
                <p className="text-red-700 text-sm">错误标记</p>
                <p className="text-red-500 text-xs">-{wrongMarks.length * 15} 分</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span className="text-2xl font-bold text-amber-600">{missedAnomalies.length}</span>
                </div>
                <p className="text-amber-700 text-sm">遗漏异常</p>
                <p className="text-amber-500 text-xs">0 分</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl font-bold text-blue-600">
                    {record.totalAnomalies}
                  </span>
                </div>
                <p className="text-blue-700 text-sm">异常总数</p>
                <p className="text-blue-500 text-xs">
                  {record.detectedAnomalies}/{record.totalAnomalies} 发现
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              正确识别的异常
            </h2>
            {correctDetections.length === 0 ? (
              <p className="text-slate-400 text-center py-4">无</p>
            ) : (
              <div className="space-y-3">
                {correctDetections.map(anomaly => (
                  <div
                    key={anomaly.id}
                    className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-emerald-700">
                        {getAnomalyTypeName(anomaly.type)}
                      </span>
                      <span className="text-emerald-600 text-sm">+{anomaly.scoreDelta} 分</span>
                    </div>
                    <p className="text-slate-600 text-sm">{anomaly.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              错误标记的项
            </h2>
            {wrongMarks.length === 0 ? (
              <p className="text-slate-400 text-center py-4">无</p>
            ) : (
              <div className="space-y-3">
                {wrongMarks.map(anomaly => (
                  <div
                    key={anomaly.id}
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-red-700">
                        {getAnomalyTypeName(anomaly.type)}
                      </span>
                      <span className="text-red-600 text-sm">-15 分</span>
                    </div>
                    <p className="text-slate-600 text-sm">{anomaly.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              遗漏的异常
            </h2>
            {missedAnomalies.length === 0 ? (
              <p className="text-slate-400 text-center py-4">无，全部发现！</p>
            ) : (
              <div className="space-y-3">
                {missedAnomalies.map(anomaly => (
                  <div
                    key={anomaly.id}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-amber-700">
                        {getAnomalyTypeName(anomaly.type)}
                      </span>
                      <span className="text-amber-600 text-sm">+{anomaly.scoreDelta} 分（未获得）</span>
                    </div>
                    <p className="text-slate-600 text-sm">{anomaly.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => navigate(`/replay/${record.id}`)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                <Play className="w-5 h-5" />
                回放推理过程
              </button>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                {exporting ? '导出中...' : '导出PDF报告'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
