export function parseTaxAndRate(raw: string): {
  taxAmount: number | null;
  exchangeRate: number | null;
} {
  if (!raw) return { taxAmount: null, exchangeRate: null };
  const text = String(raw).trim();

  const patterns: Array<{ type: 'tax' | 'rate' | 'both'; regex: RegExp }> = [
    {
      type: 'both',
      regex: /税\s*费?\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?).*?汇\s*率\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      type: 'both',
      regex: /汇\s*率\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?).*?税\s*费?\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      type: 'both',
      regex: /税\s*费?\s*([0-9]+(?:\.[0-9]+)?)[\/|,，\s]+汇\s*率\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      type: 'both',
      regex: /TAX\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?).*?RATE\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      type: 'both',
      regex: /RATE\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?).*?TAX\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      type: 'tax',
      regex: /(?:税\s*费?|TAX)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
    {
      type: 'rate',
      regex: /(?:汇\s*率|(?:EXCHANGE\s*)?RATE)\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)/i,
    },
  ];

  let taxAmount: number | null = null;
  let exchangeRate: number | null = null;

  for (const p of patterns) {
    const m = text.match(p.regex);
    if (!m) continue;
    if (p.type === 'both') {
      const a = parseFloat(m[1]);
      const b = parseFloat(m[2]);
      if (/汇.*税|rate.*tax/i.test(p.regex.source)) {
        exchangeRate = isNaN(a) ? exchangeRate : a;
        taxAmount = isNaN(b) ? taxAmount : b;
      } else {
        taxAmount = isNaN(a) ? taxAmount : a;
        exchangeRate = isNaN(b) ? exchangeRate : b;
      }
    } else if (p.type === 'tax') {
      const v = parseFloat(m[1]);
      taxAmount = isNaN(v) ? taxAmount : v;
    } else if (p.type === 'rate') {
      const v = parseFloat(m[1]);
      exchangeRate = isNaN(v) ? exchangeRate : v;
    }
    if (taxAmount !== null && exchangeRate !== null) break;
  }

  return { taxAmount, exchangeRate };
}

export function uid(prefix = ''): string {
  return (
    prefix +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}

export function formatDateTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function formatNumber(n: number | null | undefined, digits = 4): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  });
}

export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '¥ ' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
