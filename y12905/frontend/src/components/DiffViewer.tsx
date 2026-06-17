import { useMemo } from 'react';

interface Op { type: 'equal' | 'insert' | 'delete'; value: string; }

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (/\s/.test(ch) || /[，。、；：？！,.!?;:()\[\]{}<>""'\\/+\-*=、—–]/.test(ch)) {
      if (buf) { tokens.push(buf); buf = ''; }
      tokens.push(ch);
    } else {
      buf += ch;
    }
  }
  if (buf) tokens.push(buf);
  return tokens;
}

function diff(a: string, b: string): Op[] {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const n = ta.length, m = tb.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ta[i] === tb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (ta[i] === tb[j]) { ops.push({ type: 'equal', value: ta[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ type: 'delete', value: ta[i] }); i++; }
    else { ops.push({ type: 'insert', value: tb[j] }); j++; }
  }
  while (i < n) { ops.push({ type: 'delete', value: ta[i] }); i++; }
  while (j < m) { ops.push({ type: 'insert', value: tb[j] }); j++; }
  // coalesce
  const out: Op[] = [];
  let cur: Op | null = null;
  for (const op of ops) {
    if (cur && cur.type === op.type) cur.value += op.value;
    else {
      if (cur) out.push(cur);
      cur = { ...op };
    }
  }
  if (cur) out.push(cur);
  return out;
}

interface Props { a: string; b: string; maxLines?: number; }

export default function DiffViewer({ a, b, maxLines = 8 }: Props) {
  const opsA = useMemo(() => {
    const full = diff(a, b);
    return full.filter(o => o.type !== 'insert');
  }, [a, b]);
  const opsB = useMemo(() => {
    const full = diff(a, b);
    return full.filter(o => o.type !== 'delete');
  }, [a, b]);

  const render = (ops: Op[], side: 'A' | 'B') => (
    <div className="font-mono text-[12px] leading-6 whitespace-pre-wrap break-words">
      {ops.map((op, i) => {
        const cls = op.type === 'equal' ? 'diff-equal'
          : (side === 'A' && op.type === 'delete') ? 'diff-delete'
          : (side === 'B' && op.type === 'insert') ? 'diff-insert'
          : 'diff-equal';
        return (
          <span key={i} className={cls} style={{ animationDelay: `${i * 8}ms` }}>
            {op.value}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-bg-secondary p-3">
      <div>
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-text-secondary font-mono">版本 A · 删除线 = vA 独有</div>
        <div className="max-h-[300px] overflow-auto pr-1" style={{ WebkitLineClamp: maxLines }}>
          {render(opsA, 'A')}
        </div>
      </div>
      <div className="border-l border-border pl-3">
        <div className="mb-1.5 text-[11px] uppercase tracking-wider text-text-secondary font-mono">版本 B · 高亮 = vB 新增</div>
        <div className="max-h-[300px] overflow-auto pr-1">
          {render(opsB, 'B')}
        </div>
      </div>
    </div>
  );
}
