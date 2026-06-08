import { useState } from 'react';
import { FlaskConical, Copy, FilePlus, EyeOff, CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';
import { useRecordsStore } from '@/store/useRecordsStore';
import type { RiskNote, FinalConclusion } from '@/types';
import { fmtDate, fmtRisk } from '@/utils/format';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TestCardProps {
  title: string;
  description: string;
  Icon: typeof FlaskConical;
  iconColor: string;
  children: React.ReactNode;
}

function TestCard({ title, description, Icon, iconColor, children }: TestCardProps) {
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconColor)}>
            <Icon size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

interface ResultDisplayProps {
  label: string;
  children: React.ReactNode;
}

function ResultDisplay({ label, children }: ResultDisplayProps) {
  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-lg overflow-hidden">
      <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-800">
        <span className="text-[11px] font-medium text-slate-400">{label}</span>
      </div>
      <div className="p-3">
        {children}
      </div>
    </div>
  );
}

function NoteSummary({ note }: { note: RiskNote }) {
  const risk = fmtRisk(note.level);
  return (
    <div className="bg-slate-900/50 rounded p-2 mb-1.5 last:mb-0 border border-slate-800">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-medium border shrink-0', risk.cls)}>
          {risk.label}
        </span>
        <span className="text-[9px] text-slate-500 font-mono">{note.id.slice(-8)}</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed mb-1">{note.content}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-500">
        <span>部件: {note.part_id}</span>
        <span>时间: {fmtDate(note.created_at)}</span>
        {note.is_duplicate && (
          <span className="text-amber-400">⚠ 重复 (of: {note.duplicate_of?.slice(-6)})</span>
        )}
        {note.is_misread && (
          <span className="text-slate-500 line-through">已排除: {note.misread_reason}</span>
        )}
      </div>
    </div>
  );
}

