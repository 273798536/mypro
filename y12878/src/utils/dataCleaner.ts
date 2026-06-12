import type {
  WeatherData,
  WeatherRaw,
  CleanStep,
  TideData,
  FuelRecord,
  DuplicateGroup,
} from '@/types';

function nowISO(): string {
  return new Date().toISOString();
}

function createStep(
  step: string,
  before: unknown,
  after: unknown,
  reason: string,
  operator: 'system' | 'user' = 'system',
): CleanStep {
  return {
    step,
    before,
    after,
    reason,
    operator,
    timestamp: nowISO(),
  };
}

export function parseRemark(remark: string): Partial<WeatherData> {
  const result: Partial<WeatherData> = {};
  if (!remark) return result;

  const text = remark.trim();

  const windSpeedMatch = text.match(/风速\s*(\d+(?:\.\d+)?)\s*(?:m\/s|米\/秒|级)?/i);
  if (windSpeedMatch) {
    result.windSpeed = parseFloat(windSpeedMatch[1]);
  }

  const windSpeedAltMatch = text.match(/风\s*(:|：)?\s*(\d+(?:\.\d+)?)\s*(?:m\/s|米\/秒|级)/i);
  if (!result.windSpeed && windSpeedAltMatch) {
    result.windSpeed = parseFloat(windSpeedAltMatch[2]);
  }

  const directions = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const dirPattern = directions.map(d => d).join('|');
  const windDirRegex = new RegExp(
    `(?:(?:${dirPattern})风|风(?:向)?\\s*(:|：)?\\s*(${dirPattern}))`,
    'i',
  );
  const windDirMatch = text.match(windDirRegex);
  if (windDirMatch) {
    const matched = windDirMatch[0];
    for (const dir of directions) {
      if (matched.includes(dir)) {
        result.windDirection = dir;
        break;
      }
    }
  }

  const waveHeightMatch = text.match(/浪高\s*(\d+(?:\.\d+)?)\s*(?:m|米)?/i);
  if (waveHeightMatch) {
    result.waveHeight = parseFloat(waveHeightMatch[1]);
  }

  const waveAltMatch = text.match(/浪\s*(:|：)?\s*(\d+(?:\.\d+)?)\s*(?:m|米)/i);
  if (!result.waveHeight && waveAltMatch) {
    result.waveHeight = parseFloat(waveAltMatch[2]);
  }

  const tempMatch = text.match(/气温\s*(-?\d+(?:\.\d+)?)\s*(?:℃|°C|度)?/i);
  if (tempMatch) {
    result.temperature = parseFloat(tempMatch[1]);
  }

  const tempAltMatch = text.match(/温\s*(:|：)?\s*(-?\d+(?:\.\d+)?)\s*(?:℃|°C|度)/i);
  if (result.temperature === undefined && tempAltMatch) {
    result.temperature = parseFloat(tempAltMatch[2]);
  }

  return result;
}

