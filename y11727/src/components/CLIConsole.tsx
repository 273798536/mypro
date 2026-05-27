import { useEffect, useRef, useState } from 'react';
import { Terminal, Send } from 'lucide-react';
import { parseCLILine } from '@/lib/cli';
import { useStore } from '@/store';
import { downloadCSV } from '@/lib/export';
import { formatRe, formatVelocity } from '@/lib/sedimentation';
export default function CLIConsole() {
  const [value, setValue] = useState('');
  const {
    samples,
    cliEntries,
    pushCLI,
    addSamples,
    clearSamples,
    clearCLI,
    setFilter,
    selectSample,
    setBanner,
  } = useStore();
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cliEntries]);

  const onExportCSV = () => {
    downloadCSV(samples);
    pushCLI({ kind: 'output', text: `已导出 ${samples.length} 条 CSV` });
  };

  const onSubmit = () => {
    const line = value.trim();
    if (!line) return;
    setValue('');
    pushCLI({ kind: 'input', text: line });
    const res = parseCLILine(line);
    switch (res.kind) {
      case 'help':
        pushCLI({ kind: 'info', text: res.message ?? '' });
        break;
      case 'clear':
        clearCLI();
        clearSamples();
        pushCLI({ kind: 'info', text: '已清空样本与 CLI 历史' });
        break;
      case 'list':
        pushCLI({
          kind: 'info',
          text: `共 ${samples.length} 条样本，筛选=${res.status ?? 'all'}`,
        });
        break;
      case 'filter':
        setFilter((res.status ?? 'all') as any);
        pushCLI({ kind: 'info', text: `筛选设置为 ${res.status ?? 'all'}` });
        break;
      case 'select':
        if (res.id) {
          selectSample(res.id);
          pushCLI({ kind: 'info', text: `已选中 ${res.id}` });
        }
        break;
      case 'export':
        if (res.target === 'csv') onExportCSV();
        else pushCLI({ kind: 'info', text: 'PNG 导出请点击右侧截图按钮' });
        break;
      case 'add':
        if (res.error) {
          pushCLI({ kind: 'error', text: res.error });
          setBanner({ level: 'error', text: res.error });
        } else if (res.samples?.length) {
          addSamples(res.samples);
          const s = res.samples[0];
          pushCLI({
            kind: 'output',
            text: `样本入库 [${s.status}] v=${formatVelocity(s.stokesVelocity)} Re=${formatRe(s.reynolds)}`,
          });
          if (s.errors.length > 0) {
            const level = s.status === 'boundary' ? 'warn' : 'error';
            setBanner({ level, text: s.errors.join('；') });
          } else {
            setBanner(null);
          }
        }
        break;
      default:
        pushCLI({ kind: 'error', text: res.error ?? '未知' });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1f]/80 border border-cyan-500/20 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-500/20 bg-cyan-950/40">
        <Terminal className="w-4 h-4 text-cyan-300" />
        <span className="text-xs text-cyan-200 font-mono">sedimentation-cli</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onExportCSV}
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 text-cyan-200 hover:bg-cyan-500/10"
          >
            export csv
          </button>
          <button
            onClick={() => {
              clearSamples();
              clearCLI();
            }}
            className="text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/40 text-red-200 hover:bg-red-500/10"
          >
            clear
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-2 font-mono text-xs leading-relaxed space-y-0.5">
        {cliEntries.length === 0 && (
          <div className="text-cyan-500/60">
            输入 help 查看命令。示例：
            <br />
            add d=50um ρp=2650 μ=0.001 T=25 H=0.2 src="批次A" note="正常样本"
          </div>
        )}
        {cliEntries.map((e) => (
          <div key={e.id}>
            <span className="text-cyan-500/60">
              {e.kind === 'input' ? '❯ ' : e.kind === 'error' ? '✗ ' : e.kind === 'info' ? 'ℹ ' : '  '}
            </span>
            <span
              className={
                e.kind === 'error'
                  ? 'text-red-300'
                  : e.kind === 'info'
                    ? 'text-cyan-200'
                    : e.kind === 'input'
                      ? 'text-cyan-100'
                      : 'text-emerald-300'
              }
            >
              {e.text}
            </span>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-cyan-500/20 bg-cyan-950/40">
        <span className="text-cyan-400 font-mono text-xs">❯</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSubmit();
          }}
          placeholder="add / list / filter / select / export / clear / help"
          className="flex-1 bg-transparent outline-none text-cyan-100 placeholder-cyan-600/60 font-mono text-xs"
        />
        <button
          onClick={onSubmit}
          className="p-1 rounded text-cyan-300 hover:bg-cyan-500/10"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
