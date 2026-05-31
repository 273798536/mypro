import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, Copy, Download, Trash2, CheckCircle, FileText, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import StarField from '../components/StarField';
import { getAllFlightReports, getFlightReport, deleteFlightReport, copyToClipboard, formatReportAsText, downloadReport } from '../utils/storage';
import type { FlightReport } from '../types/game';

export default function Report() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const [reports, setReports] = useState<FlightReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FlightReport | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReports();
  }, [reportId]);

  const loadReports = () => {
    const allReports = getAllFlightReports();
    setReports(allReports);

    if (reportId) {
      const report = getFlightReport(reportId);
      if (report) {
        setSelectedReport(report);
      }
    } else if (allReports.length > 0) {
      setSelectedReport(allReports[0]);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}分${secs}秒`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const handleCopy = async () => {
    if (!selectedReport) return;
    const text = formatReportAsText(selectedReport);
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!selectedReport) return;
    downloadReport(selectedReport);
  };

  const handleDelete = (reportIdToDelete: string) => {
    if (confirm('确定要删除这份飞行报告吗？')) {
      deleteFlightReport(reportIdToDelete);
      loadReports();
      if (selectedReport?.reportId === reportIdToDelete) {
        setSelectedReport(null);
      }
    }
  };

  const getScoreGrade = (total: number): { grade: string; color: string } => {
    if (total >= 900) return { grade: 'S', color: 'text-neon-yellow' };
    if (total >= 800) return { grade: 'A', color: 'text-neon-green' };
    if (total >= 600) return { grade: 'B', color: 'text-neon-cyan' };
    if (total >= 400) return { grade: 'C', color: 'text-neon-yellow' };
    return { grade: 'D', color: 'text-neon-red' };
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <StarField />

      <div className="relative z-10">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 flex items-center justify-between bg-space-900/80 backdrop-blur-sm border-b border-neon-yellow/20"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-space-700 transition-colors text-gray-400 hover:text-neon-cyan"
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="font-orbitron text-xl text-neon-yellow flex items-center gap-2">
                <FileText size={24} />
                飞行报告
              </h1>
              <p className="text-xs text-gray-400">Flight Reports</p>
            </div>
          </div>

          <div className="flex gap-3">
            {selectedReport && (
              <>
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all ${
                    copied
                      ? 'border-neon-green bg-neon-green/10 text-neon-green'
                      : 'border-neon-cyan/50 text-neon-cyan hover:bg-neon-cyan/10'
                  }`}
                >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                  {copied ? '已复制' : '复制报告'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg border border-neon-green/50 text-neon-green hover:bg-neon-green/10 transition-colors flex items-center gap-2"
                >
                  <Download size={18} />
                  下载
                </button>
              </>
            )}
          </div>
        </motion.header>

        <main className="container px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="panel-glass p-4 sticky top-4">
                <h3 className="font-orbitron text-sm text-neon-yellow mb-4 flex items-center gap-2">
                  <Clock size={16} />
                  历史报告
                </h3>
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {reports.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <FileText className="mx-auto mb-2 opacity-50" size={32} />
                      暂无飞行报告
                    </div>
                  ) : (
                    reports.map((report) => {
                      const grade = getScoreGrade(report.totalScore);
                      return (
                        <motion.div
                          key={report.reportId}
                          whileHover={{ x: 4 }}
                          onClick={() => setSelectedReport(report)}
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            selectedReport?.reportId === report.reportId
                              ? 'bg-neon-yellow/10 border border-neon-yellow/50'
                              : 'bg-space-700/30 border border-transparent hover:bg-space-700/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-orbitron font-bold ${grade.color}`}>
                              {grade.grade}
                            </span>
                            <span className="font-mono text-sm text-white">
                              {report.totalScore}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatDate(report.createdAt)}
                          </div>
                          <div className="text-xs text-gray-500">
                            时长: {formatTime(report.gameSummary.duration)}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(report.reportId);
                            }}
                            className="mt-2 w-full py-1 text-xs text-neon-red/70 hover:text-neon-red border border-neon-red/30 rounded hover:bg-neon-red/10 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 size={12} />
                            删除
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              {selectedReport ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="panel-glass p-6 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <h2 className="font-orbitron text-2xl text-white mb-2">飞行报告</h2>
                    <p className="text-gray-400 mb-4">
                      报告ID: {selectedReport.reportId} | 生成时间: {formatDate(selectedReport.createdAt)}
                    </p>
                    <div className="flex items-center justify-center gap-8">
                      <div>
                        <div className="text-xs text-gray-400 mb-1">评级</div>
                        <div className={`text-6xl font-orbitron font-bold ${getScoreGrade(selectedReport.totalScore).color}`}>
                          {getScoreGrade(selectedReport.totalScore).grade}
                        </div>
                      </div>
                      <div className="w-px h-24 bg-space-600" />
                      <div>
                        <div className="text-xs text-gray-400 mb-1">总分</div>
                        <div className="text-6xl font-mono font-bold text-neon-cyan">
                          {selectedReport.totalScore}
                        </div>
                      </div>
                      <div className="w-px h-24 bg-space-600" />
                      <div>
                        <div className="text-xs text-gray-400 mb-1">飞行时长</div>
                        <div className="text-3xl font-mono text-white">
                          {formatTime(selectedReport.gameSummary.duration)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="panel-glass p-4">
                      <h4 className="font-orbitron text-sm text-neon-cyan mb-3">最终仓位</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">类型</span>
                          <span className={selectedReport.gameSummary.finalPosition.type === 'call' ? 'text-neon-green' : 'text-neon-red'}>
                            {selectedReport.gameSummary.finalPosition.type === 'call' ? '看涨 Call' : '看跌 Put'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">行权价</span>
                          <span className="font-mono text-white">
                            ${selectedReport.gameSummary.finalPosition.strike.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">标的价</span>
                          <span className="font-mono text-white">
                            ${selectedReport.gameSummary.finalPosition.underlying.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">数量</span>
                          <span className="font-mono text-white">
                            {selectedReport.gameSummary.finalPosition.quantity} 张
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="panel-glass-green p-4">
                      <h4 className="font-orbitron text-sm text-neon-green mb-3 flex items-center gap-2">
                        <TrendingUp size={16} />
                        奖励项
                      </h4>
                      <div className="mb-2">
                        <span className="text-2xl font-mono text-neon-green font-bold">
                          +{selectedReport.bonuses.reduce((s, b) => s + b.points, 0)}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          ({selectedReport.bonuses.length}项)
                        </span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedReport.bonuses.length === 0 ? (
                          <div className="text-xs text-gray-500">暂无奖励</div>
                        ) : (
                          selectedReport.bonuses.slice(0, 5).map((bonus) => (
                            <div key={bonus.id} className="text-xs flex justify-between">
                              <span className="text-gray-300 truncate">{bonus.reason}</span>
                              <span className="text-neon-green font-mono ml-2">+{bonus.points}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="panel-glass-red p-4">
                      <h4 className="font-orbitron text-sm text-neon-red mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} />
                        扣分项
                      </h4>
                      <div className="mb-2">
                        <span className="text-2xl font-mono text-neon-red font-bold">
                          -{selectedReport.deductions.reduce((s, d) => s + d.points, 0)}
                        </span>
                        <span className="text-sm text-gray-400 ml-2">
                          ({selectedReport.deductions.length}项)
                        </span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {selectedReport.deductions.length === 0 ? (
                          <div className="text-xs text-gray-500">太棒了！没有扣分</div>
                        ) : (
                          selectedReport.deductions.slice(0, 5).map((deduction) => (
                            <div key={deduction.id} className="text-xs flex justify-between">
                              <span className="text-gray-300 truncate">{deduction.reason}</span>
                              <span className="text-neon-red font-mono ml-2">-{deduction.points}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="panel-glass p-6">
                    <h4 className="font-orbitron text-sm text-neon-cyan mb-4">事件时间线</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {selectedReport.timeline.map((item) => (
                        <div
                          key={item.id}
                          className={`relative pl-6 py-2 border-l-2 ${
                            item.color.includes('red') ? 'border-neon-red/50' :
                            item.color.includes('yellow') ? 'border-neon-yellow/50' :
                            item.color.includes('green') ? 'border-neon-green/50' :
                            'border-neon-cyan/50'
                          }`}
                        >
                          <div
                            className={`absolute left-0 top-3 w-2 h-2 rounded-full -translate-x-[5px] ${
                              item.color.includes('red') ? 'bg-neon-red' :
                              item.color.includes('yellow') ? 'bg-neon-yellow' :
                              item.color.includes('green') ? 'bg-neon-green' :
                              'bg-neon-cyan'
                            }`}
                          />
                          <div className="flex items-start gap-3">
                            <span className="font-mono text-xs text-gray-500 whitespace-nowrap">
                              {formatTime(item.timestamp)}
                            </span>
                            <div>
                              <div className={item.color}>{item.label}</div>
                              {item.delayed && item.actualArrivalTime && (
                                <div className="text-xs text-neon-purple mt-1">
                                  ⏱️ 延迟 {(item.actualArrivalTime - item.timestamp).toFixed(0)} 秒到达
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel-glass p-6">
                    <h4 className="font-orbitron text-sm text-neon-yellow mb-4">结算口径说明</h4>
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-space-900/50 p-4 rounded-lg border border-neon-yellow/20 overflow-x-auto">
                      {selectedReport.settlementRules}
                    </pre>
                  </div>

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={handleCopy}
                      className={`btn-neon-green px-8 py-3 font-orbitron flex items-center gap-2 ${
                        copied ? 'bg-neon-green/20' : ''
                      }`}
                    >
                      {copied ? <CheckCircle size={20} /> : <Copy size={20} />}
                      {copied ? '已复制到剪贴板' : '复制全文'}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="btn-neon px-8 py-3 font-orbitron flex items-center gap-2"
                    >
                      <Download size={20} />
                      下载文本文件
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="panel-glass p-12 text-center">
                  <FileText className="mx-auto mb-4 text-gray-500" size={64} />
                  <h3 className="font-orbitron text-xl text-gray-400 mb-2">请选择一份飞行报告</h3>
                  <p className="text-gray-500 mb-6">从左侧列表选择，或先完成一局游戏生成新报告</p>
                  <button
                    onClick={() => navigate('/')}
                    className="btn-neon-green px-6 py-2"
                  >
                    开始游戏
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
