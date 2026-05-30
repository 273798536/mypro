import type { GameState, GameHistory, DataSource, Decision, Deduction } from '../engine/types';

export function generateContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function generateDataSourceHash(dataSource: Omit<DataSource, 'id' | 'hash'>): string {
  const content = `${dataSource.type}-${dataSource.title}-${dataSource.content}-${dataSource.originalFile}-${dataSource.timestamp}`;
  return generateContentHash(content);
}

export function generateGameHistoryHash(
  gameId: string,
  mapId: string,
  startTime: number,
  decisions: Decision[],
  deductions: Deduction[]
): string {
  const decisionSignatures = decisions
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(d => `${d.timestamp}-${d.action}-${d.result}`)
    .join('|');
  
  const deductionSignatures = deductions
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(d => `${d.timestamp}-${d.category}-${d.points}`)
    .join('|');

  const content = `${gameId}-${mapId}-${startTime}-${decisionSignatures}-${deductionSignatures}`;
  return generateContentHash(content);
}

export function isDuplicateDataSource(
  newDataSource: DataSource,
  existingDataSources: DataSource[]
): boolean {
  return existingDataSources.some(ds => ds.hash === newDataSource.hash);
}

export function isDuplicateGameHistory(
  newHistory: GameHistory,
  existingHistories: GameHistory[]
): boolean {
  return existingHistories.some(h => h.hash === newHistory.hash);
}

export function findDuplicateDataSource(
  dataSource: DataSource,
  existingDataSources: DataSource[]
): DataSource | undefined {
  return existingDataSources.find(ds => ds.hash === dataSource.hash);
}

export function mergeDataSourceIfNeeded(
  existing: DataSource,
  incoming: DataSource
): DataSource {
  if (existing.hash !== incoming.hash) {
    return incoming;
  }
  
  return {
    ...existing,
    timestamp: Math.min(existing.timestamp, incoming.timestamp)
  };
}

export function detectDataMergeErrors(
  events: Array<{ dataSourceId: string; type: string; timestamp: number; title: string }>,
  dataSources: DataSource[],
  thresholdMinutes: number = 30
): string[] {
  const errors: string[] = [];
  const threshold = thresholdMinutes * 60 * 1000;

  const typeTimeGroups: Record<string, number[]> = {};
  events.forEach(event => {
    if (!typeTimeGroups[event.type]) {
      typeTimeGroups[event.type] = [];
    }
    typeTimeGroups[event.type].push(event.timestamp);
  });

  const weatherEvents = events.filter(e => e.type === 'weather_change');
  const patrolEvents = events.filter(e => e.type === 'patrol_gap');
  
  if (weatherEvents.length > 1 && patrolEvents.length > 1) {
    for (const weather of weatherEvents) {
      for (const patrol of patrolEvents) {
        if (Math.abs(weather.timestamp - patrol.timestamp) < 60) {
          errors.push(
            `数据合并警告: 天气突变事件(${weather.title})与巡逻空窗事件(${patrol.title})` +
            `时间过于接近(${Math.abs(weather.timestamp - patrol.timestamp).toFixed(1)}秒)，` +
            '可能存在数据合并错误，建议人工复核'
          );
        }
      }
    }
  }

  const eventDataSourceIds = new Set(events.map(e => e.dataSourceId));
  const usedDataSources = dataSources.filter(ds => eventDataSourceIds.has(ds.id));
  
  for (let i = 0; i < usedDataSources.length; i++) {
    for (let j = i + 1; j < usedDataSources.length; j++) {
      const a = usedDataSources[i];
      const b = usedDataSources[j];
      
      if (a.type === b.type && Math.abs(a.timestamp - b.timestamp) > threshold) {
        errors.push(
          `数据源时间戳异常: "${a.title}"与"${b.title}"` +
          `时间相差${Math.round(Math.abs(a.timestamp - b.timestamp) / 60000)}分钟，` +
          '可能存在数据混入或导入错误'
        );
      }
      
      if (a.type === b.type && 
          a.content.substring(0, 50) === b.content.substring(0, 50) &&
          a.hash !== b.hash) {
        errors.push(
          `数据完整性警告: "${a.title}"与"${b.title}"内容疑似重复但哈希不同，` +
          '可能存在数据篡改或损坏'
        );
      }
    }
  }

  const dirtyDataSources = dataSources.filter(ds => 
    ds.originalFile.includes('dirty') || 
    ds.title.includes('脏数据') ||
    ds.content.includes('脏样例')
  );
  
  if (dirtyDataSources.length > 0) {
    errors.push(
      `检测到${dirtyDataSources.length}份脏数据样例已被用于本次训练，` +
      '包含：' + dirtyDataSources.map(ds => ds.title).join('、')
    );
  }

  return errors;
}

export function validateDecisionTraceability(
  decision: Decision,
  availableDataSources: DataSource[]
): { valid: boolean; missingSources: string[] } {
  const missingSources: string[] = [];
  
  for (const sourceId of decision.dataSourceIds) {
    const source = availableDataSources.find(ds => ds.id === sourceId);
    if (!source) {
      missingSources.push(sourceId);
    }
  }

  return {
    valid: missingSources.length === 0,
    missingSources
  };
}

export function cleanDirtyData<T extends { id: string; hash?: string }>(
  data: T[],
  rules: {
    checkDuplicate?: boolean;
    checkTimestamp?: boolean;
    minTimestamp?: number;
    maxTimestamp?: number;
  } = {}
): { cleaned: T[]; removed: { item: T; reason: string }[] } {
  const removed: { item: T; reason: string }[] = [];
  const seenHashes = new Set<string>();

  const cleaned = data.filter(item => {
    if (rules.checkDuplicate && item.hash) {
      if (seenHashes.has(item.hash)) {
        removed.push({ item, reason: '重复数据' });
        return false;
      }
      seenHashes.add(item.hash);
    }

    if (rules.checkTimestamp) {
      const timestamp = (item as unknown as { timestamp?: number }).timestamp;
      if (timestamp !== undefined) {
        if (rules.minTimestamp && timestamp < rules.minTimestamp) {
          removed.push({ item, reason: '时间戳过早' });
          return false;
        }
        if (rules.maxTimestamp && timestamp > rules.maxTimestamp) {
          removed.push({ item, reason: '时间戳过晚' });
          return false;
        }
      }
    }

    return true;
  });

  return { cleaned, removed };
}
