import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Clock, Lightbulb, FileText, RefreshCw } from 'lucide-react';
import { useReportStore } from '@/store/reportStore';
import { useGameStore } from '@/store/gameStore';
import { useScoreStore } from '@/store/scoreStore';
import { getLevelById } from '@/data/levels';
import { generatePracticeReport } from '@/engine/reportGenerator';
import { exportToPDF, exportToPNG, printReport } from '@/utils/export';
import LogicGraph from '@/components/report/LogicGraph';
import ScoreTable from '@/components/report/ScoreTable';
import CounterexampleTrack from '@/components/report/CounterexampleTrack';
import ExportButton from '@/components/report/ExportButton';
import type { PracticeReport } from '@/types/report';

export default function ReportPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { report, setReport, counterexampleEdits } = useReportStore();
  const { conditionCards, lemmaCards, conclusionSlots, connections, currentLevelId } = useGameStore();
  const { scoreResult } = useScoreStore();
  const [studentName, setStudentName] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const level = useMemo(() => {
    if (!currentLevelId) return undefined;
    return getLevelById(currentLevelId);
  }, [currentLevelId]);

  useEffect(() => {
    if (!report && scoreResult && level && currentLevelId === level.id) {
      const newReport = generatePracticeReport(scoreResult, level, connections, studentName);
      setReport(newReport);
    }
  }, [report, scoreResult, level, connections, studentName, setReport, currentLevelId]);

  const displayReport = useMemo<PracticeReport | null>(() => {
    if (!report) return null;
    if (counterexampleEdits.length > 0) {
      return {
        ...report,
        counterexampleTracks: [
          ...report.counterexampleTracks,
          ...counterexampleEdits.map((edit) => ({
            counterexampleId: edit.counterexampleId,
            content: '教练补录反例',
            beforeConclusion: edit.beforeConclusion,
            afterConclusion: edit.afterConclusion,
            affectedSteps: [],
          })),
        ],
      };
    }
    return report;
  }, [report, counterexampleEdits]);

  const suggestions = useMemo(() => {
    if (!displayReport) return [];
    return displayReport.suggestions.split('\n\n').filter(Boolean);
  }, [displayReport]);

  const handleBack = () => {
    if (currentLevelId) {
      navigate(`/score/${currentLevelId}`);
    } else {
      navigate('/');
    }
  };

  const handleNameChange = (name: string) => {
    setStudentName(name);
    if (displayReport && level && scoreResult) {
      const updatedReport = generatePracticeReport(scoreResult, level, connections, name);
      setReport(updatedReport);
    }
  };

  const handleExportPDF = async () => {
    if (!attemptId) return;
    setIsExporting(true);
    try {
      await exportToPDF('report-content', `数学证明报告-${attemptId}`);
    } catch (error) {
      console.error('导出PDF失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPNG = async () => {
    if (!attemptId) return;
    setIsExporting(true);
    try {
      await exportToPNG('report-content', `数学证明报告-${attemptId}`);
    } catch (error) {
      console.error('导出PNG失败:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (!attemptId) return;
    try {
      printReport('report-content');
    } catch (error) {
      console.error('打印失败:', error);
    }
  };

  if (!displayReport || !level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-neutral-slate">正在生成报告...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-ivory via-white to-primary/5 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-neutral-ivory hover:border-primary hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回评分
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold font-serif text-neutral-ink">
                复盘报告 - {level.title}
              </h1>
              <p className="text-sm text-neutral-slate">
                报告编号：{displayReport.attemptId}
              </p>
            </div>
          </div>

          <ExportButton
            onExportPDF={handleExportPDF}
            onExportPNG={handleExportPNG}
            onPrint={handlePrint}
            isLoading={isExporting}
          />
        </motion.div>

        <div id="report-content" className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-card p-6 border-2 border-neutral-ivory"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-slate mb-0.5">报告标题</div>
                    <div className="font-bold text-neutral-ink">{displayReport.levelTitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-amber/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-accent-amber" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-slate mb-0.5">学生姓名</div>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="请输入学生姓名"
                      className="font-medium text-neutral-ink bg-transparent border-b-2 border-transparent focus:border-primary focus:outline-none px-1 py-0.5 w-32"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-emerald/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent-emerald" />
                  </div>
                  <div>
                    <div className="text-xs text-neutral-slate mb-0.5">完成时间</div>
                    <div className="font-medium text-neutral-ink">
                      {new Date(displayReport.completedAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {displayReport.totalScore}
                  </div>
                  <div className="text-xs text-neutral-slate">
                    / {displayReport.maxScore} 分
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent-emerald">
                    {Math.round((displayReport.totalScore / displayReport.maxScore) * 100)}%
                  </div>
                  <div className="text-xs text-neutral-slate">正确率</div>
                </div>
              </div>
            </div>
          </motion.div>

          <LogicGraph
            connections={displayReport.logicConnections}
            cards={[...conditionCards, ...lemmaCards]}
            slots={conclusionSlots}
          />

          <ScoreTable stepScores={displayReport.scoreResult.stepScores} />

          <CounterexampleTrack tracks={displayReport.counterexampleTracks} />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-2xl shadow-card p-6 border-2 border-neutral-ivory"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-accent-violet/10 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-accent-violet" />
              </div>
              <h3 className="text-lg font-bold text-neutral-ink">改进建议</h3>
              {counterexampleEdits.length > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent-rose/10 text-accent-rose text-xs font-medium">
                  <RefreshCw className="w-3 h-3" />
                  已更新
                </span>
              )}
            </div>

            <div className="space-y-4">
              {suggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.1 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-neutral-ivory/50 border border-neutral-ivory"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="text-neutral-ink font-serif leading-relaxed">
                    {suggestion.replace(/^[•·]\s*/, '')}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 flex items-center justify-center gap-3 text-xs text-neutral-slate"
        >
          <span>数学证明拼板 · 智能学习系统</span>
          <span>·</span>
          <span>报告生成时间：{new Date().toLocaleString('zh-CN')}</span>
        </motion.div>
      </div>
    </div>
  );
}
