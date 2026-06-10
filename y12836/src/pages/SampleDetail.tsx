import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  User,
  Activity,
  FileText,
  Dna,
  Stethoscope,
  Edit3,
  Save,
  X,
  GitBranch,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PositiveRateRing from '@/components/charts/PositiveRateRing';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'notes' | 'sequencing' | 'opinion' | 'versions';

export default function SampleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const samples = useAppStore((state) => state.samples);
  const estimationVersions = useAppStore((state) => state.estimationVersions);
  const corrections = useAppStore((state) => state.corrections);
  const pathologyNotes = useAppStore((state) => state.pathologyNotes);
  const sequencingResults = useAppStore((state) => state.sequencingResults);
  const groups = useAppStore((state) => state.groups);
  const updatePathologyNote = useAppStore((state) => state.updatePathologyNote);
  const exportReport = useAppStore((state) => state.exportReport);

  const sample = useMemo(
    () => samples.find((s) => s.id === id),
    [samples, id]
  );

  const versions = useMemo(() => {
    if (!id) return [];
    return estimationVersions
      .filter((v) => v.sampleId === id)
      .sort((a, b) => b.version - a.version);
  }, [estimationVersions, id]);

  const latestVersion = useMemo(() => versions[0], [versions]);

  const sampleCorrections = useMemo(() => {
    if (!id) return [];
    return corrections
      .filter((c) => c.sampleId === id)
      .sort((a, b) => new Date(b.correctedAt).getTime() - new Date(a.correctedAt).getTime());
  }, [corrections, id]);

  const notes = useMemo(() => {
    if (!id) return [];
    return pathologyNotes
      .filter((n) => n.sampleId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [pathologyNotes, id]);

  const latestNote = useMemo(() => notes[0], [notes]);

  const sequencing = useMemo(() => {
    if (!id) return [];
    return sequencingResults
      .filter((s) => s.sampleId === id)
      .sort((a, b) => new Date(b.testedAt).getTime() - new Date(a.testedAt).getTime());
  }, [sequencingResults, id]);

  const group = useMemo(
    () => groups.find((g) => g.id === sample?.groupId),
    [groups, sample?.groupId]
  );

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteContent, setNoteContent] = useState(latestNote?.content || '');

  if (!sample) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-slate-500">样本不存在</div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'overview', label: '概览', icon: Activity },
    { id: 'notes', label: '病理备注', icon: FileText },
    { id: 'sequencing', label: '测序结果', icon: Dna },
    { id: 'opinion', label: '处理意见', icon: Stethoscope },
    { id: 'versions', label: '版本历史', icon: History },
  ];

  const handleSaveNote = () => {
    updatePathologyNote(sample.id, noteContent, '李检验师');
    setIsEditingNote(false);
  };

  const handleExport = (format: 'pdf' | 'excel' | 'print') => {
    exportReport(sample.id, format, '李检验师');
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'pathogenic':
        return 'bg-danger-100 text-danger-700';
      case 'likely_pathogenic':
        return 'bg-warning-100 text-warning-700';
      case 'uncertain':
        return 'bg-slate-100 text-slate-600';
      case 'likely_benign':
        return 'bg-brand-100 text-brand-700';
      case 'benign':
        return 'bg-accent-100 text-accent-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getSignificanceLabel = (significance: string) => {
    const map: Record<string, string> = {
      pathogenic: '致病',
      likely_pathogenic: '可能致病',
      uncertain: '意义未明',
      likely_benign: '可能良性',
      benign: '良性',
    };
    return map[significance] || significance;
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/samples')}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-serif font-bold text-slate-900">
                  {sample.barcode}
                </h1>
                <StatusBadge status={sample.status} />
                {sample.hasAnomaly && (
                  <span className="badge badge-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    存在异常
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: group?.color }}
                  />
                  {group?.name}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  更新于{' '}
                  {formatDistanceToNow(new Date(sample.updatedAt), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/lineage/${sample.id}`)}
              className="btn-secondary"
            >
              <GitBranch className="w-4 h-4 mr-2" />
              谱系追踪
            </button>
            <button onClick={() => handleExport('pdf')} className="btn-primary">
              <Download className="w-4 h-4 mr-2" />
              导出报告
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-4 -mb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-slate-50">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-6">
              <div className="card p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  患者信息
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">年龄</p>
                    <p className="text-sm font-medium text-slate-800">
                      {sample.patientInfo.age || '-'} 岁
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">性别</p>
                    <p className="text-sm font-medium text-slate-800">
                      {sample.patientInfo.gender === 'male'
                        ? '男'
                        : sample.patientInfo.gender === 'female'
                        ? '女'
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">临床诊断</p>
                    <p className="text-sm font-medium text-slate-800">
                      {sample.patientInfo.diagnosis || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">病变部位</p>
                    <p className="text-sm font-medium text-slate-800">
                      {sample.patientInfo.lesionSite || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">标本类型</p>
                    <p className="text-sm font-medium text-slate-800">
                      {sample.patientInfo.tissueType || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">采集日期</p>
                    <p className="text-sm font-medium text-slate-800">
                      {format(new Date(sample.collectedAt), 'yyyy-MM-dd')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    病理备注
                  </h2>
                  <button
                    onClick={() => {
                      setActiveTab('notes');
                      setIsEditingNote(true);
                    }}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    编辑
                  </button>
                </div>
                {latestNote ? (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {latestNote.content}
                    </p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {latestNote.author}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(latestNote.createdAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                      {notes.length > 1 && (
                        <span className="text-xs text-brand-600">
                          {notes.length} 个历史版本
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">暂无病理备注</p>
                )}
              </div>

              <div className="card p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  处理意见
                </h2>
                {latestVersion?.processingOpinion ? (
                  <div className="bg-accent-50 border border-accent-100 rounded-lg p-4">
                    <p className="text-sm text-accent-800 leading-relaxed">
                      {latestVersion.processingOpinion}
                    </p>
                    <div className="mt-3 pt-3 border-t border-accent-200 flex items-center justify-between">
                      <span className="text-xs text-accent-600">
                        基于 v{latestVersion.version} 版本结论
                      </span>
                      <CheckCircle2 className="w-4 h-4 text-accent-500" />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">
                    暂无处理意见，完成AI估算后生成
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="card p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  阳性率结果
                </h2>
                <div className="flex flex-col items-center py-4">
                  {latestVersion ? (
                    <>
                      <PositiveRateRing
                        rate={latestVersion.positiveRate}
                        size={140}
                        strokeWidth={12}
                        label={`v${latestVersion.version}`}
                      />
                      <div className="mt-4 text-center">
                        <p className="text-sm text-slate-600">
                          置信区间:{' '}
                          <span className="font-medium">
                            {latestVersion.confidenceInterval[0].toFixed(1)}% -{' '}
                            {latestVersion.confidenceInterval[1].toFixed(1)}%
                          </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {latestVersion.algorithm} {latestVersion.algorithmVersion}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">尚未进行AI估算</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-lg font-serif font-bold text-slate-800">
                      {latestVersion?.cellCount?.toLocaleString() || '-'}
                    </p>
                    <p className="text-xs text-slate-500">细胞总数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-serif font-bold text-slate-800">
                      {latestVersion?.tissueArea || '-'}
                      <span className="text-sm font-normal"> mm²</span>
                    </p>
                    <p className="text-xs text-slate-500">组织面积</p>
                  </div>
                </div>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    结论
                  </h2>
                  <span className="text-xs text-slate-400">v{sample.currentVersion}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {sample.latestConclusion || '暂无结论'}
                </p>
              </div>

              <div className="card p-5">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  快捷操作
                </h2>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/samples/${sample.id}/estimation`)}
                    className="w-full btn-secondary text-left"
                  >
                    <Activity className="w-4 h-4 mr-2 text-brand-500" />
                    启动AI估算
                  </button>
                  <button
                    onClick={() => navigate(`/lineage/${sample.id}`)}
                    className="w-full btn-secondary text-left"
                  >
                    <GitBranch className="w-4 h-4 mr-2 text-accent-500" />
                    查看谱系追踪
                  </button>
                  <button
                    onClick={() => navigate('/compare/notes')}
                    className="w-full btn-secondary text-left"
                  >
                    <FileText className="w-4 h-4 mr-2 text-warning-500" />
                    备注版本对比
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="space-y-4">
            {isEditingNote ? (
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    编辑病理备注
                  </h2>
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="textarea h-48"
                  placeholder="请输入病理备注..."
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button
                    onClick={() => setIsEditingNote(false)}
                    className="btn-secondary"
                  >
                    取消
                  </button>
                  <button onClick={handleSaveNote} className="btn-primary">
                    <Save className="w-4 h-4 mr-2" />
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  病理备注历史
                </h2>
                <button
                  onClick={() => {
                    setNoteContent(latestNote?.content || '');
                    setIsEditingNote(true);
                  }}
                  className="btn-primary btn-sm"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  新增版本
                </button>
              </div>
            )}

            {!isEditingNote &&
              notes.map((note, index) => (
                <div
                  key={note.id}
                  className={cn(
                    'card p-5 transition-all',
                    index === 0 && 'ring-2 ring-brand-500/20 border-brand-300'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">
                        v{notes.length - index}
                      </span>
                      {note.isLatest && (
                        <span className="badge badge-success">最新版本</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(note.createdAt), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500">
                      作者：{note.author}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        {activeTab === 'sequencing' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">测序结果</h2>

            {sequencing.length > 0 ? (
              <div className="grid gap-4">
                {sequencing.map((seq) => (
                  <div key={seq.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-slate-900">
                            {seq.gene}
                          </h3>
                          <span
                            className={cn(
                              'badge',
                              getSignificanceColor(seq.significance)
                            )}
                          >
                            {getSignificanceLabel(seq.significance)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          变异：{seq.variant}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {seq.reportId || ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">等位基因频率</p>
                        <p className="text-sm font-medium text-slate-800">
                          {seq.alleleFrequency !== undefined
                            ? `${seq.alleleFrequency}%`
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">测序深度</p>
                        <p className="text-sm font-medium text-slate-800">
                          {seq.readDepth !== undefined ? `${seq.readDepth}x` : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">染色体</p>
                        <p className="text-sm font-medium text-slate-800 font-mono">
                          {seq.chromosome || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">检测日期</p>
                        <p className="text-sm font-medium text-slate-800">
                          {format(new Date(seq.testedAt), 'yyyy-MM-dd')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <Dna className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">暂无测序数据</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'opinion' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">处理意见</h2>

            {latestVersion?.processingOpinion ? (
              <div className="card p-5 bg-gradient-to-br from-accent-50 to-white">
                <div className="flex items-center gap-2 mb-3">
                  <Stethoscope className="w-5 h-5 text-accent-600" />
                  <h3 className="text-base font-semibold text-slate-900">
                    当前处理意见
                  </h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {latestVersion.processingOpinion}
                </p>
                <div className="mt-4 pt-4 border-t border-accent-200 flex items-center justify-between">
                  <span className="text-xs text-accent-600">
                    基于 v{latestVersion.version} 版本结果生成
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-accent-500" />
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center">
                <Stethoscope className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">
                  请先完成AI估算，系统将自动生成处理建议
                </p>
              </div>
            )}

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                常用处理意见模板
              </h3>
              <div className="space-y-2">
                {['PD-L1阳性建议', 'PD-L1阴性建议', 'HER2阳性建议', 'dMMR/MSI-H建议'].map(
                  (tpl) => (
                    <button
                      key={tpl}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/50 transition-colors"
                    >
                      <span className="text-sm text-slate-700">{tpl}</span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">版本历史</h2>

            <div className="card p-5">
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-6">
                  {versions.map((version, index) => (
                    <div key={version.id} className="relative pl-12">
                      <div
                        className={cn(
                          'absolute left-3.5 w-4 h-4 rounded-full border-2 border-white shadow',
                          index === 0 ? 'bg-accent-500' : 'bg-slate-300'
                        )}
                      />
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              v{version.version}
                            </span>
                            {index === 0 && (
                              <span className="badge badge-success">当前版本</span>
                            )}
                            <span className="text-xs text-slate-500">
                              {version.estimatedBy === 'ai'
                                ? 'AI估算'
                                : version.estimatedBy === 'human'
                                ? '人工修正'
                                : '混合模式'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {format(
                              new Date(version.estimatedAt),
                              'yyyy-MM-dd HH:mm'
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-xs text-slate-500">阳性率</span>
                            <p className="text-lg font-serif font-bold text-slate-800">
                              {version.positiveRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">细胞数</span>
                            <p className="text-sm font-medium text-slate-700">
                              {version.cellCount?.toLocaleString() || '-'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          {version.conclusion}
                        </p>
                      </div>
                    </div>
                  ))}

                  {sampleCorrections.map((corr) => (
                    <div key={corr.id} className="relative pl-12">
                      <div className="absolute left-3.5 w-4 h-4 rounded-full border-2 border-white bg-warning-500 shadow" />
                      <div className="p-4 bg-warning-50 rounded-lg border border-warning-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Edit3 className="w-4 h-4 text-warning-600" />
                            <span className="font-medium text-warning-800">
                              人工修正
                            </span>
                          </div>
                          <span className="text-xs text-warning-600">
                            {corr.correctedBy}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-500 line-through">
                            {corr.originalRate.toFixed(1)}%
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-medium text-slate-800">
                            {corr.correctedRate.toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-warning-700 mt-2">
                          原因：{corr.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