export function fillNullValues(rawRecords: WeatherRaw[]): {
  data: WeatherRaw[];
  steps: CleanStep[];
} {
  const steps: CleanStep[] = [];
  const sorted = [...rawRecords].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const fields: (keyof WeatherRaw)[] = ['windSpeed', 'windDirection', 'waveHeight', 'temperature'];

  const result = sorted.map((record, idx) => {
    const newRecord: WeatherRaw & { nullFillSource?: string; isNullFilled?: boolean } = { ...record };
    let filled = false;

    for (const field of fields) {
      if (record[field] !== null && record[field] !== undefined) continue;

      let prevIdx = idx - 1;
      while (prevIdx >= 0 && (sorted[prevIdx][field] === null || sorted[prevIdx][field] === undefined)) {
        prevIdx--;
      }

      let nextIdx = idx + 1;
      while (
        nextIdx < sorted.length &&
        (sorted[nextIdx][field] === null || sorted[nextIdx][field] === undefined)
      ) {
        nextIdx++;
      }

      if (prevIdx >= 0 && nextIdx < sorted.length) {
        const prevTime = new Date(sorted[prevIdx].timestamp).getTime();
        const nextTime = new Date(sorted[nextIdx].timestamp).getTime();
        const currTime = new Date(record.timestamp).getTime();
        const timeDiff = nextTime - prevTime;

        if (timeDiff > 0 && nextTime - currTime <= 3600000 && currTime - prevTime <= 3600000) {
          const prevVal = sorted[prevIdx][field];
          const nextVal = sorted[nextIdx][field];

          if (typeof prevVal === 'number' && typeof nextVal === 'number') {
            const ratio = (currTime - prevTime) / timeDiff;
            const interpolated = prevVal + (nextVal - prevVal) * ratio;
            (newRecord as unknown as Record<string, unknown>)[field] = Number(interpolated.toFixed(2));
            newRecord.isNullFilled = true;
            newRecord.nullFillSource = `前后1小时线性插值（来源：${sorted[prevIdx].timestamp} 和 ${sorted[nextIdx].timestamp}）`;
            filled = true;
          } else if (typeof prevVal === 'string' && typeof nextVal === 'string' && prevVal === nextVal) {
            (newRecord as unknown as Record<string, unknown>)[field] = prevVal;
            newRecord.isNullFilled = true;
            newRecord.nullFillSource = `前后值一致填充（来源：${sorted[prevIdx].timestamp} 和 ${sorted[nextIdx].timestamp}）`;
            filled = true;
          }
        }
      } else if (prevIdx >= 0) {
        const prevTime = new Date(sorted[prevIdx].timestamp).getTime();
        const currTime = new Date(record.timestamp).getTime();
        if (currTime - prevTime <= 3600000) {
          const prevVal = sorted[prevIdx][field];
          if (prevVal !== null && prevVal !== undefined) {
            (newRecord as unknown as Record<string, unknown>)[field] = prevVal;
            newRecord.isNullFilled = true;
            newRecord.nullFillSource = `前向1小时填充（来源：${sorted[prevIdx].timestamp}）`;
            filled = true;
          }
        }
      } else if (nextIdx < sorted.length) {
        const nextTime = new Date(sorted[nextIdx].timestamp).getTime();
        const currTime = new Date(record.timestamp).getTime();
        if (nextTime - currTime <= 3600000) {
          const nextVal = sorted[nextIdx][field];
          if (nextVal !== null && nextVal !== undefined) {
            (newRecord as unknown as Record<string, unknown>)[field] = nextVal;
            newRecord.isNullFilled = true;
            newRecord.nullFillSource = `后向1小时填充（来源：${sorted[nextIdx].timestamp}）`;
            filled = true;
          }
        }
      }
    }

    if (filled) {
      steps.push(
        createStep(
          '空值填充',
          record,
          newRecord,
          newRecord.nullFillSource || '前后时间窗口插值填充',
        ),
      );
    }

    return newRecord as WeatherRaw;
  });

  return { data: result, steps };
}

function countNonNullFields(record: WeatherRaw): number {
  const fields: (keyof WeatherRaw)[] = ['windSpeed', 'windDirection', 'waveHeight', 'temperature'];
  return fields.filter(f => record[f] !== null && record[f] !== undefined).length;
}

function roundCoord(n: number | undefined | null, decimals = 4): string {
  if (n === undefined || n === null) return 'null';
  return Number(n).toFixed(decimals);
}

function getFingerprint(record: WeatherRaw): string {
  const lat = roundCoord(record.lat);
  const lng = roundCoord(record.lng);
  return `${record.timestamp}|${lat}|${lng}`;
}

