import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Home, Download, CheckCircle, XCircle, AlertTriangle, Clock, Zap, TrendingUp, Award } from 'lucide-react';
import { InspectionReport } from '../types';
import { formatTime, exportToJSON, exportToCSV, getRatingColor, calculateRating } from '../utils/helpers';

export const ReportScreen = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'unhandled' | 'corrected' | 'confirm' | 'operations'>('overview');

  useEffect(() => {
    const saved = localStorage.getItem('lastReport');
    if (saved) {
      setReport(JSON.parse(saved));
    }
  }, []);

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">
          <p>暂无报告数据</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const rating = calculateRating(report.totalScore);
  const ratingColor = getRatingColor(rating);

  const handleExportJSON = () => {
    exportToJSON(report);
  };

  const handleExportCSV = () => {
    exportToCSV(report);
  };

  const tabs = [
    { id: 'overview', label: '概览', icon: TrendingUp },
    { id: 'unhandled', label: `未处理 (${report.unhandledItems.length})`, icon: XCircle },
    { id: 'corrected', label: `已修正 (${report.correctedItems.length})`, icon: CheckCircle },
    { id: 'confirm', label: `待确认 (${report.needConfirmItems.length})`, icon: AlertTriangle },
    { id: 'operations', label: `操作日志 (${report.operationLogs.length})`, icon: Clock }
  ] as const;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-400" />
              巡检报告
            </h1>
            <p className="text-slate-400 mt-1">{report.levelName}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 JSON
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 CSV
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Home className="w-4 h-4" />
              返回首页
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 mb-6"
        >
          <div className="grid md:grid-cols-5 gap-6">
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2"
                style={{ backgroundColor: ratingColor + '20', border: `3px solid ${ratingColor}` }}
              >
                <span className="text-3xl font-bold" style={{ color: ratingColor }}>{rating}</span>
              </div>
              <p className="text-sm text-slate-400">综合评级</p>
            </div>
            <div className="text-center">
              <Award className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{report.totalScore}</p>
              <p className="text-sm text-slate-400">总得分</p>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{formatTime(report.endTime - report.startTime)}</p>
              <p className="text-sm text-slate-400">游戏时长</p>
            </div>
            <div className="text-center">
              <Zap className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{Math.round(report.efficiency)}%</p>
              <p className="text-sm text-slate-400">资源利用率</p>
            </div>
            <div className="text-center">
              <TrendingUp className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{report.batteryManagement}%</p>
              <p className="text-sm text-slate-400">电量管理</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden"
        >
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-slate-700/50 text-cyan-400 border-b-2 border-cyan-400'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold mb-4">得分明细</h3>
                  <div className="grid gap-2">
                    {report.scoreBreakdown.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between py-3 px-4 bg-slate-700/30 rounded-lg"
                      >
                        <div>
                          <span className="font-medium">{item.category}</span>
                          <p className="text-sm text-slate-400">{item.description}</p>
                        </div>
                        <span className={`text-lg font-bold ${item.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.points >= 0 ? '+' : ''}{item.points}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'unhandled' && (
              <ReportItemList items={report.unhandledItems} type="unhandled" />
            )}

            {activeTab === 'corrected' && (
              <ReportItemList items={report.correctedItems} type="corrected" />
            )}

            {activeTab === 'confirm' && (
              <ReportItemList items={report.needConfirmItems} type="confirm" />
            )}

            {activeTab === 'operations' && (
              <div className="space-y-3">
                {report.operationLogs.map((op, index) => (
                  <motion.div
                    key={op.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 bg-slate-700/30 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          op.resourceType === 'drone' ? 'bg-cyan-500/20 text-cyan-400' :
                          op.resourceType === 'cleaner' ? 'bg-green-500/20 text-green-400' :
                          'bg-orange-500/20 text-orange-400'
                        }`}>
                          {op.resourceType === 'drone' ? '无人机' : op.resourceType === 'cleaner' ? '清洗队' : '维修队'}
                        </span>
                        <span className="text-white font-medium">
                          {op.action === 'inspect' ? '巡检' : op.action === 'clean' ? '清洁' : '维修'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          op.result === 'success' ? 'bg-green-500/20 text-green-400' :
                          op.result === 'failed' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {op.result === 'success' ? '成功' : op.result === 'failed' ? '失败' : '进行中'}
                        </span>
                        <span className="text-slate-500 text-sm">{formatTime(op.timestamp)}</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">
                      目标区域: {op.targetAreaId} | 来源: {op.source}
                    </div>
                    {op.corrections && op.corrections.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-700">
                        <p className="text-xs text-orange-400 mb-1">修正记录 ({op.corrections.length}):</p>
                        {op.corrections.map((corr, i) => (
                          <p key={i} className="text-xs text-slate-500">
                            {formatTime(corr.timestamp)} - {corr.reason}: {corr.content}
                          </p>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

interface ReportItemListProps {
  items: any[];
  type: 'unhandled' | 'corrected' | 'confirm';
}

const ReportItemList = ({ items, type }: ReportItemListProps) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        {type === 'unhandled' && <XCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />}
        {type === 'corrected' && <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />}
        {type === 'confirm' && <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />}
        <p>暂无{type === 'unhandled' ? '未处理' : type === 'corrected' ? '已修正' : '待确认'}项</p>
      </div>
    );
  }

  const borderColor = type === 'unhandled' ? 'border-red-500/30' : type === 'corrected' ? 'border-green-500/30' : 'border-yellow-500/30';
  const bgColor = type === 'unhandled' ? 'bg-red-900/10' : type === 'corrected' ? 'bg-green-900/10' : 'bg-yellow-900/10';

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className={`p-4 rounded-lg border ${borderColor} ${bgColor}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  item.priority === 'critical' ? 'bg-red-500/30 text-red-400' :
                  item.priority === 'high' ? 'bg-orange-500/30 text-orange-400' :
                  item.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-400' :
                  'bg-green-500/30 text-green-400'
                }`}>
                  {item.priority === 'critical' ? '紧急' : item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                </span>
                <span className="font-medium text-white">{item.type}</span>
              </div>
              <p className="text-slate-300 mb-2">{item.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span>区域: {item.areaName}</span>
                <span>来源: {item.source}</span>
                <span>发现时间: {formatTime(item.discoveredAt)}</span>
                {item.handler && <span>处理人: {item.handler}</span>}
              </div>
              {item.remarks && (
                <p className="mt-2 text-sm text-cyan-400">备注: {item.remarks}</p>
              )}
            </div>
            {type === 'unhandled' && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
            {type === 'corrected' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
            {type === 'confirm' && <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
