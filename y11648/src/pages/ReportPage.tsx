import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import {
  generateReport,
  exportReportToJSON,
  exportLogsToCSV,
  downloadFile,
  formatDuration,
} from '../utils/reportGenerator';
import { getConflictTypeLabel } from '../utils/conflictDetector';
import { Home, Download, ArrowLeft, Clock, AlertTriangle, CheckCircle, HelpCircle, List } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type TabType = 'unhandled' | 'corrected' | 'review' | 'all';

const ReportPage = () => {
  const navigate = useNavigate();
  const state = useGameStore();
  const report = generateReport(state);
  const [activeTab, setActiveTab] = useState<TabType>('unhandled');

  const handleExportJSON = () => {
    const json = exportReportToJSON(report);
    downloadFile(json, `dispatch-report-${report.gameId}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const csv = exportLogsToCSV(report.operationTrail);
    downloadFile(csv, `operation-logs-${report.gameId}.csv`, 'text/csv');
  };

  const tabs = [
    { id: 'unhandled' as TabType, label: '未处理事件', icon: AlertTriangle, count: report.unhandledEvents.length, color: 'text-red-400' },
    { id: 'corrected' as TabType, label: '已修正操作', icon: CheckCircle, count: report.correctedOperations.length, color: 'text-emerald-400' },
    { id: 'review' as TabType, label: '待人工确认', icon: HelpCircle, count: report.needsReview.length, color: 'text-blue-400' },
    { id: 'all' as TabType, label: '操作痕迹', icon: List, count: report.operationTrail.length, color: 'text-slate-400' },
  ];

  const getLogTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      assignment: 'bg-blue-500/20 text-blue-400',
      movement: 'bg-cyan-500/20 text-cyan-400',
      conflict: 'bg-red-500/20 text-red-400',
      correction: 'bg-emerald-500/20 text-emerald-400',
      completion: 'bg-amber-500/20 text-amber-400',
      system: 'bg-slate-500/20 text-slate-400',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-400';
  };

  const getLogTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      assignment: '分配',
      movement: '移动',
      conflict: '冲突',
      correction: '修正',
      completion: '完成',
      system: '系统',
    };
    return labels[type] || type;
  };

  const renderLogs = () => {
    let logsToShow: any[] = [];

    switch (activeTab) {
      case 'unhandled':
        logsToShow = report.unhandledEvents;
        break;
      case 'corrected':
        logsToShow = report.correctedOperations;
        break;
      case 'review':
        logsToShow = report.needsReview;
        break;
      case 'all':
        logsToShow = report.operationTrail;
        break;
    }

    if (logsToShow.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <CheckCircle className="w-12 h-12 mb-4 text-emerald-500" />
          <p className="text-lg">该分类暂无记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {logsToShow.map((log, index) => {
          const isCorrectionPair = 'original' in log && 'correction' in log;
          const logData = isCorrectionPair ? log.original : log;

          return (
            <motion.div
              key={logData.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="p-4 bg-slate-700/50 rounded-xl border border-slate-600"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded ${getLogTypeColor(logData.type)}`}>
                    {getLogTypeLabel(logData.type)}
                  </span>
                  {logData.isCorrection && (
                    <span className="px-2 py-0.5 text-xs rounded bg-emerald-500/20 text-emerald-400">
                      已修正
                    </span>
                  )}
                  {logData.source === 'player' && (
                    <span className="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                      玩家操作
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock size={12} />
                  {format(logData.gameTime, 'HH:mm:ss', { locale: zhCN })}
                </div>
              </div>

              <p className="text-sm text-slate-200">{logData.action}</p>

              {logData.type === 'conflict' && (
                <div className="mt-2 text-xs text-red-400">
                  冲突类型: {getConflictTypeLabel(logData.type)}
                </div>
              )}

              {isCorrectionPair && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                  <div className="text-xs text-emerald-400 mb-1">✓ 修正操作:</div>
                  <p className="text-sm text-emerald-300">{log.correction.action}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/result')}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">调度报告</h1>
              <p className="text-sm text-slate-400">游戏ID: {report.gameId}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              导出 JSON
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download size={16} />
              导出 CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Home size={16} />
              返回首页
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-4 gap-4 mb-6"
        >
          <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">总分</div>
            <div className="text-3xl font-bold text-white">{report.score.total}</div>
          </div>
          <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">游戏时长</div>
            <div className="text-3xl font-bold text-cyan-400">{formatDuration(report.playDuration)}</div>
          </div>
          <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">任务完成率</div>
            <div className="text-3xl font-bold text-emerald-400">
              {report.totalTasks > 0 ? Math.round((report.completedTasks / report.totalTasks) * 100) : 0}%
            </div>
          </div>
          <div className="p-4 bg-slate-800/70 rounded-xl border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">总操作数</div>
            <div className="text-3xl font-bold text-amber-400">{report.operationTrail.length}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/70 backdrop-blur rounded-2xl border border-slate-700 overflow-hidden"
        >
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-slate-700/50 text-white border-b-2 border-cyan-500'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <tab.icon size={16} className={activeTab === tab.id ? tab.color : ''} />
                <span className="font-medium">{tab.label}</span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-6">{renderLogs()}</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-slate-500"
        >
          <p>报告生成时间: {new Date(report.completedAt).toLocaleString('zh-CN')}</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ReportPage;
