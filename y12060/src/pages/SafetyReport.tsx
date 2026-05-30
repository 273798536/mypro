import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, RotateCcw, Download, FileText, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Copy, Share2 } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { SHELF_LAYOUTS } from '../config/shelves';
import { GAME_MODES, DIFFICULTY_CONFIG } from '../config/levels';
import { formatTime } from '../utils/collision';
import { explainConflictInPlainChinese, getImprovementSuggestions } from '../utils/conflictCheck';
import { exportReportAsText, downloadReport, exportReportAsPDF, ReportData } from '../utils/exportReport';
import { ConflictAlert } from '../components/ConflictAlert';
import { ViolationCard } from '../components/ViolationCard';

export function SafetyReport() {
  const navigate = useNavigate();
  const session = useGameStore(state => state.session);
  const resetSession = useGameStore(state => state.resetSession);
  const restartGame = useGameStore(state => state.restartGame);
  
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const shelves = SHELF_LAYOUTS[session.selectedShelfConfig] || [];
  const violations = session.violations;
  
  const shelfViolations = violations.filter(v => v.type === 'shelf');
  const overheightViolations = violations.filter(v => v.type === 'overheight');
  const blindzoneViolations = violations.filter(v => v.type === 'blindzone');
  
  const scorePercentage = session.score.maxPossible > 0 
    ? (session.score.total / session.score.maxPossible) * 100 
    : 0;
  
  const getGrade = () => {
    if (scorePercentage >= 90) return { grade: 'S', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500', label: '优秀' };
    if (scorePercentage >= 80) return { grade: 'A', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500', label: '良好' };
    if (scorePercentage >= 70) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500', label: '合格' };
    if (scorePercentage >= 60) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500', label: '需改进' };
    return { grade: 'D', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500', label: '不合格' };
  };
  
  const gradeInfo = getGrade();
  const modeInfo = GAME_MODES.find(m => m.id === session.mode);
  const difficultyConfig = DIFFICULTY_CONFIG[session.difficulty];
  
  const actualDuration = session.startTime && session.endTime 
    ? session.endTime - session.startTime - session.totalPauseDuration 
    : 0;
  
  const reportData: ReportData = {
    session,
    forklift: session.selectedForklift,
    shelves,
    conflicts: session.conflicts
  };
  
  const improvementSuggestions = getImprovementSuggestions(session.conflicts);
  
  useEffect(() => {
    if (session.status !== 'finished' || !session.selectedForklift) {
      navigate('/');
    }
  }, [session.status, session.selectedForklift, navigate]);
  
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };
  
  const handleCopyReport = async () => {
    const text = exportReportAsText(reportData);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };
  
  const handleDownloadTxt = () => {
    const filename = `叉车安全培训报告_${session.id}_${new Date().toISOString().split('T')[0]}.txt`;
    downloadReport(reportData, filename);
  };
  
  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const filename = `叉车安全培训报告_${session.id}_${new Date().toISOString().split('T')[0]}.pdf`;
      await exportReportAsPDF(reportData, filename);
    } catch (error) {
      console.error('PDF导出失败:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  const handleRestart = () => {
    restartGame();
    navigate('/game');
  };
  
  const handleBackToMenu = () => {
    resetSession();
    navigate('/');
  };
  
  const explainShelfCollision = (violation: any) => {
    const speed = violation.speed;
    if (speed < 3) {
      return '低速碰撞，主要是操作精准度问题。建议在练习时多注意观察车辆与货架的距离，培养空间感。';
    } else if (speed < 8) {
      return '中速碰撞，说明观察不够仔细。建议养成"瞭望-判断-操作"的习惯，不要急于转向。';
    } else {
      return '高速碰撞！这是严重的安全隐患。速度太快导致遇到情况来不及反应，必须立即纠正"求快"的心态。';
    }
  };
  
  if (!session.selectedForklift) return null;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
              安全培训评估报告
            </h1>
            <p className="text-gray-400 text-sm">
              报告编号: {session.id} · 生成于 {new Date().toLocaleString('zh-CN')}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              title="复制报告文本"
            >
              {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制'}
            </button>
            
            <button
              onClick={handleDownloadTxt}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              title="下载TXT格式"
            >
              <FileText className="w-4 h-4" />
              TXT
            </button>
            
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
              title="下载PDF格式"
            >
              <Download className="w-4 h-4" />
              {isExporting ? '导出中...' : 'PDF'}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className={`rounded-2xl border ${gradeInfo.border} overflow-hidden`}>
            <button
              onClick={() => toggleSection('summary')}
              className={`w-full flex items-center justify-between p-6 ${gradeInfo.bg} transition-colors`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${gradeInfo.bg} border-2 ${gradeInfo.border} flex items-center justify-center`}>
                  <span className={`text-3xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold">一、综合评估</h2>
                  <p className={gradeInfo.color}>评级: {gradeInfo.label}</p>
                </div>
              </div>
              {expandedSection === 'summary' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
            
            {expandedSection === 'summary' && (
              <div className="p-6 bg-gray-800/50 border-t border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-gray-900/50 rounded-xl">
                    <div className="text-3xl font-bold text-orange-400">{session.score.total}</div>
                    <div className="text-sm text-gray-400">最终得分</div>
                    <div className="text-xs text-gray-500">/ {session.score.maxPossible}</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-900/50 rounded-xl">
                    <div className="text-3xl font-bold text-green-400">{formatTime(actualDuration)}</div>
                    <div className="text-sm text-gray-400">完成用时</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-900/50 rounded-xl">
                    <div className="text-3xl font-bold text-red-400">{violations.length}</div>
                    <div className="text-sm text-gray-400">违规次数</div>
                  </div>
                  
                  <div className="text-center p-4 bg-gray-900/50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-400">{session.conflicts.length}</div>
                    <div className="text-sm text-gray-400">配置冲突</div>
                  </div>
                </div>
                
                <div className="bg-gray-900/50 rounded-xl p-4">
                  <h3 className="font-bold mb-3">基本信息</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">训练模式:</span>
                      <span className="ml-2 text-white">{modeInfo?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">难度等级:</span>
                      <span className="ml-2 text-white">{difficultyConfig.label}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">使用叉车:</span>
                      <span className="ml-2 text-white">{session.selectedForklift.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">维护人:</span>
                      <span className="ml-2 text-white">{session.selectedForklift.maintainer}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('violations')}
              className="w-full flex items-center justify-between p-6 transition-colors hover:bg-gray-700/30"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full ${shelfViolations.length > 0 ? 'bg-red-500/20' : 'bg-green-500/20'} flex items-center justify-center`}>
                  {shelfViolations.length > 0 ? (
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  ) : (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  )}
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold">二、违规记录分析</h2>
                  <p className="text-gray-400">
                    货架碰撞 {shelfViolations.length} 次 · 超高装载 {overheightViolations.length} 次 · 盲区穿行 {blindzoneViolations.length} 次
                  </p>
                </div>
              </div>
              {expandedSection === 'violations' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
            
            {expandedSection === 'violations' && (
              <div className="p-6 bg-gray-800/30 border-t border-gray-700">
                {violations.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                    <h3 className="text-xl font-bold text-green-400 mb-2">零违规！</h3>
                    <p className="text-gray-400">太棒了！本次训练没有发生任何违规行为，继续保持！</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {shelfViolations.length > 0 && (
                      <div>
                        <h3 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          货架碰撞问题 ({shelfViolations.length} 次，扣分 {session.score.collisionPenalties})
                        </h3>
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                          <p className="text-sm text-gray-300">
                            <strong>问题分析:</strong> 货架碰撞通常是因为转弯时速度过快、观察不仔细，或者对车辆尺寸判断不准确。
                            每一次碰撞都可能造成货物损坏、货架变形，严重时甚至会导致货架坍塌。
                          </p>
                        </div>
                        <div className="space-y-3">
                          {shelfViolations.map((v, i) => (
                            <div key={v.id} className="bg-gray-900/50 rounded-xl p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-red-400 font-bold">碰撞 #{i + 1}</span>
                                  <span className="text-gray-500 text-sm ml-3">{formatTime(v.timestamp)}</span>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  v.severity === 'severe' ? 'bg-red-500/20 text-red-400' :
                                  v.severity === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {v.severity === 'severe' ? '严重' : v.severity === 'moderate' ? '中等' : '轻微'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-2">
                                <div>
                                  <span className="text-gray-500">位置:</span>
                                  <span className="text-white ml-1">({v.position.x.toFixed(1)}, {v.position.z.toFixed(1)})</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">速度:</span>
                                  <span className={`ml-1 ${v.speed > 8 ? 'text-red-400' : 'text-white'}`}>{v.speed.toFixed(1)} km/h</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">碰撞物体:</span>
                                  <span className="text-white ml-1">{v.objectName}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">扣分:</span>
                                  <span className="text-red-400 ml-1">-{v.pointsDeducted}</span>
                                </div>
                              </div>
                              <div className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">
                                <span className="text-blue-400 font-medium">分析: </span>
                                {explainShelfCollision(v)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {overheightViolations.length > 0 && (
                      <div>
                        <h3 className="font-bold text-yellow-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          超高装载问题 ({overheightViolations.length} 次，扣分 {session.score.overheightPenalties})
                        </h3>
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-4">
                          <p className="text-sm text-gray-300">
                            <strong>问题分析:</strong> 超高装载是指货叉举升高度超过安全限制。这可能会刮到仓库顶部的管道、灯具或消防喷淋，
                            也可能导致货物重心过高而坠落。请记住："举升前先看头顶"。
                          </p>
                        </div>
                        <div className="space-y-3">
                          {overheightViolations.map((v, i) => (
                            <div key={v.id} className="bg-gray-900/50 rounded-xl p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-yellow-400 font-bold">超高 #{i + 1}</span>
                                  <span className="text-gray-500 text-sm ml-3">{formatTime(v.timestamp)}</span>
                                </div>
                                <span className="text-red-400 font-bold">-{v.pointsDeducted} 分</span>
                              </div>
                              <p className="text-sm text-gray-400">{v.objectName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {blindzoneViolations.length > 0 && (
                      <div>
                        <h3 className="font-bold text-orange-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          盲区穿行问题 ({blindzoneViolations.length} 次，扣分 {session.score.blindzonePenalties})
                        </h3>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-4">
                          <p className="text-sm text-gray-300">
                            <strong>问题分析:</strong> 盲区是指司机坐在叉车上看不到的区域。在盲区长时间穿行非常危险，
                            因为可能有人或其他车辆突然出现。建议：能绕开就绕开，必须通过时请鸣笛减速。
                          </p>
                        </div>
                        <div className="space-y-3">
                          {blindzoneViolations.map((v, i) => (
                            <div key={v.id} className="bg-gray-900/50 rounded-xl p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <span className="text-orange-400 font-bold">盲区 #{i + 1}</span>
                                  <span className="text-gray-500 text-sm ml-3">{formatTime(v.timestamp)}</span>
                                </div>
                                <span className="text-red-400 font-bold">-{v.pointsDeducted} 分</span>
                              </div>
                              <p className="text-sm text-gray-400">{v.objectName}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {session.conflicts.length > 0 && (
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleSection('conflicts')}
                className="w-full flex items-center justify-between p-6 transition-colors hover:bg-gray-700/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-bold">三、数据配置冲突</h2>
                    <p className="text-gray-400">
                      叉车和货架参数由不同人员维护，合并时发现 {session.conflicts.length} 项冲突
                    </p>
                  </div>
                </div>
                {expandedSection === 'conflicts' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
              </button>
              
              {expandedSection === 'conflicts' && (
                <div className="p-6 bg-gray-800/30 border-t border-gray-700">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <p className="text-sm text-gray-300">
                      <strong>重要说明:</strong> 以下冲突是因为叉车参数（由{session.selectedForklift.maintainer}维护）
                      和货架参数（由{shelves[0]?.maintainer || '未知'}维护）合并时自动检测出来的。
                      这些问题不是司机的操作问题，而是需要管理人员协调解决的配置问题。
                    </p>
                  </div>
                  
                  <ConflictAlert conflicts={session.conflicts} />
                </div>
              )}
            </div>
          )}
          
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('suggestions')}
              className="w-full flex items-center justify-between p-6 transition-colors hover:bg-gray-700/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold">四、改进建议</h2>
                  <p className="text-gray-400">
                    针对本次训练发现的问题，提供以下改进建议
                  </p>
                </div>
              </div>
              {expandedSection === 'suggestions' ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
            
            {expandedSection === 'suggestions' && (
              <div className="p-6 bg-gray-800/30 border-t border-gray-700">
                <div className="space-y-4">
                  {shelfViolations.length >= 3 && (
                    <div className="flex gap-3 p-4 bg-gray-900/50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-400 font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">加强基础操作练习</h4>
                        <p className="text-sm text-gray-400">货架碰撞次数过多，建议先在空旷区域练习直线行驶和转弯，熟悉车辆的尺寸和操控特性。</p>
                      </div>
                    </div>
                  )}
                  
                  {shelfViolations.some(v => v.speed > 8) && (
                    <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <h4 className="font-bold text-red-400 mb-1">⚠️ 立即纠正：控制行驶速度</h4>
                        <p className="text-sm text-gray-300">多次高速碰撞！这是严重的安全隐患。请记住："十次事故九次快"，在仓库内行驶永远不要超过限速。</p>
                      </div>
                    </div>
                  )}
                  
                  {overheightViolations.length > 0 && (
                    <div className="flex gap-3 p-4 bg-gray-900/50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-yellow-400 font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">养成"一看二慢三通过"的习惯</h4>
                        <p className="text-sm text-gray-400">举升货物前先观察周围环境，确认上方无障碍物。可以在货叉上贴高度标记，帮助判断。</p>
                      </div>
                    </div>
                  )}
                  
                  {blindzoneViolations.length > 0 && (
                    <div className="flex gap-3 p-4 bg-gray-900/50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-400 font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">盲区处理策略</h4>
                        <p className="text-sm text-gray-400">尽量绕开盲区行驶，如必须通过请鸣笛并减速。建议仓库在盲区安装广角镜，消除视线死角。</p>
                      </div>
                    </div>
                  )}
                  
                  {improvementSuggestions.slice(0, 3).map((suggestion, i) => (
                    <div key={i} className="flex gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 font-bold">{i + (shelfViolations.length >= 3 ? 2 : 1)}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-white mb-1">配置优化建议</h4>
                        <p className="text-sm text-gray-400">{suggestion}</p>
                      </div>
                    </div>
                  ))}
                  
                  {violations.length === 0 && session.conflicts.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                      <h3 className="text-xl font-bold text-green-400 mb-2">表现优秀！</h3>
                      <p className="text-gray-400 mb-4">本次训练没有发现需要改进的问题，请继续保持良好的安全驾驶习惯。</p>
                      <p className="text-sm text-blue-400">💡 建议：可以尝试更高难度的训练，进一步提升驾驶技能。</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">五、总结</h2>
              <div className={`p-4 rounded-xl ${
                gradeInfo.grade === 'S' || gradeInfo.grade === 'A' 
                  ? 'bg-green-500/10 border border-green-500/30' 
                  : gradeInfo.grade === 'B'
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'bg-yellow-500/10 border border-yellow-500/30'
              }`}>
                <p className="text-gray-300">
                  {gradeInfo.grade === 'S' || gradeInfo.grade === 'A' 
                    ? '✅ 本次训练表现优秀！安全意识强，操作规范。请继续保持，安全是仓库运营的生命线。'
                    : gradeInfo.grade === 'B'
                      ? '📋 本次训练表现合格，但仍有提升空间。建议针对发现的问题加强练习，争取下次取得更好的成绩。'
                      : '⚠️ 本次训练发现较多需要改进的地方。安全无小事，建议重新观看安全培训视频，在基础模式多加练习后再参加考核。'
                  }
                </p>
                {session.conflicts.length > 0 && (
                  <p className="mt-3 text-yellow-400 text-sm">
                    🔧 另外检测到 {session.conflicts.length} 项配置冲突，请优先协调管理人员解决这些问题，这会从根本上降低安全风险。
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex gap-4">
          <button
            onClick={handleBackToMenu}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold transition-all"
          >
            <Home className="w-5 h-5" />
            返回主菜单
          </button>
          
          <button
            onClick={handleRestart}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold transition-all"
          >
            <RotateCcw className="w-5 h-5" />
            再来一次
          </button>
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>本报告由 3D仓库叉车赛 安全培训系统自动生成</p>
          <p>© 2024 仓库安全培训系统 - 让每一位司机都能安全驾驶</p>
        </div>
      </div>
    </div>
  );
}
