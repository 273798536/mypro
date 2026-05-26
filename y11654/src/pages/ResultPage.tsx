import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Home,
  RotateCcw,
  Download,
  FileText,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useGameStore } from '../store/gameStore';
import { COMMAND_INFO, RISK_INFO, GameSession } from '../types/game';
import { cn } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ResultPage() {
  const navigate = useNavigate();
  const { currentSession, actions, restartGame } = useGameStore();
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  
  const session = currentSession;
  
  const statistics = useMemo(() => {
    if (!session) return null;
    
    const totalActions = actions.length;
    const correctActions = actions.filter(a => a.scoreChange >= 0).length;
    const wrongActions = actions.filter(a => a.scoreChange < 0).length;
    const totalRisks = session.rounds.reduce((acc, r) => acc + r.risks.length, 0);
    const correctlyHandledRisks = session.rounds.reduce(
      (acc, r) => acc + r.risks.filter(risk => risk.handledCorrectly).length, 
      0
    );
    const avgResponseTime = totalRisks > 0 
      ? session.rounds.reduce(
          (acc, r) => acc + r.risks.reduce((a, risk) => a + (risk.responseTime || 0), 0), 
          0
        ) / totalRisks 
      : 0;
    
    const accuracy = totalActions > 0 ? (correctActions / totalActions) * 100 : 0;
    const riskHandlingRate = totalRisks > 0 ? (correctlyHandledRisks / totalRisks) * 100 : 100;
    
    let grade = 'F';
    if (session.finalScore >= 400) grade = 'S';
    else if (session.finalScore >= 300) grade = 'A';
    else if (session.finalScore >= 200) grade = 'B';
    else if (session.finalScore >= 100) grade = 'C';
    else if (session.finalScore >= 50) grade = 'D';
    
    return {
      totalActions,
      correctActions,
      wrongActions,
      totalRisks,
      correctlyHandledRisks,
      avgResponseTime,
      accuracy,
      riskHandlingRate,
      grade,
    };
  }, [session, actions]);
  
  const scoreByRound = useMemo(() => {
    if (!session) return { labels: [], data: [] };
    
    return {
      labels: session.rounds.map((_, i) => `第${i + 1}回合`),
      data: session.rounds.map(round => 
        round.actions.reduce((acc, a) => acc + a.scoreChange, 0)
      ),
    };
  }, [session]);
  
  const riskDistribution = useMemo(() => {
    if (!session) return { labels: [], data: [] };
    
    const counts: Record<string, number> = { overweight: 0, wind: 0, intrusion: 0 };
    session.rounds.forEach(round => {
      round.risks.forEach(risk => {
        counts[risk.type]++;
      });
    });
    
    return {
      labels: Object.keys(counts).map(k => RISK_INFO[k as keyof typeof RISK_INFO]?.name || k),
      data: Object.values(counts),
    };
  }, [session]);
  
  const barChartData = {
    labels: scoreByRound.labels,
    datasets: [
      {
        label: '得分',
        data: scoreByRound.data,
        backgroundColor: scoreByRound.data.map(score => 
          score >= 0 ? 'rgba(39, 174, 96, 0.7)' : 'rgba(231, 76, 60, 0.7)'
        ),
        borderColor: scoreByRound.data.map(score => 
          score >= 0 ? 'rgb(39, 174, 96)' : 'rgb(231, 76, 60)'
        ),
        borderWidth: 1,
      },
    ],
  };
  
  const doughnutChartData = {
    labels: riskDistribution.labels,
    datasets: [
      {
        data: riskDistribution.data,
        backgroundColor: [
          'rgba(231, 76, 60, 0.7)',
          'rgba(243, 156, 18, 0.7)',
          'rgba(52, 152, 219, 0.7)',
        ],
        borderColor: [
          'rgb(231, 76, 60)',
          'rgb(243, 156, 18)',
          'rgb(52, 152, 219)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#94a3b8',
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(148, 163, 184, 0.1)' },
      },
    },
  };
  
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
        },
      },
    },
  };
  
  const exportReport = (format: 'json' | 'csv') => {
    if (!session) return;
    
    const report = {
      reportVersion: '1.0',
      generatedAt: new Date().toISOString(),
      session: {
        id: session.id,
        startTime: new Date(session.startTime).toISOString(),
        endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
        difficulty: session.difficulty,
        finalScore: session.finalScore,
        success: session.success,
        failReason: session.failReason,
        totalRounds: session.totalRounds,
        completedRounds: session.completedRounds,
      },
      statistics,
      actions: actions.map(a => ({
        ...a,
        commandName: COMMAND_INFO[a.command]?.name || a.command,
        timestamp: new Date(a.timestamp).toISOString(),
      })),
      rounds: session.rounds.map(round => ({
        ...round,
        risks: round.risks.map(r => ({
          ...r,
          typeName: RISK_INFO[r.type]?.name || r.type,
        })),
      })),
    };
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'json') {
      content = JSON.stringify(report, null, 2);
      filename = `吊装训练报告_${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = 'application/json';
    } else {
      const headers = ['时间', '回合', '指令', '得分', '原因'];
      const rows = actions.map(a => [
        new Date(a.timestamp).toLocaleString('zh-CN'),
        a.roundNumber.toString(),
        COMMAND_INFO[a.command]?.name || a.command,
        a.scoreChange.toString(),
        a.reason || '',
      ]);
      content = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `吊装训练报告_${new Date().toISOString().slice(0, 10)}.csv`;
      mimeType = 'text/csv';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleRestart = () => {
    restartGame();
    navigate('/game');
  };
  
  if (!session) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-dark-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">暂无训练记录</h2>
          <p className="text-dark-400 mb-6">请先完成一次训练</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-dark-950 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 animate-slide-in">
          <div className={cn(
            "inline-flex items-center justify-center w-24 h-24 rounded-full mb-6",
            session.success ? 'bg-success-500/20' : 'bg-danger-500/20'
          )}>
            {session.success ? (
              <Trophy className="w-12 h-12 text-success-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-danger-500" />
            )}
          </div>
          <h1 className="text-4xl font-industrial font-bold text-white mb-2">
            {session.success ? '训练完成！' : '训练失败'}
          </h1>
          {session.failReason && (
            <p className="text-danger-400 text-lg">失败原因：{session.failReason}</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700 text-center">
            <div className="text-5xl font-industrial font-bold text-primary-500 mb-2">
              {session.finalScore}
            </div>
            <div className="text-dark-400 text-sm">最终得分</div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700 text-center">
            <div className={cn(
              "text-5xl font-industrial font-bold mb-2",
              statistics?.grade === 'S' ? 'text-primary-400' :
              statistics?.grade === 'A' ? 'text-success-500' :
              statistics?.grade === 'B' ? 'text-info-500' :
              statistics?.grade === 'C' ? 'text-primary-500' :
              statistics?.grade === 'D' ? 'text-primary-600' : 'text-danger-500'
            )}>
              {statistics?.grade}
            </div>
            <div className="text-dark-400 text-sm">综合评级</div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700 text-center">
            <div className="text-5xl font-industrial font-bold text-success-500 mb-2">
              {statistics?.accuracy.toFixed(0)}%
            </div>
            <div className="text-dark-400 text-sm">操作准确率</div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-5 border border-dark-700 text-center">
            <div className="text-5xl font-industrial font-bold text-info-500 mb-2">
              {session.completedRounds}/{session.totalRounds}
            </div>
            <div className="text-dark-400 text-sm">完成回合</div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-700">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-info-500" />
              <h3 className="text-lg font-semibold text-white">各回合得分</h3>
            </div>
            <div className="h-64">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-700">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-white">风险类型分布</h3>
            </div>
            <div className="h-64">
              <Doughnut data={doughnutChartData} options={doughnutOptions} />
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-4 border border-dark-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-success-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics?.correctActions || 0}</div>
              <div className="text-dark-400 text-sm">正确操作</div>
            </div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-4 border border-dark-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-danger-500/20 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-danger-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics?.wrongActions || 0}</div>
              <div className="text-dark-400 text-sm">错误操作</div>
            </div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-4 border border-dark-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics?.totalRisks || 0}</div>
              <div className="text-dark-400 text-sm">风险事件</div>
            </div>
          </div>
          
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-4 border border-dark-700 flex items-center gap-4">
            <div className="w-12 h-12 bg-info-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-info-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{statistics?.avgResponseTime.toFixed(1) || 0}s</div>
              <div className="text-dark-400 text-sm">平均响应时间</div>
            </div>
          </div>
        </div>
        
        <div className="bg-dark-800/80 backdrop-blur-sm rounded-xl p-6 border border-dark-700 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-semibold text-white">操作明细</h3>
            </div>
            <span className="text-sm text-dark-400">{actions.length} 条记录</span>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {actions.map((action) => (
              <div key={action.id}>
                <button
                  onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                  className="w-full flex items-center justify-between p-3 bg-dark-700/50 hover:bg-dark-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      action.scoreChange >= 0 ? 'bg-success-500/20' : 'bg-danger-500/20'
                    )}>
                      {action.scoreChange >= 0 ? (
                        <CheckCircle className="w-4 h-4 text-success-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger-500" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-white font-medium">
                        {COMMAND_INFO[action.command]?.name || action.command}
                      </div>
                      <div className="text-dark-400 text-xs">
                        第{action.roundNumber}回合 · {new Date(action.timestamp).toLocaleTimeString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-bold",
                      action.scoreChange >= 0 ? 'text-success-500' : 'text-danger-500'
                    )}>
                      {action.scoreChange >= 0 ? '+' : ''}{action.scoreChange}
                    </span>
                    {expandedAction === action.id ? (
                      <ChevronUp className="w-4 h-4 text-dark-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-dark-400" />
                    )}
                  </div>
                </button>
                
                {expandedAction === action.id && action.reason && (
                  <div className="ml-11 mt-1 p-2 bg-dark-900/50 rounded text-sm text-dark-300">
                    {action.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors"
          >
            <Home className="w-5 h-5" />
            返回首页
          </button>
          
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            再来一次
          </button>
          
          <button
            onClick={() => exportReport('json')}
            className="flex items-center gap-2 px-6 py-3 bg-info-500 hover:bg-info-600 text-white rounded-xl transition-colors"
          >
            <Download className="w-5 h-5" />
            导出 JSON
          </button>
          
          <button
            onClick={() => exportReport('csv')}
            className="flex items-center gap-2 px-6 py-3 bg-success-500 hover:bg-success-600 text-white rounded-xl transition-colors"
          >
            <Download className="w-5 h-5" />
            导出 CSV
          </button>
        </div>
        
        <div className="mt-8 text-center text-dark-500 text-sm">
          <p>材料来源：塔吊操作规程 | 吊装安全规范 | 气象作业标准 | 现场安全管理</p>
        </div>
      </div>
    </div>
  );
}
