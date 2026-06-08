import { useEffect, useState } from 'react';
import { useRecordsStore } from '@/store/records';
import { REIMPORT_TEST_CASE_A, REIMPORT_TEST_CASE_B, downloadAsJson } from '@/mock/reimportCase';
import { SectionTitle, EmptyState } from '@/components/common/Badges';
import { AlertTriangle, FileJson, Play, RefreshCcw, Download, CheckCircle2, XCircle } from 'lucide-react';
import { formatDateTime } from '@/utils/formatters';

export default function ReimportTest() {
  const initializeIfNeeded = useRecordsStore((s) => s.initializeIfNeeded);
  const importFromRaw = useRecordsStore((s) => s.importFromRawRecords);
  const records = useRecordsStore((s) => s.records);
  const batches = useRecordsStore((s) => s.batches);

  const [step, setStep] = useState<'idle' | 'a' | 'b'>('idle');
  const [log, setLog] = useState<{ kind: 'ok' | 'err' | 'info'; msg: string; time: string }[]>([]);

  useEffect(() => {
    initializeIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushLog = (kind: 'ok' | 'err' | 'info', msg: string) => {
    setLog((l) => [{ kind, msg, time: new Date().toLocaleTimeString() }, ...l].slice(0, 30));
  };

  const countBefore = records.length;
  const dupTestA = records.filter((r) => r.deviceCode === 'MIC-T01').length;
  const dupTestB = records.filter((r) => r.deviceCode === 'MIC-T02' || r.deviceCode === 'MIC-T03').length;
  const testBatches = batches.filter((b) => b.name.startsWith('测试重复导入'));

  const doStepA = () => {
    downloadAsJson(REIMPORT_TEST_CASE_A, 'test-reimport-case-A.json');
    const res = importFromRaw(REIMPORT_TEST_CASE_A, '测试重复导入-批次A');
    pushLog('ok', `[批次A] 导入完成：新增 ${res.added} 条，跳过重复 ${res.skipped} 条`);
    setStep('a');
  };

  const doStepB = () => {
    downloadAsJson(REIMPORT_TEST_CASE_B, 'test-reimport-case-B.json');
    const res = importFromRaw(REIMPORT_TEST_CASE_B, '测试重复导入-批次B');
    const expectedAdded = 1;
    const expectedSkipped = 1;
    const ok = res.added === expectedAdded && res.skipped === expectedSkipped;
    pushLog(
      ok ? 'ok' : 'err',
      `[批次B] 导入完成：新增 ${res.added} 条（期望 ${expectedAdded}），跳过重复 ${res.skipped} 条（期望 ${expectedSkipped}）`
    );
    pushLog(ok ? 'ok' : 'err', ok ? '✓ 测试通过：重复记录被正确去重，不会越跑越乱' : '✗ 测试失败：去重逻辑异常');
    setStep('b');
  };

  const reset = () => {
    setStep('idle');
    setLog([]);
    pushLog('info', '已重置测试步骤，请依次下载并导入批次 A、批次 B');
  };

  const passed = step === 'b' && log.some((l) => l.msg.includes('测试通过'));

  return (
    <div className="h-full overflow-y-auto p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold font-display flex items-center gap-2">
          <AlertTriangle className="text-anomaly-warn" size={20} />
          重复导入测试场景
        </h1>
        <p className="text-sm text-hall-textDim mt-1">
          验证"看上去能跑、实际越跑越乱"的典型问题。按步骤执行，系统应自动识别并跳过重复记录。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <StepCard
          title="步骤 1：导入批次 A"
          desc="2 条全新记录（MIC-T01、MIC-T02），应全部被导入。"
          buttonText={step === 'idle' ? '下载 JSON 并导入' : '已执行'}
          onRun={doStepA}
          disabled={step !== 'idle'}
          done={step !== 'idle'}
        />
        <StepCard
          title="步骤 2：导入批次 B"
          desc="1 条与批次 A 重复（MIC-T01）+ 1 条新增（MIC-T03），应只导入 1 条。"
          buttonText={step === 'a' ? '下载 JSON 并导入' : step === 'b' ? '已执行' : '请先执行步骤 1'}
          onRun={doStepB}
          disabled={step !== 'a'}
          done={step === 'b'}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <MetricCard label="导入前记录总数" value={countBefore} />
        <MetricCard
          label="MIC-T01（重复）命中数"
          value={dupTestA}
          hint={`步骤B后期望值 = 1（只保留1条，不重复累积）`}
          tone={dupTestA <= 1 ? 'ok' : 'err'}
        />
        <MetricCard
          label="MIC-T02 / T03 记录数"
          value={dupTestB}
          hint={`两个各1条，合计 2`}
          tone={dupTestB <= 2 ? 'ok' : 'err'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <section className="card p-4">
          <SectionTitle
            right={
              <button onClick={reset} className="btn btn-ghost !px-2 !py-1 text-[11px]">
                <RefreshCcw size={12} /> 重置
              </button>
            }
          >
            执行日志
          </SectionTitle>
          {log.length === 0 ? (
            <EmptyState title="尚未开始" desc="点击上方步骤开始验证" />
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {log.map((l, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${
                    l.kind === 'ok'
                      ? 'bg-status-usable/5 text-status-usable'
                      : l.kind === 'err'
                      ? 'bg-status-unusable/5 text-status-unusable'
                      : 'bg-hall-bg text-hall-textDim'
                  }`}
                >
                  {l.kind === 'ok' && <CheckCircle2 size={13} className="mt-0.5 shrink-0" />}
                  {l.kind === 'err' && <XCircle size={13} className="mt-0.5 shrink-0" />}
                  {l.kind === 'info' && <FileJson size={13} className="mt-0.5 shrink-0" />}
                  <div className="flex-1">
                    <div>{l.msg}</div>
                    <div className="text-[10px] opacity-60 mt-0.5">{l.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <SectionTitle>相关测试批次</SectionTitle>
          {testBatches.length === 0 ? (
            <EmptyState title="暂无测试批次" desc="执行步骤后会在此显示" />
          ) : (
            <ul className="space-y-2">
              {testBatches.map((b) => (
                <li key={b.id} className="p-2 rounded border border-hall-border bg-hall-bg/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{b.name}</span>
                    <span className="text-[11px] text-hall-textMute">{b.recordCount} 条</span>
                  </div>
                  <div className="text-[11px] text-hall-textMute mt-1">
                    {b.importedBy} · {formatDateTime(b.importedAt)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {step === 'b' && (
            <div
              className={`mt-4 p-3 rounded border text-xs ${
                passed
                  ? 'bg-status-usable/10 border-status-usable/40 text-status-usable'
                  : 'bg-status-unusable/10 border-status-unusable/40 text-status-unusable'
              }`}
            >
              {passed ? '✓ 测试通过：重复导入去重机制工作正常。' : '✗ 测试失败：请检查日志并排查去重逻辑。'}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StepCard({
  title,
  desc,
  buttonText,
  onRun,
  disabled,
  done,
}: {
  title: string;
  desc: string;
  buttonText: string;
  onRun: () => void;
  disabled?: boolean;
  done?: boolean;
}) {
  return (
    <section className={`card p-4 ${done ? 'border-status-usable/40' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-semibold font-display">{title}</div>
        {done && <CheckCircle2 size={16} className="text-status-usable" />}
      </div>
      <div className="text-xs text-hall-textDim mb-3">{desc}</div>
      <button onClick={onRun} disabled={disabled} className="btn btn-primary disabled:opacity-50 w-full justify-center">
        <Play size={13} /> {buttonText}
      </button>
      <div className="mt-2 text-[10px] text-hall-textMute/70 flex items-center gap-1">
        <Download size={10} /> JSON 会下载到本地，也同步导入到系统中
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: 'ok' | 'err';
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wider text-hall-textMute/80">{label}</div>
      <div
        className={`text-2xl font-semibold font-display mt-1 ${
          tone === 'ok' ? 'text-status-usable' : tone === 'err' ? 'text-status-unusable' : 'text-hall-text'
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-hall-textMute mt-1">{hint}</div>}
    </div>
  );
}
