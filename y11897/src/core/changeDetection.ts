import { CoverageResult, ChangeSummary } from '../types';

export interface PreviousCalculationState {
  radius: number;
  coverageResults: CoverageResult[];
  timestamp: Date;
}

export function detectChanges(
  previousResults: CoverageResult[],
  currentResults: CoverageResult[],
  previousRadius: number,
  newRadius: number
): ChangeSummary | null {
  const previousMap = new Map(previousResults.map(r => [r.residentId, r]));
  const currentMap = new Map(currentResults.map(r => [r.residentId, r]));

  const changes: ChangeSummary['changes'] = [];
  const changedResidentIds: string[] = [];

  for (const [residentId, current] of currentMap.entries()) {
    const previous = previousMap.get(residentId);

    if (!previous) {
      changes.push({
        residentId,
        previous: { covered: false, distance: Infinity },
        current: { covered: current.covered, distance: current.distance }
      });
      changedResidentIds.push(residentId);
      continue;
    }

    const coveredChanged = previous.covered !== current.covered;
    const distanceChanged = Math.abs(previous.distance - current.distance) > 0.01;

    if (coveredChanged || distanceChanged) {
      changes.push({
        residentId,
        previous: { covered: previous.covered, distance: previous.distance },
        current: { covered: current.covered, distance: current.distance }
      });
      changedResidentIds.push(residentId);
    }
  }

  for (const [residentId, previous] of previousMap.entries()) {
    if (!currentMap.has(residentId)) {
      changes.push({
        residentId,
        previous: { covered: previous.covered, distance: previous.distance },
        current: { covered: false, distance: Infinity }
      });
      changedResidentIds.push(residentId);
    }
  }

  if (changes.length === 0) {
    return null;
  }

  return {
    changedResidentIds,
    changedCount: changes.length,
    previousRadius,
    newRadius,
    changes
  };
}

export function generateChangeReport(changeSummary: ChangeSummary): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('服务半径更新影响报告');
  lines.push('='.repeat(60));
  lines.push(`原半径: ${changeSummary.previousRadius} 米`);
  lines.push(`新半径: ${changeSummary.newRadius} 米`);
  lines.push(`变动居民点数: ${changeSummary.changedCount}`);
  lines.push('');

  const newlyCovered = changeSummary.changes.filter(
    c => !c.previous.covered && c.current.covered
  );
  const noLongerCovered = changeSummary.changes.filter(
    c => c.previous.covered && !c.current.covered
  );
  const distanceChanged = changeSummary.changes.filter(
    c => c.previous.covered === c.current.covered && isFinite(c.previous.distance)
  );

  if (newlyCovered.length > 0) {
    lines.push(`【新增覆盖】 ${newlyCovered.length} 个居民点从"未覆盖"变为"已覆盖":`);
    newlyCovered.slice(0, 10).forEach(c => {
      lines.push(`  - ${c.residentId}: 距离 ${c.current.distance.toFixed(1)} 米`);
    });
    if (newlyCovered.length > 10) {
      lines.push(`  ... 还有 ${newlyCovered.length - 10} 个`);
    }
    lines.push('');
  }

  if (noLongerCovered.length > 0) {
    lines.push(`【失去覆盖】 ${noLongerCovered.length} 个居民点从"已覆盖"变为"未覆盖":`);
    noLongerCovered.slice(0, 10).forEach(c => {
      lines.push(`  - ${c.residentId}: 距离 ${c.current.distance.toFixed(1)} 米`);
    });
    if (noLongerCovered.length > 10) {
      lines.push(`  ... 还有 ${noLongerCovered.length - 10} 个`);
    }
    lines.push('');
  }

  if (distanceChanged.length > 0) {
    lines.push(`【距离变动】 ${distanceChanged.length} 个居民点覆盖状态未变但距离有更新`);
    lines.push('');
  }

  const radiusDiff = changeSummary.newRadius - changeSummary.previousRadius;
  if (radiusDiff > 0) {
    lines.push(`分析: 半径增加 ${radiusDiff} 米，覆盖率预计提升。`);
  } else if (radiusDiff < 0) {
    lines.push(`分析: 半径减少 ${Math.abs(radiusDiff)} 米，覆盖率预计下降，请确认是否合理。`);
  }

  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

export class CalculationHistory {
  private history: PreviousCalculationState[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 10) {
    this.maxHistorySize = maxHistorySize;
  }

  addState(radius: number, coverageResults: CoverageResult[]): void {
    const state: PreviousCalculationState = {
      radius,
      coverageResults: JSON.parse(JSON.stringify(coverageResults)),
      timestamp: new Date()
    };

    this.history.unshift(state);

    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
  }

  getLatest(): PreviousCalculationState | null {
    return this.history[0] || null;
  }

  getPrevious(): PreviousCalculationState | null {
    return this.history[1] || null;
  }

  compareWithPrevious(
    currentRadius: number,
    currentResults: CoverageResult[]
  ): ChangeSummary | null {
    const previous = this.getLatest();
    if (!previous) return null;

    return detectChanges(
      previous.coverageResults,
      currentResults,
      previous.radius,
      currentRadius
    );
  }

  clear(): void {
    this.history = [];
  }

  getAll(): PreviousCalculationState[] {
    return [...this.history];
  }
}
