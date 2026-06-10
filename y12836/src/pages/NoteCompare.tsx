import { useState } from 'react';
import {
  FileText,
  ArrowLeftRight,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  FileDiff,
  Activity,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function NoteCompare() {
  const samples = useAppStore((state) => state.samples);
  const getSampleById = useAppStore((state) => state.getSampleById);
  const getSampleNotes = useAppStore((state) => state.getSampleNotes);
  const getLatestVersion = useAppStore((state) => state.getLatestVersion);
  const getSampleVersions = useAppStore((state) => state.getSampleVersions);

  const [selectedSampleId, setSelectedSampleId] = useState('s1');
  const [oldNoteId, setOldNoteId] = useState('');
  const [newNoteId, setNewNoteId] = useState('');
  const [showImpactAnalysis, setShowImpactAnalysis] = useState(true);

  const sample = selectedSampleId ? getSampleById(selectedSampleId) : null;
  const notes = selectedSampleId ? getSampleNotes(selectedSampleId) : [];
  const versions = selectedSampleId ? getSampleVersions(selectedSampleId) : [];

  const samplesWithMultipleNotes = samples.filter(
    (s) => getSampleNotes(s.id).length >= 2
  );

  const oldNote = notes.find((n) => n.id === oldNoteId);
  const newNote = notes.find((n) => n.id === newNoteId);

  const oldVersion = versions[versions.length - 1];
  const newVersion = versions[0];

  const computeDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const maxLen = Math.max(oldLines.length, newLines.length);
    const result = [];

    for (let i = 0; i < maxLen; i++) {
      const oldLine = oldLines[i] || '';
      const newLine = newLines[i] || '';

      if (oldLine === newLine) {
        result.push({ type: 'same', old: oldLine, new: newLine });
      } else {
        if (oldLine) result.push({ type: 'removed', text: oldLine });
        if (newLine) result.push({ type: 'added', text: newLine });
      }
    }

    return result;
  };

  const diffResult =
    oldNote && newNote ? computeDiff(oldNote.content, newNote.content) : [];

  const hasChanges =
    oldNote && newNote && oldNote.content !== newNote.content;

  const calculateImpact = () => {
    if (!oldVersion || !newVersion) return null;

    const rateDiff = newVersion.positiveRate - oldVersion.positiveRate;
    const absDiff = Math.abs(rateDiff);

    let severity: 'low' | 'medium' | 'high' = 'low';
    if (absDiff > 20) severity = 'high';
    else if (absDiff > 5) severity = 'medium';

    const affectedFields = [];
    if (oldVersion.conclusion !== newVersion.conclusion) {
      affectedFields.push('结论');
    }
    if (
      newVersion.processingOpinion &&
      oldVersion.processingOpinion !== newVersion.processingOpinion
    ) {
      affectedFields.push('处理意见');
    }
    if (absDiff > 0) {
      affectedFields.push('阳性率数值');
    }

    return {
      severity,
      rateDiff,
      affectedFields,
      description:
        severity === 'high'
          ? '备注变更对结论有显著影响，建议重点关注'
          : severity === 'medium'
          ? '备注变更对结论有一定影响，需人工复核'
          : '备注变更对结论影响较小',
    };
  };

  const impact = calculateImpact();

  const handleSampleChange = (sampleId: string) => {
    setSelectedSampleId(sampleId);
    const sampleNotes = getSampleNotes(sampleId);
    if (sampleNotes.length >= 2) {
      setOldNoteId(sampleNotes[sampleNotes.length - 1].id);
      setNewNoteId(sampleNotes[0].id);
    } else if (sampleNotes.length === 1) {
      setOldNoteId(sampleNotes[0].id);
      setNewNoteId(sampleNotes[0].id);
    }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">
              备注对比
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              病理备注修改前后，旧结论与新结论并排对比
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-72">
              <label className="sr-only">选择样本</label>
              <select
                value={selectedSampleId}
                onChange={(e) => handleSampleChange(e.target.value)}
                className="select"
              >
                {samplesWithMultipleNotes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.barcode} - {s.patientInfo.diagnosis}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-slate-50">
        {sample && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="card p-5">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="label">旧版本</label>
                  <select
                    value={oldNoteId}
                    onChange={(e) => setOldNoteId(e.target.value)}
                    className="select"
                  >
                    {notes.map((note, idx) => (
                      <option key={note.id} value={note.id}>
                        v{notes.length - idx} -{' '}
                        {format(new Date(note.createdAt), 'MM-dd HH:mm')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-warning-100 to-warning-200 flex items-center justify-center">
                    <FileDiff className="w-6 h-6 text-warning-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="label">新版本</label>
                  <select
                    value={newNoteId}
                    onChange={(e) => setNewNoteId(e.target.value)}
                    className="select"
                  >
                    {notes.map((note, idx) => (
                      <option key={note.id} value={note.id}>
                        v{notes.length - idx} -{' '}
                        {format(new Date(note.createdAt), 'MM-dd HH:mm')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {hasChanges && impact && (
              <div
                className={cn(
                  'card p-5 border-l-4',
                  impact.severity === 'high'
                    ? 'border-l-danger-500 bg-danger-50/30'
                    : impact.severity === 'medium'
                    ? 'border-l-warning-500 bg-warning-50/30'
                    : 'border-l-accent-500 bg-accent-50/30'
                )}
              >
                <button
                  onClick={() => setShowImpactAnalysis(!showImpactAnalysis)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Info
                      className={cn(
                        'w-5 h-5',
                        impact.severity === 'high'
                          ? 'text-danger-600'
                          : impact.severity === 'medium'
                          ? 'text-warning-600'
                          : 'text-accent-600'
                      )}
                    />
                    <span className="font-medium text-slate-900">
                      影响范围分析
                    </span>
                    <span
                      className={cn(
                        'badge',
                        impact.severity === 'high'
                          ? 'bg-danger-100 text-danger-700'
                          : impact.severity === 'medium'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-accent-100 text-accent-700'
                      )}
                    >
                      {impact.severity === 'high'
                        ? '高影响'
                        : impact.severity === 'medium'
                        ? '中影响'
                        : '低影响'}
                    </span>
                  </div>
                  {showImpactAnalysis ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {showImpactAnalysis && (
                  <div className="mt-4 pt-4 border-t border-slate-200/60">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 bg-white/60 rounded-lg">
                        <p className="text-xs text-slate-500 mb-1">阳性率变化</p>
                        <p
                          className={cn(
                            'text-xl font-serif font-bold',
                            impact.rateDiff > 0
                              ? 'text-accent-600'
                              : impact.rateDiff < 0
                              ? 'text-danger-600'
                              : 'text-slate-600'
                          )}
                        >
                          {impact.rateDiff > 0 ? '+' : ''}
                          {impact.rateDiff.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 bg-white/60 rounded-lg col-span-2">
                        <p className="text-xs text-slate-500 mb-1">影响字段</p>
                        <div className="flex flex-wrap gap-2">
                          {impact.affectedFields.map((field) => (
                            <span
                              key={field}
                              className="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded"
                            >
                              {field}
                            </span>
                          ))}
                          {impact.affectedFields.length === 0 && (
                            <span className="text-xs text-slate-400">
                              无直接影响字段
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-3">
                      {impact.description}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <div className="card overflow-hidden">
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          旧备注
                        </h3>
                        {oldNote && (
                          <p className="text-xs text-slate-500">
                            {oldNote.author} ·{' '}
                            {format(
                              new Date(oldNote.createdAt),
                              'yyyy-MM-dd HH:mm'
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="badge badge-default">旧版本</span>
                  </div>
                </div>
                <div className="p-5 bg-slate-50/50">
                  <div className="font-mono text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {oldNote ? (
                      diffResult.map((line, idx) =>
                        line.type === 'same' ? (
                          <div key={idx}>{line.old || '\u00A0'}</div>
                        ) : line.type === 'removed' ? (
                          <div
                            key={idx}
                            className="bg-danger-50 text-danger-700 line-through rounded px-1 -mx-1"
                          >
                            {line.text || '\u00A0'}
                          </div>
                        ) : null
                      )
                    ) : (
                      <span className="text-slate-400 italic">
                        请选择旧版本备注
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden border-2 border-accent-200">
                <div className="px-5 py-4 bg-accent-50 border-b border-accent-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent-100 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-accent-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          新备注
                        </h3>
                        {newNote && (
                          <p className="text-xs text-slate-500">
                            {newNote.author} ·{' '}
                            {format(
                              new Date(newNote.createdAt),
                              'yyyy-MM-dd HH:mm'
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="badge badge-success">新版本</span>
                  </div>
                </div>
                <div className="p-5 bg-accent-50/30">
                  <div className="font-mono text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {newNote ? (
                      diffResult.map((line, idx) =>
                        line.type === 'same' ? (
                          <div key={idx}>{line.new || '\u00A0'}</div>
                        ) : line.type === 'added' ? (
                          <div
                            key={idx}
                            className="bg-accent-100 text-accent-800 rounded px-1 -mx-1"
                          >
                            {line.text || '\u00A0'}
                          </div>
                        ) : null
                      )
                    ) : (
                      <span className="text-slate-400 italic">
                        请选择新版本备注
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-brand-600" />
                结论对比
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-slate-500">
                      旧结论
                    </span>
                    {oldVersion && (
                      <span className="text-xs text-slate-400">
                        v{oldVersion.version}
                      </span>
                    )}
                  </div>
                  {oldVersion ? (
                    <>
                      <div className="text-3xl font-serif font-bold text-slate-700 mb-2">
                        {oldVersion.positiveRate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {oldVersion.conclusion}
                      </p>
                      {oldVersion.processingOpinion && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs text-slate-500 mb-1">
                            处理意见
                          </p>
                          <p className="text-sm text-slate-600">
                            {oldVersion.processingOpinion}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">暂无对应版本</p>
                  )}
                </div>

                <div className="p-4 bg-accent-50 rounded-lg border border-accent-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-medium text-accent-700">
                      新结论
                    </span>
                    {newVersion && (
                      <span className="text-xs text-accent-500">
                        v{newVersion.version}
                      </span>
                    )}
                    <CheckCircle2 className="w-4 h-4 text-accent-500 ml-auto" />
                  </div>
                  {newVersion ? (
                    <>
                      <div className="text-3xl font-serif font-bold text-accent-700 mb-2">
                        {newVersion.positiveRate.toFixed(1)}%
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {newVersion.conclusion}
                      </p>
                      {newVersion.processingOpinion && (
                        <div className="mt-3 pt-3 border-t border-accent-200">
                          <p className="text-xs text-accent-600 mb-1">
                            处理意见
                          </p>
                          <p className="text-sm text-slate-700">
                            {newVersion.processingOpinion}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 text-sm">暂无对应版本</p>
                  )}
                </div>
              </div>

              {oldVersion && newVersion && (
                <div className="mt-4 p-4 bg-warning-50 rounded-lg border border-warning-200">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-warning-800">
                        变化摘要
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-warning-700">
                        <li className="flex items-center gap-2">
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          阳性率变化：
                          <span
                            className={cn(
                              'font-medium',
                              newVersion.positiveRate > oldVersion.positiveRate
                                ? 'text-accent-700'
                                : 'text-danger-700'
                            )}
                          >
                            {newVersion.positiveRate > oldVersion.positiveRate
                              ? '+'
                              : ''}
                            {(
                              newVersion.positiveRate - oldVersion.positiveRate
                            ).toFixed(1)}
                            %
                          </span>
                        </li>
                        {oldVersion.conclusion !== newVersion.conclusion && (
                          <li className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5" />
                            结论描述有更新
                          </li>
                        )}
                        {newVersion.processingOpinion &&
                          oldVersion.processingOpinion !==
                            newVersion.processingOpinion && (
                            <li className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5" />
                              处理意见有调整
                            </li>
                          )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                备注版本历史
              </h3>
              <div className="space-y-3">
                {notes.map((note, idx) => (
                  <div
                    key={note.id}
                    className={cn(
                      'p-4 rounded-lg border transition-colors',
                      note.id === newNoteId
                        ? 'bg-accent-50 border-accent-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-800">
                          v{notes.length - idx}
                        </span>
                        {note.isLatest && (
                          <span className="badge badge-success">最新</span>
                        )}
                        {note.id === oldNoteId && (
                          <span className="badge badge-default">对比基准</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {note.author}
                        </span>
                        <span>{format(new Date(note.createdAt), 'MM-dd HH:mm')}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {note.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