function ConclusionSummary({ conc }: { conc: FinalConclusion }) {
  return (
    <div className="bg-slate-900/50 rounded p-2 mb-1.5 last:mb-0 border border-slate-800">
      <div className="flex items-start justify-between gap-2 mb-1">
        <span
          className={cn(
            'px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0',
            conc.verdict === 'pass'
              ? 'bg-emerald-500/20 text-emerald-300'
              : conc.verdict === 'fail'
              ? 'bg-rose-500/20 text-rose-300'
              : 'bg-amber-500/20 text-amber-300'
          )}
        >
          {conc.verdict === 'pass' ? '通过' : conc.verdict === 'fail' ? '不通过' : '待处理'}
        </span>
        <span className="text-[9px] text-slate-500 font-mono">{conc.id.slice(-8)}</span>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed mb-1">{conc.summary}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-500">
        <span>部件: {conc.part_id}</span>
        <span>时间: {fmtDate(conc.finalized_at)}</span>
        <span>关联: {conc.linked_note_ids.length} 条</span>
        {conc.is_supplement && <span className="text-cyan-400">✎ 补录</span>}
      </div>
      {conc.supplements && (
        <div className="mt-1.5 pt-1.5 border-t border-slate-800">
          <div className="text-[9px] text-cyan-400 mb-0.5">补录内容:</div>
          <p className="text-[10px] text-slate-400 whitespace-pre-line">{conc.supplements}</p>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  const riskNotes = useRecordsStore((s) => s.riskNotes);
  const conclusions = useRecordsStore((s) => s.conclusions);
  const addRiskNote = useRecordsStore((s) => s.addRiskNote);
  const markMisread = useRecordsStore((s) => s.markMisread);
  const finalizeConclusion = useRecordsStore((s) => s.finalizeConclusion);

  const [test1Result, setTest1Result] = useState<{
    before: number;
    after: number;
    note1: RiskNote | null;
    note2: RiskNote | null;
  } | null>(null);

  const [test2Result, setTest2Result] = useState<{
    before: number;
    after: number;
    conclusion: FinalConclusion | null;
    merged: boolean;
  } | null>(null);

  const [test3Result, setTest3Result] = useState<{
    noteId: string;
    before: RiskNote | null;
    after: RiskNote | null;
  } | null>(null);

  function runTest1() {
    const beforeCount = riskNotes.length;
    const baseTime = Math.floor(Date.now() / 60000) * 60000;

    const payload = {
      part_id: 'heating_jacket',
      content: '测试重复导入：夹套温度异常波动（重复数据）',
      level: 'medium' as const,
      created_at: baseTime,
      created_by: '测试员',
      clip_x: 0,
      clip_y: 0,
      clip_z: 0,
    };

    const { note: note1 } = addRiskNote(payload);
    const { note: note2 } = addRiskNote(payload);

    const state = useRecordsStore.getState();
    setTest1Result({
      before: beforeCount,
      after: state.riskNotes.length,
      note1: state.riskNotes.find((n) => n.id === note1.id) || null,
      note2: state.riskNotes.find((n) => n.id === note2.id) || null,
    });
  }

  function runTest2() {
    const beforeCount = conclusions.length;
    const now = Date.now();

    const payload1 = {
      part_id: 'stirring_shaft',
      summary: '测试补录：搅拌轴外观检查通过（第一次记录）',
      verdict: 'pass' as const,
      finalized_at: now,
      finalized_by: '测试工程师',
      linked_note_ids: [],
    };

    finalizeConclusion(payload1);

    const payload2 = {
      part_id: 'stirring_shaft',
      summary: '测试补录：搅拌轴外观检查通过（第二次补录，补充细节）',
      verdict: 'pass' as const,
      finalized_at: now,
      finalized_by: '测试工程师',
      linked_note_ids: [],
      supplements: `补录说明：\n- 补充检查了轴头密封\n- 确认无磨损痕迹\n- 补录时间: ${fmtDate(now)}`,
    };

    const { merged } = finalizeConclusion(payload2);

    const state = useRecordsStore.getState();
    const finalConc = state.conclusions.find((c) => c.part_id === 'stirring_shaft' && c.finalized_at === now) || null;

    setTest2Result({
      before: beforeCount,
      after: state.conclusions.length,
      conclusion: finalConc,
      merged,
    });
  }

  function runTest3() {
    const baseTime = Math.floor(Date.now() / 60000) * 60000 - 3600000;

    const { note } = addRiskNote({
      part_id: 'temp_sensor',
      content: '测试误读排除：温度传感器读数异常（实际为误读）',
      level: 'high',
      created_at: baseTime,
      created_by: '测试员',
      clip_x: 0,
      clip_y: 0,
      clip_z: 0,
    });

    const beforeNote = useRecordsStore.getState().riskNotes.find((n) => n.id === note.id) || null;

    markMisread(note.id, 'timing_mismatch');

    const afterNote = useRecordsStore.getState().riskNotes.find((n) => n.id === note.id) || null;

    setTest3Result({
      noteId: note.id,
      before: beforeNote,
      after: afterNote,
    });
  }

  function resetAll() {
    localStorage.removeItem('risk_notes');
    localStorage.removeItem('conclusions');
    location.reload();
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <FlaskConical size={22} className="text-cyan-400" />
              数据导入测试页
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              验证去重、补录、误读排除等核心数据逻辑
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-lg border border-slate-700/50">
              <Database size={14} className="text-slate-500" />
              <span className="text-xs text-slate-400">
                Notes: <span className="text-slate-200 font-mono">{riskNotes.length}</span>
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-xs text-slate-400">
                Conclusions: <span className="text-slate-200 font-mono">{conclusions.length}</span>
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={resetAll}>
              <RefreshCw size={12} />
              重置数据
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TestCard
            title="重复导入测试"
            description="连续导入同一条风险备注 2 次（同 part_id，同 created_at 取整到分钟），验证第二条被标记为重复。"
            Icon={Copy}
            iconColor="bg-amber-500/20 text-amber-400"
          >
            <Button size="sm" variant="primary" className="w-full" onClick={runTest1}>
              <Copy size={14} />
              重复导入同一条风险备注 2 次
            </Button>

            {test1Result && (
              <>
                <div className="flex items-center gap-4 px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-200 font-mono">{test1Result.before}</div>
                    <div className="text-[10px] text-slate-500">导入前</div>
                  </div>
                  <div className="text-slate-600">→</div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-cyan-400 font-mono">{test1Result.after}</div>
                    <div className="text-[10px] text-slate-500">导入后</div>
                  </div>
                  <div className="ml-auto">
                    {test1Result.after === test1Result.before + 2 ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 size={12} /> 数量正确
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-rose-400">
                        <AlertCircle size={12} /> 数量异常
                      </span>
                    )}
                  </div>
                </div>

                <ResultDisplay label="前后对比 / Diff">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-500 mb-1 font-medium">第 1 条 (原始)</div>
                      {test1Result.note1 && <NoteSummary note={test1Result.note1} />}
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 mb-1 font-medium">第 2 条 (应重复)</div>
                      {test1Result.note2 && <NoteSummary note={test1Result.note2} />}
                    </div>
                  </div>
                  {test1Result.note1 && test1Result.note2 && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      {test1Result.note2.is_duplicate && test1Result.note2.duplicate_of === test1Result.note1.id ? (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 size={12} /> 去重生效：第2条正确标记 is_duplicate=true，duplicate_of 指向第1条
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] text-rose-400">
                          <AlertCircle size={12} /> 去重未生效
                        </span>
                      )}
                    </div>
                  )}
                </ResultDisplay>
              </>
            )}
          </TestCard>

          <TestCard
            title="补录测试"
            description="对同一部件同一天生成两条最终结论，验证第二条变成补录（合并到第一条），不新增记录，supplements 追加。"
            Icon={FilePlus}
            iconColor="bg-cyan-500/20 text-cyan-400"
          >
            <Button size="sm" variant="primary" className="w-full" onClick={runTest2}>
              <FilePlus size={14} />
              对同一部件生成两条最终结论
            </Button>

            {test2Result && (
              <>
                <div className="flex items-center gap-4 px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800">
                  <div className="text-center">
                    <div className="text-lg font-bold text-slate-200 font-mono">{test2Result.before}</div>
                    <div className="text-[10px] text-slate-500">导入前</div>
                  </div>
                  <div className="text-slate-600">→</div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-cyan-400 font-mono">{test2Result.after}</div>
                    <div className="text-[10px] text-slate-500">导入后</div>
                  </div>
                  <div className="ml-auto">
                    {test2Result.after === test2Result.before + 1 ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 size={12} /> 合并正确（只+1）
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-rose-400">
                        <AlertCircle size={12} /> 合并失败
                      </span>
                    )}
                  </div>
                </div>

                <ResultDisplay label="合并结果">
                  {test2Result.conclusion && (
                    <>
                      <ConclusionSummary conc={test2Result.conclusion} />
                      <div className="mt-2 pt-2 border-t border-slate-800">
                        <div className="flex gap-4">
                          {test2Result.merged ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 size={12} /> merged=true
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-rose-400">
                              <AlertCircle size={12} /> merged=false
                            </span>
                          )}
                          {test2Result.conclusion.is_supplement ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 size={12} /> is_supplement=true
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-rose-400">
                              <AlertCircle size={12} /> is_supplement=false
                            </span>
                          )}
                          {test2Result.conclusion.supplements ? (
                            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 size={12} /> supplements已追加
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-rose-400">
                              <AlertCircle size={12} /> supplements为空
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </ResultDisplay>
              </>
            )}
          </TestCard>

          <TestCard
            title="误读排除测试"
            description="标记一条 riskNote 为 misread 后，在 RiskNoteList 的正常结果中不显示（showMisread=false 时过滤）。"
            Icon={EyeOff}
            iconColor="bg-rose-500/20 text-rose-400"
          >
            <Button size="sm" variant="primary" className="w-full" onClick={runTest3}>
              <EyeOff size={14} />
              创建并标记为误读
            </Button>

            {test3Result && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">标记前</div>
                    {test3Result.before && <NoteSummary note={test3Result.before} />}
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 mb-1 font-medium">标记后</div>
                    {test3Result.after && <NoteSummary note={test3Result.after} />}
                  </div>
                </div>

                <ResultDisplay label="过滤验证">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/50 rounded border border-slate-800">
                      <span className="text-[11px] text-slate-400">showMisread=false（正常结果）</span>
                      <span className="text-[11px] text-slate-500">
                        显示:{' '}
                        <span className={cn(
                          'font-mono font-bold',
                          !riskNotes.filter((n) => n.id === test3Result.noteId && !n.is_misread).length
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        )}>
                          {riskNotes.filter((n) => n.id === test3Result.noteId && !n.is_misread).length} 条
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/50 rounded border border-slate-800">
                      <span className="text-[11px] text-slate-400">showMisread=true（含误读）</span>
                      <span className="text-[11px] text-slate-500">
                        显示:{' '}
                        <span className={cn(
                          'font-mono font-bold',
                          riskNotes.filter((n) => n.id === test3Result.noteId).length
                            ? 'text-cyan-400'
                            : 'text-rose-400'
                        )}>
                          {riskNotes.filter((n) => n.id === test3Result.noteId).length} 条
                        </span>
                      </span>
                    </div>
                  </div>
                  {test3Result.after?.is_misread ? (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 size={12} /> 误读标记成功：is_misread=true，正常结果中已过滤
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <span className="flex items-center gap-1 text-[11px] text-rose-400">
                        <AlertCircle size={12} /> 误读标记失败
                      </span>
                    </div>
                  )}
                </ResultDisplay>
              </>
            )}
          </TestCard>
        </div>

        <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
          <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Database size={12} />
            当前 Store 状态摘要
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
              <div className="text-slate-500 text-[10px] mb-1">风险备注总数</div>
              <div className="text-slate-200 font-mono text-lg font-bold">{riskNotes.length}</div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
              <div className="text-slate-500 text-[10px] mb-1">其中重复</div>
              <div className="text-amber-400 font-mono text-lg font-bold">
                {riskNotes.filter((n) => n.is_duplicate).length}
              </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
              <div className="text-slate-500 text-[10px] mb-1">其中误读</div>
              <div className="text-slate-500 font-mono text-lg font-bold line-through">
                {riskNotes.filter((n) => n.is_misread).length}
              </div>
            </div>
            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
              <div className="text-slate-500 text-[10px] mb-1">最终结论数</div>
              <div className="text-cyan-400 font-mono text-lg font-bold">
                {conclusions.length}
                {conclusions.filter((c) => c.is_supplement).length > 0 && (
                  <span className="text-[10px] ml-1">
                    (+{conclusions.filter((c) => c.is_supplement).length}补录)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
