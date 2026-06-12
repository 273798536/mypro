import { useEffect, useState } from 'react';
import { Play, RotateCcw, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function RerunButton() {
  const [open, setOpen] = useState(false);
  const running = useAppStore((s) => s.rerunRunning);
  const progress = useAppStore((s) => s.rerunProgress);
  const result = useAppStore((s) => s.rerunResult);
  const start = useAppStore((s) => s.startRerun);
  const reset = useAppStore((s) => s.resetRerun);

  useEffect(() => {
    if (open && !running && !result && progress === 0) {
      // 自动触发一次
    }
  }, [open, running, result, progress]);

  const allPass = result?.every((r) => r.ok) ?? false;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          if (!result) start();
        }}
        className="group inline-flex items-center gap-2 rounded-lg bg-ink-900 px-3.5 py-2 text-[12.5px] font-medium text-paper-50 shadow-card transition-all hover:-translate-y-0.5 hover:bg-ink-950 hover:shadow-cardHover"
      >
        <Play className={cn('h-3.5 w-3.5', running && 'animate-rotateSlow')} />
        算法值班 · 一键重跑
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 backdrop-blur-sm animate-fadeSlideUp"
          onClick={() => setOpen(false)}
        >
          <div
            className="paper-card w-[520px] max-w-[92vw] rounded-xl p-5 shadow-cardHover animate-popIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-[16px] text-ink-900">
                月底封账 · 材料自校验
              </h3>
              <button
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
                className="rounded-md px-2 py-0.5 text-[11.5px] text-slateData-500 hover:bg-gold-700/10"
              >
                关闭
              </button>
            </div>

            <p className="text-[12px] text-slateData-500">
              算法值班人自助运行：加载题目清单 / 撤回记录 / 后补说明 / 参数版本 / 历史 / 解释，若还需问材料放哪则交付不顺。
            </p>

            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[11.5px] text-slateData-500">
                <span>校验进度</span>
                <span className="font-mono-data">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-paper-200">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    running
                      ? 'bg-gradient-to-r from-ink-800 to-ink-900'
                      : allPass
                        ? 'bg-gradient-to-r from-ink-700 to-ink-800'
                        : 'bg-gradient-to-r from-ochre-500 to-ochre-700'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="scroll-thin mt-3 max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
              {(result ?? [
                { key: 'load', label: '正在读取题目清单与计算口径...', ok: running },
              ]).map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    'flex items-start gap-2 rounded-md border px-2.5 py-2 text-[12px]',
                    running
                      ? 'border-gold-700/25 bg-white'
                      : item.ok
                        ? 'border-ink-700/30 bg-ink-900/5'
                        : 'border-ochre-500/40 bg-ochre-100/50'
                  )}
                >
                  {running ? (
                    <Loader2 className="mt-0.5 h-3.5 w-3.5 animate-rotateSlow text-ink-800 shrink-0" />
                  ) : item.ok ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-ink-800 shrink-0" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 text-ochre-700 shrink-0" />
                  )}
                  <div className="flex-1">
                    <div
                      className={cn(
                        item.ok ? 'text-ink-900' : 'text-ochre-900'
                      )}
                    >
                      {item.label}
                    </div>
                    {item.hint && (
                      <div className="mt-0.5 text-[11px] text-slateData-500">
                        {item.hint}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {result && (
              <div
                className={cn(
                  'mt-3 flex items-center justify-between rounded-lg border px-3 py-2.5',
                  allPass
                    ? 'border-ink-800/30 bg-ink-900/5 text-ink-900'
                    : 'border-ochre-500/40 bg-ochre-100/60 text-ochre-900'
                )}
              >
                <div>
                  <div className="font-display text-[13.5px]">
                    {allPass ? '交付顺 ✓ 材料齐全可封账' : '交付不顺 ✗ 请补齐缺失项'}
                  </div>
                  <div className="text-[11.5px] opacity-80">
                    {allPass
                      ? '无需再问材料放哪，自助完成。'
                      : '请按上列提示补全后再次运行。'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    reset();
                    start();
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-ink-900 px-2.5 py-1 text-[11.5px] text-paper-50 hover:bg-ink-950"
                >
                  <RotateCcw className="h-3 w-3" /> 重新校验
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
