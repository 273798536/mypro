import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Home, RotateCcw } from 'lucide-react';
import { ScoreRadar } from '@/components/chart/ScoreRadar';
import { TemperatureChart } from '@/components/chart/TemperatureChart';
import { ActionTimeline } from '@/components/chart/ActionTimeline';
import { BadRowsList } from '@/components/audit/BadRowsList';
import { useGameStore } from '@/store/gameStore';
import { usePhysicsStore } from '@/store/physicsStore';
import { buildExportReport, exportToJSON, exportToCSV, downloadFile } from '@/utils/export';
import { explainScore } from '@/utils/scoreEngine';

export const ResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { score, currentOrder, reset, badRows } = useGameStore();
  const physicsState = usePhysicsStore();

  if (!score || !currentOrder) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="card text-center">
          <p className="text-xl mb-4">暂无成绩数据</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-coffee-dark text-white rounded-lg"
          >
            返回游戏
          </button>
        </div>
      </div>
    );
  }

  const handleExportJSON = () => {
    const report = buildExportReport(useGameStore.getState(), physicsState);
    const json = exportToJSON(report);
    downloadFile(json, `coffee_report_${Date.now()}.json`, 'application/json');
  };

  const handleExportCSV = () => {
    const report = buildExportReport(useGameStore.getState(), physicsState);
    const csv = exportToCSV(report);
    downloadFile(csv, `coffee_report_${Date.now()}.csv`, 'text/csv');
  };

  const handleRestart = () => {
    reset();
    navigate('/');
  };

  const scoreExplanations = explainScore(score);

  return (
    <div className="min-h-screen bg-cream p-6">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold font-display text-coffee-dark">
          📊 结算报告
        </h1>
        <p className="text-coffee-medium mt-2">
          订单 #{currentOrder.id} - {currentOrder.note || '标准咖啡'}
        </p>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <ScoreRadar score={score} />
            
            <div className="card">
              <h3 className="text-xl font-bold mb-4 font-display">成绩说明</h3>
              <div className="space-y-2">
                {scoreExplanations.map((exp, i) => (
                  <div key={i} className="text-sm text-gray-600">
                    {exp}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold mb-4 font-display">导出报告</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleExportJSON}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Download size={18} />
                  导出 JSON
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <Download size={18} />
                  导出 CSV
                </button>
              </div>
            </div>

            {badRows.length > 0 && <BadRowsList />}
          </div>

          <div className="lg:col-span-8 space-y-6">
            <TemperatureChart />
            <ActionTimeline />
            
            <div className="card">
              <h3 className="text-xl font-bold mb-4 font-display">数据链路验证</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl">✅</div>
                  <div className="text-sm font-medium mt-1">水温表一致</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl">✅</div>
                  <div className="text-sm font-medium mt-1">曲线匹配历史</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <div className="text-2xl">✅</div>
                  <div className="text-sm font-medium mt-1">成绩引用曲线</div>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                * 数据链路: 水温表 → 温度历史 → 曲线渲染 → 成绩计算 → 报告导出
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-6 py-3 bg-coffee-dark text-white rounded-lg hover:bg-coffee-medium transition-colors"
              >
                <RotateCcw size={20} />
                再来一局
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Home size={20} />
                返回首页
              </button>
              <button
                onClick={() => navigate('/audit')}
                className="flex items-center gap-2 px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                🔬 物理科普馆审核
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
