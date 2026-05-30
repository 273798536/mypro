import { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Download, RefreshCw, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { generateMarkdownReport, downloadReport } from '../../utils/reportGenerator';
import { formatTime, formatFrequency } from '../../utils/dataMapper';
import { ISSUE_TYPE_LABELS, QUALITY_LABELS } from '../../types';
import { ISSUE_COLORS, QUALITY_COLORS, FINGER_TYPE_COLORS } from '../../utils/colorScheme';

export function ReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const segments = useAppStore(state => state.segments);
  const issues = useAppStore(state => state.issues);
  const conclusions = useAppStore(state => state.conclusions);
  const spacePoints = useAppStore(state => state.spacePoints);
  const savedViews = useAppStore(state => state.savedViews);
  const loadData = useAppStore(state => state.loadData);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reportData = useMemo(() => ({
    conclusions,
    issues,
    segments,
    points: spacePoints,
    savedViews,
    dataVersion: 'v1.0'
  }), [conclusions, issues, segments, spacePoints, savedViews]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const markdown = generateMarkdownReport(reportData);
      setReport(markdown);
      setIsGenerating(false);
    }, 500);
  };

  const handleDownload = () => {
    if (report) {
      downloadReport(report);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, []);

  const pendingIssues = issues.filter(i => i.status === 'pending');
  const resolvedIssues = issues.filter(i => i.status === 'resolved');

  const qualityStats = useMemo(() => {
    const stats: Record<string, number> = {};
    segments.forEach(s => {
      stats[s.quality] = (stats[s.quality] || 0) + 1;
    });
    return stats;
  }, [segments]);

  const fingerTypeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    spacePoints.forEach(p => {
      stats[p.fingerType] = (stats[p.fingerType] || 0) + 1;
    });
    return stats;
  }, [spacePoints]);

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#121218]">
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[#8B2323] hover:text-[#A52A2A] transition-colors"
          >
            <ArrowLeft size={20} />
            <span>返回分析页</span>
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-[#1A5276] hover:bg-[#2874A6] disabled:bg-[#888] text-white rounded transition-colors"
            >
              <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
              重新生成
            </button>
            <button
              onClick={handleDownload}
              disabled={!report}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B2323] hover:bg-[#A52A2A] disabled:bg-[#888] text-white rounded transition-colors"
            >
              <Download size={16} />
              导出报告
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-[#121218] to-[#1E1E2A] px-8 py-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText size={32} className="text-[#8B2323]" />
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                古琴声腔空间分析报告
              </h1>
            </div>
            <p className="text-[#A0A0A0]">
              生成时间：{new Date().toLocaleString('zh-CN')} · 数据版本：v1.0
            </p>
          </div>

          <div className="p-8 space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                <span className="w-1 h-6 bg-[#8B2323] rounded" />
                分析概览
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-[#F8F5F0] rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-[#8B2323]">{segments.length}</div>
                  <div className="text-sm text-[#666]">录音片段</div>
                  <div className="text-xs text-[#888] mt-1">
                    总时长 {formatTime(segments.reduce((a, s) => a + s.duration, 0))}
                  </div>
                </div>
                <div className="bg-[#F8F5F0] rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-[#1A5276]">{spacePoints.length}</div>
                  <div className="text-sm text-[#666]">3D空间点</div>
                  <div className="text-xs text-[#888] mt-1">
                    覆盖 {Object.keys(fingerTypeStats).length} 种指法
                  </div>
                </div>
                <div className="bg-[#F8F5F0] rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-[#E74C3C]">{pendingIssues.length}</div>
                  <div className="text-sm text-[#666]">待处理问题</div>
                  <div className="text-xs text-[#888] mt-1">
                    已解决 {resolvedIssues.length} 个
                  </div>
                </div>
                <div className="bg-[#F8F5F0] rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-[#27AE60]">{conclusions.length}</div>
                  <div className="text-sm text-[#666]">研究结论</div>
                  <div className="text-xs text-[#888] mt-1">
                    {savedViews.length} 个保存视角
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                <span className="w-1 h-6 bg-[#1A5276] rounded" />
                3D特征图生成说明
              </h2>
              <div className="bg-[#F8F5F0] rounded-lg p-6">
                <h3 className="font-semibold mb-3">空间映射算法</h3>
                <p className="text-[#666] text-sm leading-relaxed mb-4">
                  本系统将古琴声腔数据从多维特征空间映射到三维可视化空间：
                </p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white rounded p-4 border-l-4" style={{ borderColor: '#8B2323' }}>
                    <div className="font-semibold mb-1">X轴 · 指法维度</div>
                    <p className="text-xs text-[#666]">
                      按指法类型（散音/按音/泛音等8类）离散映射到0-10区间
                    </p>
                  </div>
                  <div className="bg-white rounded p-4 border-l-4" style={{ borderColor: '#27AE60' }}>
                    <div className="font-semibold mb-1">Y轴 · 时间维度</div>
                    <p className="text-xs text-[#666]">
                      将录音时间线性映射到0-100区间
                    </p>
                  </div>
                  <div className="bg-white rounded p-4 border-l-4" style={{ borderColor: '#1A5276' }}>
                    <div className="font-semibold mb-1">Z轴 · 频段维度</div>
                    <p className="text-xs text-[#666]">
                      采用对数映射（20Hz-20kHz），符合人耳听觉特性
                    </p>
                  </div>
                </div>
                
                <h3 className="font-semibold mb-3">指法类型分布</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(fingerTypeStats).map(([type, count]) => (
                    <div
                      key={type}
                      className="px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-2"
                      style={{ backgroundColor: FINGER_TYPE_COLORS[type] || '#888' }}
                    >
                      {type}
                      <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                <span className="w-1 h-6 bg-[#27AE60] rounded" />
                数据质量评估
              </h2>
              
              <div className="mb-4">
                <h3 className="font-semibold mb-2">片段质量分布</h3>
                <div className="flex gap-3">
                  {Object.entries(qualityStats).map(([quality, count]) => (
                    <div
                      key={quality}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: `${QUALITY_COLORS[quality]}15` }}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: QUALITY_COLORS[quality] }}
                      />
                      <span className="text-sm">{QUALITY_LABELS[quality as keyof typeof QUALITY_LABELS]}</span>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {issues.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">问题清单</h3>
                  <div className="space-y-3">
                    {issues.map(issue => (
                      <div
                        key={issue.id}
                        className="bg-white border rounded-lg p-4 flex items-start gap-4"
                        style={{ borderColor: `${ISSUE_COLORS[issue.type]}40` }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${ISSUE_COLORS[issue.type]}15` }}
                        >
                          {issue.status === 'resolved' ? (
                            <CheckCircle size={20} style={{ color: ISSUE_COLORS[issue.type] }} />
                          ) : (
                            <AlertTriangle size={20} style={{ color: ISSUE_COLORS[issue.type] }} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">
                              {ISSUE_TYPE_LABELS[issue.type]}
                            </span>
                            <span
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${ISSUE_COLORS[issue.type]}15`,
                                color: ISSUE_COLORS[issue.type]
                              }}
                            >
                              {issue.severity === 'high' ? '高优先级' : issue.severity === 'medium' ? '中优先级' : '低优先级'}
                            </span>
                            {issue.status === 'resolved' && (
                              <span className="px-2 py-0.5 bg-[#27AE60]/15 text-[#27AE60] rounded text-xs">
                                已解决
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#666] mb-2">{issue.description}</p>
                          <div className="flex items-center gap-4 text-xs text-[#888]">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(issue.createdAt).toLocaleString('zh-CN')}
                            </span>
                            <span>处理人：{issue.assignee}</span>
                            <span>关联：{issue.relatedSegmentIds.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {pendingIssues.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                  <span className="w-1 h-6 bg-[#E74C3C] rounded" />
                  处理建议
                </h2>
                <div className="bg-[#FEF5E7] border border-[#F39C12]/30 rounded-lg p-4">
                  <ol className="space-y-2 text-sm">
                    {pendingIssues.map((issue, idx) => (
                      <li key={issue.id} className="flex items-start gap-2">
                        <span className="w-5 h-5 bg-[#F39C12] text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {idx + 1}
                        </span>
                        <span>
                          <strong>{ISSUE_TYPE_LABELS[issue.type]}</strong>（{issue.relatedSegmentIds.join(', ')}）：
                          请 {issue.assignee} 核对原始数据
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {conclusions.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                  <span className="w-1 h-6 bg-[#D4AF37] rounded" />
                  研究结论
                </h2>
                <div className="space-y-4">
                  {conclusions.map((conclusion, idx) => (
                    <div key={conclusion.id} className="bg-white border border-[#3A3A4A]/20 rounded-lg p-5">
                      <h3 className="font-semibold text-lg mb-2">
                        {idx + 1}. {conclusion.title}
                      </h3>
                      <p className="text-[#666] leading-relaxed mb-4">
                        {conclusion.content}
                      </p>
                      <div className="flex flex-wrap gap-4 text-xs text-[#888] border-t border-[#3A3A4A]/10 pt-3">
                        <span>数据版本：v{conclusion.dataVersion}</span>
                        <span>关联片段：{conclusion.segmentIds.join(', ')}</span>
                        <span>创建时间：{new Date(conclusion.createdAt).toLocaleString('zh-CN')}</span>
                        <span>更新时间：{new Date(conclusion.updatedAt).toLocaleString('zh-CN')}</span>
                      </div>
                      {conclusion.changeHistory.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#3A3A4A]/10">
                          <h4 className="text-xs font-semibold text-[#666] mb-2">变更历史</h4>
                          <div className="space-y-1">
                            {conclusion.changeHistory.map(change => (
                              <div key={change.id} className="text-xs text-[#888] flex gap-2">
                                <span>{new Date(change.timestamp).toLocaleString('zh-CN')}</span>
                                <span>-</span>
                                <span>{change.author}</span>
                                <span>-</span>
                                <span>{change.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {savedViews.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                  <span className="w-1 h-6 bg-[#9B59B6] rounded" />
                  保存的分析视角
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {savedViews.map(view => (
                    <div key={view.id} className="bg-[#F8F5F0] rounded-lg p-4">
                      <h4 className="font-semibold mb-2">{view.name}</h4>
                      <div className="text-xs text-[#666] space-y-1">
                        <div>
                          <span className="text-[#888]">创建时间：</span>
                          {new Date(view.createdAt).toLocaleString('zh-CN')}
                        </div>
                        <div>
                          <span className="text-[#888]">相机位置：</span>
                          [{view.cameraPosition.map(v => v.toFixed(1)).join(', ')}]
                        </div>
                        <div>
                          <span className="text-[#888]">时间范围：</span>
                          {formatTime(view.filters.timeRange[0])} - {formatTime(view.filters.timeRange[1])}
                        </div>
                        {view.filters.fingerTypes.length > 0 && (
                          <div>
                            <span className="text-[#888]">筛选指法：</span>
                            {view.filters.fingerTypes.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ fontFamily: '"Source Han Serif SC", serif' }}>
                <span className="w-1 h-6 bg-[#121218] rounded" />
                数据来源追溯
              </h2>
              <div className="bg-[#121218] text-[#F5F0E6] rounded-lg p-4 font-mono text-xs overflow-x-auto">
                <pre className="whitespace-pre-wrap">
{`// 3D空间映射逻辑
// X轴: 指法类型 → 离散映射 0-10
// Y轴: 时间 → 线性映射 0-100  
// Z轴: 频段 → 对数映射 20Hz-20kHz

const mapTo3DSpace = (segments, annotations, spectrums) => {
  return annotations.map((annotation, idx) => {
    const spectrum = findMatchingSpectrum(annotation, spectrums);
    return {
      x: mapFingerTypeToX(annotation.fingerType),
      y: mapTimeToY(annotation.time, totalDuration),
      z: mapFrequencyToZ(spectrum.centroid),
      value: spectrum.energy,
      color: getFingerColor(annotation.fingerType)
    };
  });
};`}
                </pre>
              </div>
              <p className="text-xs text-[#666] mt-3">
                本报告所有数据均来自录音片段、指法标注和频谱特征分析，3D特征图通过上述算法生成。
                所有结论变更均有完整历史记录可追溯。
              </p>
            </section>

            <div className="text-center text-xs text-[#888] pt-4 border-t">
              本报告由古琴声腔空间图分析系统自动生成 · {new Date().toLocaleString('zh-CN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