export function removeDuplicates(records: WeatherRaw[]): {
  data: WeatherRaw[];
  removed: WeatherRaw[];
  steps: CleanStep[];
} {
  const steps: CleanStep[] = [];
  const groups = new Map<string, WeatherRaw[]>();

  for (const record of records) {
    const fp = getFingerprint(record);
    if (!groups.has(fp)) {
      groups.set(fp, []);
    }
    groups.get(fp)!.push(record);
  }

  const kept: WeatherRaw[] = [];
  const removed: WeatherRaw[] = [];

  for (const [fp, group] of groups.entries()) {
    if (group.length === 1) {
      kept.push(group[0]);
      continue;
    }

    const sorted = [...group].sort((a, b) => countNonNullFields(b) - countNonNullFields(a));
    const best = sorted[0];
    kept.push({ ...best, isDuplicateRemoved: true } as WeatherRaw);
    const dupes = sorted.slice(1);
    removed.push(...dupes);

    steps.push(
      createStep(
        '重复去重',
        group,
        best,
        `指纹[${fp}]发现${group.length}条重复，保留非空字段最多(${countNonNullFields(best)}个)的记录`,
      ),
    );
  }

  return { data: kept, removed, steps };
}

function generateFingerprint(data: unknown): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `fp_${Math.abs(hash).toString(16)}_${str.length}`;
}

export function cleanWeatherPipeline(rawRecords: WeatherRaw[]): {
  cleaned: WeatherData[];
  steps: CleanStep[];
  sourceFingerprint: string;
} {
  const allSteps: CleanStep[] = [];
  const sourceFingerprint = generateFingerprint(rawRecords);
  const parsedFromRemarkMap = new Map<string, boolean>();

  const remarkParsed: WeatherRaw[] = rawRecords.map(record => {
    const parsed = parseRemark(record.remark);
    const merged: WeatherRaw = { ...record };
    let parsedAny = false;

    for (const key of Object.keys(parsed) as (keyof WeatherRaw)[]) {
      if (parsed[key as keyof typeof parsed] !== undefined) {
        if (merged[key] === null || merged[key] === undefined) {
          (merged as unknown as Record<string, unknown>)[key] = parsed[key as keyof typeof parsed];
          parsedAny = true;
        }
      }
    }

    parsedFromRemarkMap.set(record.timestamp, parsedAny);

    if (parsedAny) {
      allSteps.push(
        createStep('备注解析', record, merged, `从备注"${record.remark}"解析出结构化数据`),
      );
    }

    return merged;
  });

  const { data: filledData, steps: fillSteps } = fillNullValues(remarkParsed);
  allSteps.push(...fillSteps);

  const { data: dedupedData, steps: dedupSteps } = removeDuplicates(filledData);
  allSteps.push(...dedupSteps);

  const cleaned: WeatherData[] = dedupedData.map((r, idx) => {
    const rawWithExtra = r as WeatherRaw & {
      isNullFilled?: boolean;
      nullFillSource?: string;
      isDuplicateRemoved?: boolean;
    };
    return {
      id: `weather_${Date.now()}_${idx}`,
      fuelRecordId: '',
      timestamp: r.timestamp,
      windSpeed: r.windSpeed ?? 0,
      windDirection: r.windDirection,
      waveHeight: r.waveHeight ?? 0,
      temperature: r.temperature ?? 0,
      remark: r.remark,
      lat: r.lat ?? undefined,
      lng: r.lng ?? undefined,
      isNullFilled: rawWithExtra.isNullFilled ?? false,
      nullFillSource: rawWithExtra.nullFillSource ?? '',
      isDuplicateRemoved: rawWithExtra.isDuplicateRemoved ?? false,
      parsedFromRemark: parsedFromRemarkMap.get(r.timestamp) ?? false,
    };
  });

  return { cleaned, steps: allSteps, sourceFingerprint };
}

