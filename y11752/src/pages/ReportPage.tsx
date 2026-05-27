import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Home, RotateCcw, Award, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { MaterialCard } from '@/components/game/MaterialCard';
import { useGameStore } from '@/store/gameStore';
import { getRecord } from '@/utils/storage';
import { downloadPDF } from '@/utils/pdfExport';
import { formatTime, getGradeColor, getRiskTypeName } from '@/utils/gameEngine';
import { GameRecord } from '@/types/game';

export const ReportPage = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { markAsExported, loadSavedRecords, records } = useGameStore();
  const [record, setRecord] = useState<GameRecord | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadSavedRecords();
  }, [loadSavedRecords]);

  useEffect(() => {
    if (gameId) {
      const foundRecord = records.find(r => r.id === gameId) || getRecord(gameId);
      if (foundRecord) {
        setRecord(foundRecord);
      }
    }
  }, [gameId, records]);

  const handleExportPDF = async () => {
    if (!record) return;
    setIsExporting(true);
    try {
      await downloadPDF(record);
      markAsExported(record.id);
      setRecord(prev => prev ? { ...prev, exported: true } : null);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReplay = () => {
    if (record) {
      navigate(`/game/${record.caseId}`);
    }
  };

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  const percentage = ((record.score / record.maxScore) * 100).toFixed(1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回大厅</span>
          </button>
          <Button
            onClick={handleExportPDF}
            disabled={isExporting}
            variant="outline"
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? '导出中...' : record.exported ? '重新导出PDF' : '导出PDF报告'}
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-0 overflow-hidden mb-8">
            <CardContent className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="mb-6"
              >
                <div
                  className="w-32 h-32 mx-auto rounded-full flex items-center justify-center text-6xl font-bold shadow-2xl"
                  style={{
                    backgroundColor: getGradeColor(record.grade) + '20',
                    color: getGradeColor(record.grade),
                    border: `4px solid ${getGradeColor(record.grade)}`
                  }}
                >
                  {record.grade}
                </div>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-bold text-white mb-2"
              >
                {record.caseTitle}
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-8 mb-6"
              >
                <div className="text-center">
                  <div className="flex items-center gap-2 text-amber-400 justify-center">
                    <Award className="w-5 h-5" />
                    <span className="text-3xl font-bold">{record.score}</span>
                    <span className="text-slate-400">/ {record.maxScore}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">得分</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-2 text-emerald-400 justify-center">
                    <Clock className="w-5 h-5" />
                    <span className="text-3xl font-bold">{formatTime(record.totalTime)}</span>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">用时</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">{percentage}%</div>
                  <p className="text-slate-400 text-sm mt-1">正确率</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full bg-slate-600 rounded-full h-4 mb-6 overflow-hidden"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 1, delay: 0.7 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: getGradeColor(record.grade) }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center gap-4"
              >
                <Button onClick={handleReplay}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重新挑战
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/')}
                >
                  <Home className="w-4 h-4 mr-2" />
                  返回首页
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {record.mistakes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <Card>
              <CardHeader className="bg-red-50 border-b border-red-100">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="w-5 h-5" />
                  <h2 className="text-lg font-bold">错误分析 ({record.mistakes.length}处)</h2>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {record.mistakes.map((mistake, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 bg-red-50 rounded-xl border border-red-100"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-red-800">{mistake.materialTitle}</span>
                            <span className="text-xs px-2 py-0.5 bg-red-200 text-red-700 rounded-full">
                              -{mistake.pointsLost}分
                            </span>
                          </div>
                          <div className="text-sm text-red-700 space-y-1">
                            <p>
                              <span className="font-medium">您的判断：</span>
                              {mistake.userAnswer ? '标记了风险' : '未标记风险'}
                            </p>
                            <p>
                              <span className="font-medium">正确判断：</span>
                              {mistake.correctAnswer ? '应该标记风险' : '不应标记风险'}
                            </p>
                            <p>
                              <span className="font-medium">材料来源：</span>
                              {mistake.source}
                            </p>
                            <p className="mt-2 p-2 bg-white rounded border border-red-200">
                              <span className="font-medium">💡 修正指导：</span>
                              {mistake.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
                <h2 className="text-lg font-bold">答题详情</h2>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {record.answers.map((answer, index) => {
                  const material = record.mistakes.find(m => m.materialId === answer.materialId);
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + index * 0.05 }}
                    >
                      <div className={cn(
                        'p-3 rounded-lg border-2',
                        answer.isCorrect
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      )}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-700 truncate flex-1">
                            {material?.materialTitle || answer.materialId}
                          </span>
                          {answer.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-2" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 ml-2" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {answer.markedRisk
                            ? answer.riskType
                              ? `标记: ${getRiskTypeName(answer.riskType)}`
                              : '标记: 有风险'
                            : '判断: 无风险'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {record.exportHash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center text-slate-500 text-sm"
          >
            <p>🔐 数据校验码: {record.exportHash}</p>
            <p className="mt-1">此报告所有数据均已加密验证，确保真实可信</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
