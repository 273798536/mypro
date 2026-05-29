export class SeededRandom {
  private _seed: number;

  constructor(seed: number) {
    this._seed = seed;
  }

  get seed(): number {
    return this._seed;
  }

  next(): number {
    this._seed = (this._seed * 9301 + 49297) % 233280;
    return this._seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function generateRunId(): string {
  return `run_${Date.now()}_${generateId()}`;
}