export function correctTimezoneError(tide: TideData): {
  corrected: TideData;
  steps: CleanStep[];
} {
  const steps: CleanStep[] = [];
  const originalTz = tide.timezone || 'UTC+0';

  const tzMatch = originalTz.match(/UTC([+-]\d{1,2})/i);
  const offsetHours = tzMatch ? parseInt(tzMatch[1], 10) : 0;

  if (offsetHours === 8) {
    return {
      corrected: { ...tide, hasTimezoneError: false },
      steps: [
        createStep('时区校验', tide, tide, '时区已是UTC+8，无需修正'),
      ],
    };
  }

  if (!tide.timestamp) {
    return {
      corrected: { ...tide, hasTimezoneError: false },
      steps: [
        createStep('时区校验', tide, tide, '缺少 timestamp，无法修正时区'),
      ],
    };
  }

  const originalTime = new Date(tide.timestamp);
  const correctedTime = new Date(originalTime.getTime() + (8 - offsetHours) * 3600000);

  const corrected: TideData = {
    ...tide,
    timestamp: correctedTime.toISOString(),
    timezone: 'UTC+8',
    hasTimezoneError: true,
  };

  steps.push(
    createStep(
      '时区修正',
      tide,
      corrected,
      `时区从${originalTz}(偏移${offsetHours}小时)修正为UTC+8，时间点调整+${8 - offsetHours}小时`,
    ),
  );

  return { corrected, steps };
}

export function detectDuplicateRecords(fuelRecords: FuelRecord[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const used = new Set<number>();
  const sorted = [...fuelRecords].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    const record = sorted[i];
    const recordTime = new Date(record.timestamp).getTime();
    const recordDate = record.timestamp.slice(0, 10);
    const cluster: number[] = [i];

    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;

      const other = sorted[j];
      if ((other.vesselId ?? '') !== (record.vesselId ?? '')) continue;

      const otherDate = other.timestamp.slice(0, 10);
      if (otherDate !== recordDate) continue;

      const otherTime = new Date(other.timestamp).getTime();
      if (Math.abs(otherTime - recordTime) > 3600000) continue;

      cluster.push(j);
    }

    if (cluster.length >= 2) {
      const clusterRecords = cluster.map(idx => sorted[idx]);
      cluster.forEach(idx => used.add(idx));

      const conflictingFields: string[] = [];
      const numericFields: (keyof FuelRecord)[] = ['fuelConsumption', 'speed', 'lat', 'lng'];

      for (const field of numericFields) {
        const values = clusterRecords.map(r => r[field]);
        const nonNull = values.filter(v => v !== undefined && v !== null) as number[];
        if (nonNull.length < 2) continue;
        const max = Math.max(...nonNull);
        const min = Math.min(...nonNull);
        if (max !== min) {
          conflictingFields.push(field);
        }
      }

      let similaritySum = 0;
      let pairCount = 0;

      for (let a = 0; a < clusterRecords.length; a++) {
        for (let b = a + 1; b < clusterRecords.length; b++) {
          pairCount++;
          let fieldScore = 0;
          let totalFields = 0;

          for (const field of numericFields) {
            totalFields++;
            const va = clusterRecords[a][field];
            const vb = clusterRecords[b][field];
            if (va === undefined || va === null || vb === undefined || vb === null) {
              fieldScore += 0.5;
            } else if (va === vb) {
              fieldScore += 1;
            } else {
              const numVa = Number(va);
              const numVb = Number(vb);
              const max = Math.max(Math.abs(numVa), Math.abs(numVb));
              const diffRatio = Math.abs(numVa - numVb) / (max || 1);
              fieldScore += Math.max(0, 1 - diffRatio);
            }
          }

          const timeA = new Date(clusterRecords[a].timestamp).getTime();
          const timeB = new Date(clusterRecords[b].timestamp).getTime();
          const timeDiff = Math.abs(timeA - timeB);
          totalFields++;
          if (timeDiff === 0) {
            fieldScore += 1;
          } else {
            fieldScore += Math.max(0, 1 - timeDiff / 3600000);
          }

          similaritySum += fieldScore / totalFields;
        }
      }

      const confidence = pairCount > 0 ? similaritySum / pairCount : 0;

      groups.push({
        groupId: `${record.vesselId ?? ''}_${recordDate}_${recordTime}`,
        records: clusterRecords.map(r => r.id),
        conflictingFields,
        confidence: Number(confidence.toFixed(3)),
        resolved: false,
      });
    }
  }

  return groups;
}
