export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

export function hashConfig(config: { projects: { id: string }[]; debt: { totalDebt: number }; totalRounds: number }): number {
  let hash = 0;
  const str = config.projects.map((p) => p.id).join(',') + ':' + config.debt.totalDebt + ':' + config.totalRounds;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export function formatMoney(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 100000000) {
    return (amount / 100000000).toFixed(2) + '亿';
  }
  if (abs >= 10000) {
    return (amount / 10000).toFixed(2) + '万';
  }
  return amount.toLocaleString('zh-CN');
}

export function formatPercent(rate: number): string {
  return (rate * 100).toFixed(2) + '%';
}
