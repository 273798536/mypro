import { useState, useCallback, useRef, useEffect } from 'react';
import type { LogLine, LogLevel } from '@/types';

const Tpl = (d: [number, number], l: LogLevel, m: string) => ({ delay: d, level: l, message: m });

const RERUN_TEMPLATE = [
  Tpl([100, 300], 'INFO', '[Step 1/5] 加载事件 EVT-ORD-7f3d9a2b1c 上下文...'),
  Tpl([200, 400], 'INFO', '  ↳ 读取 callchain: ok, 4 nodes loaded'),
  Tpl([300, 600], 'INFO', '[Step 2/5] 连接数据库 order-mysql-master...'),
  Tpl([400, 700], 'WARN', '  ↳ 注意: 检测到 idx_order_created_at 当前状态 = INVALID'),
  Tpl([500, 800], 'INFO', '[Step 3/5] 重放原 SQL 查询...'),
  Tpl([800, 1400], 'INFO', '  ↳ EXPLAIN: type=ALL, rows=2,847,392, filtered=11.34%'),
  Tpl([400, 700], 'ERROR', '  ↳ 扫描行数超出阈值 (284万 > 10万) - 异常确认'),
  Tpl([300, 500], 'INFO', '[Step 4/5] 执行 ANALYZE TABLE order_main 更新统计信息...'),
  Tpl([1500, 2500], 'INFO', '  ↳ OK, 0 row affected, 耗时 3.27s'),
  Tpl([400, 700], 'INFO', '[Step 5/5] 二次执行相同 SQL...'),
  Tpl([500, 900], 'SUCCESS', '  ↳ EXPLAIN: type=RANGE, key=idx_order_created_at, rows=3,276'),
  Tpl([200, 400], 'SUCCESS', ''),
  Tpl([100, 300], 'SUCCESS', '=== 重放执行完成 ==='),
  Tpl([100, 300], 'SUCCESS', '结论: 索引失效根因确认（统计信息过旧），ANALYZE 后修复验证通过'),
];

const BACKFILL_TEMPLATE = [
  Tpl([100, 300], 'INFO', '[Step 1/4] 读取缺失数据清单...'),
  Tpl([200, 500], 'INFO', '  ↳ 识别缺失记录: 订单 EXC-20260618-0004'),
  Tpl([300, 600], 'INFO', '[Step 2/4] 从支付中心拉取补录源数据 (2026-06-17 17:00 ~ 18:00)'),
  Tpl([1200, 2000], 'INFO', '  ↳ 拉取完成, 共 1 条匹配记录 (金额 299.00 元)'),
  Tpl([400, 700], 'INFO', '[Step 3/4] 写入 order_payment 补偿写入...'),
  Tpl([800, 1400], 'SUCCESS', '  ↳ 写入 1 行, txn_id = PAY-BF-202606190001'),
  Tpl([400, 700], 'WARN', '[Step 4/4] 一致性校验...'),
  Tpl([500, 900], 'SUCCESS', '  ↳ order_main.total_amount(299.00) === order_payment.amount(299.00) ✓'),
  Tpl([200, 400], 'SUCCESS', ''),
  Tpl([100, 300], 'SUCCESS', '=== 补录执行完成 ==='),
  Tpl([100, 300], 'SUCCESS', '补录成功，异常标记为待人工确认状态'),
];

const MANUAL_CONFIRM_TEMPLATE = [
  Tpl([100, 250], 'INFO', '加载复核上下文...'),
  Tpl([200, 400], 'INFO', '  ↳ 记录: EXC-20260618-0003 (表结构变更)'),
  Tpl([300, 600], 'INFO', '验证复核条件检查项:'),
  Tpl([200, 400], 'INFO', '  ✓ 重放执行通过'),
  Tpl([200, 400], 'INFO', '  ✓ 补录数据确认(无缺失)'),
  Tpl([200, 400], 'INFO', '  ✓ 上下游依赖检查通过'),
  Tpl([400, 800], 'INFO', '  ✓ 权限清单已与基线版本差异确认'),
  Tpl([300, 500], 'SUCCESS', ''),
  Tpl([100, 300], 'SUCCESS', '=== 人工确认完成 ==='),
  Tpl([100, 300], 'SUCCESS', '当前异常已标记为 "已确认"，记录由 "王强" 终审通过'),
];

function getTemplate(actionType: string) {
  switch (actionType) {
    case 'rerun': return RERUN_TEMPLATE;
    case 'backfill': return BACKFILL_TEMPLATE;
    default: return MANUAL_CONFIRM_TEMPLATE;
  }
}

function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export interface UseTypewriterLogReturn {
  logLines: LogLine[];
  isRunning: boolean;
  status: 'idle' | 'running' | 'success' | 'failed';
  summary: string | null;
  start: () => void;
  reset: () => void;
}

export function useTypewriterLog(actionType: 'rerun' | 'backfill' | 'manual_confirm'): UseTypewriterLogReturn {
  const [logLines, setLogLines] = useState<LogLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'failed'>('idle');
  const [summary, setSummary] = useState<string | null>(null);
  const abortRef = useRef(false);

  const reset = useCallback(() => {
    abortRef.current = true;
    setLogLines([]);
    setIsRunning(false);
    setStatus('idle');
    setSummary(null);
  }, []);

  const start = useCallback(async () => {
    abortRef.current = false;
    setLogLines([]);
    setIsRunning(true);
    setStatus('running');
    setSummary(null);

    const template = getTemplate(actionType);

    for (let i = 0; i < template.length; i++) {
      if (abortRef.current) return;
      const item = template[i];
      const [min, max] = item.delay;
      await new Promise<void>((r) => setTimeout(r, randRange(min, max)));
      if (abortRef.current) return;

      const line: LogLine = {
        timestamp: formatTimestamp(),
        level: item.level,
        message: item.message,
      };
      setLogLines((prev) => [...prev, line]);
    }

    if (abortRef.current) return;
    setIsRunning(false);
    const finalStatus: 'success' | 'failed' = 'success';
    setStatus(finalStatus);

    const last = template[template.length - 1];
    setSummary(last.message || '操作完成');
  }, [actionType]);

  useEffect(() => {
    return () => { abortRef.current = true; };
  }, []);

  return { logLines, isRunning, status, summary, start, reset };
}
