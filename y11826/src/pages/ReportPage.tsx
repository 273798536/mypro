import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { ReportData } from '../types';

export default function ReportPage() {
  const navigate = useNavigate();
  const generateReport = useGameStore(state => state.generateReport);
  const resetGame = useGameStore(state => state.resetGame);
  const gamePhase = useGameStore(state => state.gamePhase);

  const [report, setReport] = useState<ReportData | null>(null);

  useEffect(() => {
    if (gamePhase !== 'ended') {
      navigate('/');
      return;
    }
    setReport(generateReport());
  }, [gamePhase, navigate, generateReport]);

  const handleRestart = () => {
    resetGame();
    navigate('/');
  };

  const handleExport = () => {
    if (!report) return;

    const exportData = {
      report,
      exportTime: new Date().toISOString(),
      game: '城市公交调度棋',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `公交调度报告-${new Date().toLocaleDateString('zh-CN')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) return null;

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className={`text-center py-12 rounded-2xl mb-8 ${
          report.isWin
            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
            : 'bg-gradient-to-r from-orange-400 to-red-500'
        }`}>
          <div className="text-6xl mb-4">
            {report.isWin ? '🎉' : '⚠️'}
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            {report.isWin ? '调度成功！' : '需要改进'}
          </h1>
          <p className="text-white text-opacity-90">
            {report.isWin ? '您的调度策略有效控制了早高峰局面' : '部分指标未达标，请查看改进建议'}
          </p>
          <div className="mt-6 text-7xl font-bold text-white">
            {report.finalScore}
            <span className="text-2xl ml-2">分</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="font-bold text-gray-800 mb-1">客流疏导率</h3>
            <div className="text-3xl font-bold text-traffic-blue">
              {(report.passengerFlowRate * 100).toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-traffic-blue transition-all"
                style={{ width: `${report.passengerFlowRate * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-4xl mb-2">⏱️</div>
            <h3 className="font-bold text-gray-800 mb-1">班次准点率</h3>
            <div className="text-3xl font-bold text-safe-green">
              {(report.onTimeRate * 100).toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-safe-green transition-all"
                style={{ width: `${report.onTimeRate * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="text-4xl mb-2">✅</div>
            <h3 className="font-bold text-gray-800 mb-1">异常处理率</h3>
            <div className="text-3xl font-bold text-warning-orange">
              {(report.anomalyResolutionRate * 100).toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-warning-orange transition-all"
                style={{ width: `${report.anomalyResolutionRate * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        {report.suggestions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">📋 改进建议</h2>
            <div className="space-y-3">
              {report.suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200"
                >
                  <span className="text-xl">💡</span>
                  <p className="text-gray-700">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {report.anomalies.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🚨 异常记录 ({report.anomalies.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">类型</th>
                    <th className="text-left py-2 px-3">描述</th>
                    <th className="text-left py-2 px-3">责任人</th>
                    <th className="text-left py-2 px-3">发现回合</th>
                    <th className="text-left py-2 px-3">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {report.anomalies.map(anomaly => (
                    <tr key={anomaly.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          anomaly.type === 'clustering' ? 'bg-blue-100 text-blue-700' :
                          anomaly.type === 'overtime' ? 'bg-orange-100 text-orange-700' :
                          anomaly.type === 'transfer_gap' ? 'bg-purple-100 text-purple-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {anomaly.type === 'clustering' ? '车辆扎堆' :
                           anomaly.type === 'overtime' ? '司机超时' :
                           anomaly.type === 'transfer_gap' ? '换乘断档' : '站点超载'}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-xs truncate">{anomaly.description}</td>
                      <td className="py-2 px-3">{anomaly.responsibleRole}</td>
                      <td className="py-2 px-3">第 {anomaly.roundDetected} 回合</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          anomaly.resolved
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {anomaly.resolved ? '已处理' : '未处理'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report.decisions.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📝 调度决策记录 ({report.decisions.length})
            </h2>
            <div className="space-y-2">
              {report.decisions.map(decision => (
                <div
                  key={decision.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {decision.type === 'dispatch' ? '🚀' :
                       decision.type === 'reroute' ? '🔄' :
                       decision.type === 'hold' ? '⏸️' : '☕'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{decision.description}</p>
                      <p className="text-xs text-gray-500">车辆: {decision.busId}</p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    第 {decision.round} 回合
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRestart}
            className="px-8 py-3 bg-traffic-blue text-white font-bold rounded-xl hover:bg-blue-600 transition-all hover:scale-105 shadow-lg"
          >
            🔄 重新开始
          </button>
          <button
            onClick={handleExport}
            className="px-8 py-3 bg-white text-traffic-blue font-bold rounded-xl border-2 border-traffic-blue hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
          >
            📥 导出报告
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-all hover:scale-105 shadow-lg"
          >
            🏠 返回首页
          </button>
        </div>
      </div>
    </div>
  );
}
