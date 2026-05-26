import React from 'react';
import { Trophy, Target, AlertTriangle, Clock, RefreshCw, Download, RotateCcw, Home } from 'lucide-react';
import type { GameRecord } from '@/types';
import { getGrade, formatTimeLong } from '@/utils/helpers';
import { downloadGameRecord } from '@/utils/dataManager';
import { useNavigate } from 'react-router-dom';

interface ScoreOverviewProps {
  record: GameRecord;
  onRestart: () => void;
}

export const ScoreOverview: React.FC<ScoreOverviewProps> = ({ record, onRestart }) => {
  const navigate = useNavigate();
  const { grade, color } = getGrade(record.totalScore, record.maxScore);
  const accuracy = record.maxScore > 0 ? Math.round((record.totalScore / record.maxScore) * 100) : 0;

  const handleExport = (format: 'json' | 'csv') => {
    downloadGameRecord(record, format);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 text-center">
        <Trophy size={64} className="mx-auto mb-4 text-yellow-300" />
        <h2 className="text-2xl font-bold mb-2">培训完成</h2>
        <p className="text-blue-100">以下是您的分诊成绩</p>
      </div>

      <div className="p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 mb-4">
            <span className={`text-6xl font-bold ${color}`}>{grade}</span>
          </div>
          <div className="text-4xl font-bold text-gray-800 mb-2">
            {record.totalScore} <span className="text-xl text-gray-400">/ {record.maxScore}</span>
          </div>
          <div className="text-lg text-gray-500">
            准确率 <span className="font-semibold text-blue-600">{accuracy}%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <Target className="text-blue-500 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-gray-800">{record.totalScore}</p>
            <p className="text-sm text-gray-500">总得分</p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 text-center">
            <AlertTriangle className="text-red-500 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-gray-800">{record.criticalMissCount}</p>
            <p className="text-sm text-gray-500">危重漏分</p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 text-center">
            <Clock className="text-yellow-500 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-gray-800">{record.timeoutCount}</p>
            <p className="text-sm text-gray-500">超时次数</p>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <RefreshCw className="text-purple-500 mx-auto mb-2" size={24} />
            <p className="text-2xl font-bold text-gray-800">{record.reEvaluateCount}</p>
            <p className="text-sm text-gray-500">复评次数</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <h3 className="font-semibold text-gray-800 mb-3">培训详情</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">开始时间：</span>
              <span className="text-gray-800">{new Date(record.startTime).toLocaleString('zh-CN')}</span>
            </div>
            <div>
              <span className="text-gray-500">结束时间：</span>
              <span className="text-gray-800">{new Date(record.endTime).toLocaleString('zh-CN')}</span>
            </div>
            <div>
              <span className="text-gray-500">总时长：</span>
              <span className="text-gray-800">{formatTimeLong((record.endTime - record.startTime) / 1000)}</span>
            </div>
            <div>
              <span className="text-gray-500">处理患者：</span>
              <span className="text-gray-800">{record.patientSnapshots.filter(p => p.status === 'completed').length} 人</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            <RotateCcw size={18} />
            再来一局
          </button>
          
          <button
            onClick={() => handleExport('json')}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            导出JSON
          </button>
          
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} />
            导出CSV
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <Home size={18} />
            返回首页
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScoreOverview;
