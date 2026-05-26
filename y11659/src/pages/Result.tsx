import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Trophy,
  Home,
  RotateCcw,
  Download,
  Play,
  FileText,
  Sheet,
  FileJson,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useGameStore } from '../store/gameStore';
import { useHistoryStore } from '../store/historyStore';
import { exportToJSON, exportToCSV, exportToExcel, exportToPDF } from '../services/exportService';
import { ERROR_TYPE_LABELS } from '../types';

export default function Result() {
  const navigate = useNavigate();
  const { score, operations, vehicles, playerName, resetGame, getMaxScore, getGameRecord } = useGameStore();
  const { addRecord } = useHistoryStore();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'details'>('summary');

  const maxScore = getMaxScore();
  const correctCount = operations.filter((op) => op.isCorrect).length;
  const accuracy = operations.length > 0 ? (correctCount / operations.length) * 100 : 0;
  const avgTime = operations.length > 0
    ? operations.reduce((sum, op) => sum + op.operationTime, 0) / operations.length
    : 0;

  const errorTypeData = Object.entries(
    operations.reduce((acc, op) => {
      if (op.errorType) {
        acc[op.errorType] = (acc[op.errorType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  ).map(([type, count]) => ({
    name: ERROR_TYPE_LABELS[type as keyof typeof ERROR_TYPE_LABELS] || type,
    value: count,
  }));

  const scoreDistribution = [
    { name: '正确', value: correctCount, color: '#43a047' },
    { name: '错误', value: operations.length - correctCount, color: '#e53935' },
  ];

  const handleExport = async (format: 'json' | 'csv' | 'excel' | 'pdf') => {
    const record = getGameRecord();
    if (!record) return;

    switch (format) {
      case 'json':
        exportToJSON(record);
        break;
      case 'csv':
        exportToCSV(record);
        break;
      case 'excel':
        exportToExcel(record);
        break;
      case 'pdf':
        await exportToPDF(record);
        break;
    }
    setShowExportMenu(false);
  };

  const handleRestart = () => {
    resetGame();
    navigate('/game');
  };

  const getGrade = () => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 90) return { grade: 'S', color: 'text-warning-400', desc: '完美！' };
    if (percentage >= 80) return { grade: 'A', color: 'text-success-400', desc: '优秀！' };
    if (percentage >= 70) return { grade: 'B', color: 'text-primary-300', desc: '良好' };
    if (percentage >= 60) return { grade: 'C', color: 'text-warning-400', desc: '及格' };
    return { grade: 'D', color: 'text-danger-400', desc: '需要加强' };
  };

  const gradeInfo = getGrade();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <Trophy className="w-16 h-16 text-warning-400 mx-auto mb-4" />
          <h1 className="text-4xl font-black text-white mb-2">挑战完成！</h1>
          <p className="text-white/60">{playerName} 的验放报告</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-panel p-8 mb-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className={`text-6xl font-black ${gradeInfo.color} mb-2`}>
                {gradeInfo.grade}
              </div>
              <p className="text-white/60">{gradeInfo.desc}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success-400 mb-2">
                {score}
                <span className="text-xl text-white/40">/{maxScore}</span>
              </div>
              <p className="text-white/60">总得分</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-300 mb-2">
                {accuracy.toFixed(0)}%
              </div>
              <p className="text-white/60">正确率</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-warning-400 mb-2">
                {avgTime.toFixed(1)}s
              </div>
              <p className="text-white/60">平均耗时</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'summary'
                ? 'bg-primary-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            错误分析
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'details'
                ? 'bg-primary-500 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            操作明细
          </button>
        </div>

        {activeTab === 'summary' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
          >
            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">正确率分布</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-panel p-6">
              <h3 className="text-lg font-bold text-white mb-4">错误类型统计</h3>
              {errorTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={errorTypeData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#fff' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1e3a5f',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                    />
                    <Bar dataKey="value" fill="#e53935" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-white/40">
                  <CheckCircle className="w-12 h-12 mr-2 text-success-400" />
                  太棒了！没有错误记录
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-6 mb-6"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-white/60 font-medium">序号</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">操作</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">结果</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">得分</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">错误类型</th>
                    <th className="text-left py-3 px-4 text-white/60 font-medium">耗时</th>
                  </tr>
                </thead>
                <tbody>
                  {operations.map((op, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 px-4 text-white">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className={op.userAction === 'release' ? 'text-success-400' : 'text-danger-400'}>
                          {op.userAction === 'release' ? '放行' : '拦截'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {op.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-success-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-danger-400" />
                        )}
                      </td>
                      <td className={`py-3 px-4 font-bold ${
                        op.scoreChange >= 0 ? 'text-success-400' : 'text-danger-400'
                      }`}>
                        {op.scoreChange >= 0 ? '+' : ''}{op.scoreChange}
                      </td>
                      <td className="py-3 px-4">
                        {op.errorType ? (
                          <span className="flex items-center gap-1 text-warning-400">
                            <AlertTriangle className="w-4 h-4" />
                            {ERROR_TYPE_LABELS[op.errorType]}
                          </span>
                        ) : (
                          <span className="text-white/40">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-white/60">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {op.operationTime.toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        <div className="flex flex-wrap gap-4 justify-center">
          <button onClick={handleRestart} className="btn-success flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            再来一次
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="btn-primary flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              导出报告
            </button>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 right-0 bg-primary-700 rounded-lg shadow-xl overflow-hidden z-10 min-w-[160px]"
              >
                <button
                  onClick={() => handleExport('json')}
                  className="w-full px-4 py-3 text-left text-white hover:bg-primary-600 flex items-center gap-2"
                >
                  <FileJson className="w-4 h-4" />
                  JSON 格式
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-3 text-left text-white hover:bg-primary-600 flex items-center gap-2"
                >
                  <Sheet className="w-4 h-4" />
                  CSV 格式
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-3 text-left text-white hover:bg-primary-600 flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel 格式
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-3 text-left text-white hover:bg-primary-600 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF 格式
                </button>
              </motion.div>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="bg-white/10 hover:bg-white/20 text-white py-3 px-6 rounded-lg flex items-center gap-2 transition-all"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
