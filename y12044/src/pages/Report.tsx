import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Download, AlertTriangle, CheckCircle, Lightbulb, Target, TrendingUp } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { anomalyTypeLabels, anomalyExplanations } from '../data/initialState';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Report: React.FC = () => {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const { totalScore, maxRounds, roundHistory, anomalies, resources, resetGame } = useGameStore();

  const pipeDisconnectAnomalies = anomalies.filter(a => a.type === 'pipe_disconnect');
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  const totalActions = roundHistory.reduce((sum, r) => sum + r.actions.length, 0);
  const totalConflicts = roundHistory.reduce((sum, r) => sum + r.conflicts.length, 0);

  const getGrade = (score: number) => {
    if (score >= 400) return { grade: 'S', color: 'text-yellow-400', label: '卓越' };
    if (score >= 300) return { grade: 'A', color: 'text-green-400', label: '优秀' };
    if (score >= 200) return { grade: 'B', color: 'text-blue-400', label: '良好' };
    if (score >= 100) return { grade: 'C', color: 'text-yellow-400', label: '及格' };
    return { grade: 'D', color: 'text-red-400', label: '需要努力' };
  };

  const gradeInfo = getGrade(totalScore);

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#0A1628',
        scale: 2,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('火星基地水循环-报告.pdf');
    } catch (error) {
      console.error('PDF导出失败:', error);
      alert('PDF导出失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-space-900">
      <header className="bg-space-800/80 backdrop-blur-sm border-b border-tech-400/20 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-space-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-400" />
            </button>
            <div>
              <h1 className="font-orbitron text-xl font-bold text-tech-400">
                最终报告
              </h1>
              <p className="text-xs text-gray-400">非技术同事也能看懂的游戏总结</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-tech-500 text-white rounded-lg hover:bg-tech-400 transition-colors text-sm"
            >
              <Download size={16} />
              <span>导出PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-8">
        <div ref={reportRef} className="space-y-6">
          <div className="bg-space-800 rounded-2xl p-8 glow-border text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-space-700 rounded-full mb-4">
              <Trophy className="text-yellow-400" size={48} />
            </div>
            <div className={`font-orbitron text-8xl font-bold ${gradeInfo.color} mb-2`}>
              {gradeInfo.grade}
            </div>
            <div className="text-2xl text-gray-300 mb-1">{gradeInfo.label}</div>
            <div className="font-orbitron text-4xl font-bold text-yellow-400 mb-4">
              {totalScore} 分
            </div>
            <p className="text-gray-400">
              完成 {roundHistory.length}/{maxRounds} 回合 · 执行 {totalActions} 次操作
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-space-800 rounded-xl p-5 glow-border text-center">
              <div className="text-3xl mb-2">💧</div>
              <div className="font-orbitron text-2xl font-bold text-blue-400">
                {resources.water}
              </div>
              <div className="text-sm text-gray-400">最终储水量 (L)</div>
            </div>
            <div className="bg-space-800 rounded-xl p-5 glow-border text-center">
              <div className="text-3xl mb-2">❄️</div>
              <div className="font-orbitron text-2xl font-bold text-cyan-400">
                {resources.ice}
              </div>
              <div className="text-sm text-gray-400">最终冰储量 (kg)</div>
            </div>
            <div className="bg-space-800 rounded-xl p-5 glow-border text-center">
              <div className="text-3xl mb-2">🌱</div>
              <div className="font-orbitron text-2xl font-bold text-green-400">
                {resources.greenhouseHumidity}%
              </div>
              <div className="text-sm text-gray-400">最终温室湿度</div>
            </div>
          </div>

          {anomalies.length > 0 && (
            <div className="bg-space-800 rounded-2xl p-6 glow-border-danger">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/20 rounded-xl">
                  <AlertTriangle className="text-red-400" size={28} />
                </div>
                <div>
                  <h3 className="font-orbitron text-xl font-bold text-red-400">
                    问题汇总
                  </h3>
                  <p className="text-sm text-gray-400">
                    共发生 {anomalies.length} 次异常，其中严重异常 {criticalAnomalies.length} 次
                  </p>
                </div>
              </div>

              {pipeDisconnectAnomalies.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                  <h4 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                    <span>🔌</span>
                    管道断连问题（最关键！）
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="bg-space-700 p-3 rounded-lg">
                      <div className="text-gray-300 font-medium mb-1">👉 发生了什么？</div>
                      <p className="text-gray-400">
                        有 {pipeDisconnectAnomalies.length} 次管道断连，导致部分设备无法供水。
                        断连后这些设备就像被"孤立"了，收不到水也送不出水。
                      </p>
                    </div>
                    <div className="bg-space-700 p-3 rounded-lg">
                      <div className="text-gray-300 font-medium mb-1">🤔 为什么会这样？</div>
                      <p className="text-gray-400">
                        {anomalyExplanations['pipe_disconnect']?.cause}
                        简单说就是：设备健康度太低 → 管道连不上 → 整个管网"断成两节"。
                      </p>
                    </div>
                    <div className="bg-space-700 p-3 rounded-lg">
                      <div className="text-gray-300 font-medium mb-1">💡 怎么改进？</div>
                      <p className="text-green-400">
                        {anomalyExplanations['pipe_disconnect']?.fix}
                        记住：<strong>优先维护管道两头的设备</strong>，别让它们的健康度掉到 50 以下！
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(
                  anomalies.reduce((acc, a) => {
                    acc[a.type] = (acc[a.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type} className="p-4 bg-space-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-300">
                        {anomalyTypeLabels[type]}
                      </span>
                      <span className="text-red-400 font-bold">{count} 次</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {anomalyExplanations[type]?.simple}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalConflicts > 0 && (
            <div className="bg-space-800 rounded-2xl p-6 glow-border-warning">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-yellow-500/20 rounded-xl">
                  <Target className="text-yellow-400" size={28} />
                </div>
                <div>
                  <h3 className="font-orbitron text-xl font-bold text-yellow-400">
                    冲突管理
                  </h3>
                  <p className="text-sm text-gray-400">
                    共处理 {totalConflicts} 次维护冲突
                  </p>
                </div>
              </div>
              <p className="text-gray-300">
                冰矿队和回收队的维护目标有时会冲突。记住：
                <span className="text-tech-400 font-medium"> 没有"正确答案"，只有"当前最优解"</span>。
                选择方案前想想：现在最缺的是什么？是冰还是回收能力？
              </p>
            </div>
          )}

          <div className="bg-space-800 rounded-2xl p-6 glow-border">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <Lightbulb className="text-green-400" size={28} />
              </div>
              <div>
                <h3 className="font-orbitron text-xl font-bold text-green-400">
                  学习要点
                </h3>
                <p className="text-sm text-gray-400">这堂课你学到了什么？</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-space-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="font-medium">管网是一个整体</span>
                </div>
                <p className="text-sm text-gray-400">
                  一个设备坏了，可能影响一大片。就像水管坏了，整条线都没水。
                </p>
              </div>
              <div className="p-4 bg-space-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="font-medium">预防胜于补救</span>
                </div>
                <p className="text-sm text-gray-400">
                  定期维护比出了问题再修更划算。健康度掉得快，涨得慢！
                </p>
              </div>
              <div className="p-4 bg-space-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="font-medium">团队协作很重要</span>
                </div>
                <p className="text-sm text-gray-400">
                  冰矿队和回收队需要沟通。各干各的容易冲突，资源就浪费了。
                </p>
              </div>
              <div className="p-4 bg-space-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="text-green-400" size={20} />
                  <span className="font-medium">数据会说话</span>
                </div>
                <p className="text-sm text-gray-400">
                  多看看状态面板，异常要及时处理。漏掉一个小问题，后面就是大麻烦！
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-mars-500/20 to-tech-500/20 rounded-2xl p-6 border border-mars-500/30">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="text-mars-400" size={28} />
              <h3 className="font-orbitron text-xl font-bold text-mars-400">
                下一次挑战目标
              </h3>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-mars-400">🎯</span>
                零管道断连记录
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mars-400">🎯</span>
                总分达到 300+ 分（A级）
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mars-400">🎯</span>
                温室湿度始终保持在 50% 以上
              </li>
              <li className="flex items-center gap-2">
                <span className="text-mars-400">🎯</span>
                冲突解决正确率 100%（选对更重要的那个方案）
              </li>
            </ul>
          </div>

          <div className="text-center text-sm text-gray-500 pt-4">
            <p>🚀 火星基地水循环模拟系统 · 科学课堂版</p>
            <p className="mt-1">生成时间：{new Date().toLocaleString('zh-CN')}</p>
          </div>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate('/review')}
            className="px-6 py-3 bg-space-700 text-gray-300 rounded-xl hover:bg-space-600 transition-colors"
          >
            查看详细复盘
          </button>
          <button
            onClick={() => {
              resetGame();
              navigate('/');
            }}
            className="px-6 py-3 bg-gradient-to-r from-mars-500 to-mars-400 text-white font-bold rounded-xl hover:from-mars-400 hover:to-mars-500 transition-all"
          >
            再玩一次
          </button>
        </div>
      </main>
    </div>
  );
};

export default Report;
