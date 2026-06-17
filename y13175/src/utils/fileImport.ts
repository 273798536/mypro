import { LogBatch, TimeSeriesPoint, SensorPoint } from '@/types';

export interface ParsedLogData {
  batches: Omit<LogBatch, 'id' | 'logId'>[];
  timeSeries: TimeSeriesPoint[];
  sensorPoints: Omit<SensorPoint, 'id' | 'logId'>[];
}

export function parseJSONLog(content: string, fileName: string): ParsedLogData | null {
  try {
    const data = JSON.parse(content);
    const now = new Date().toISOString();

    let timeSeries: TimeSeriesPoint[] = [];
    let sensorPoints: Omit<SensorPoint, 'id' | 'logId'>[] = [];
    let startTime = now;
    let endTime = now;

    if (Array.isArray(data)) {
      if (data.length > 0 && 'timestamp' in data[0]) {
        timeSeries = data as TimeSeriesPoint[];
        if (timeSeries.length > 0) {
          startTime = timeSeries[0].timestamp;
          endTime = timeSeries[timeSeries.length - 1].timestamp;
        }
      } else if (data.length > 0 && 'x' in data[0]) {
        sensorPoints = data.map((p) => ({
          name: p.name || `传感器-${Math.random().toString(36).slice(2, 6)}`,
          x: Number(p.x) || 0,
          y: Number(p.y) || 0,
          z: Number(p.z) || 0,
          type: (p.type as 'laser' | 'detector' | 'reference') || 'detector',
        }));
      }
    } else if (data && typeof data === 'object') {
      if (data.timeSeries && Array.isArray(data.timeSeries)) {
        timeSeries = data.timeSeries;
      }
      if (data.sensorPoints && Array.isArray(data.sensorPoints)) {
        sensorPoints = data.sensorPoints.map((p: any) => ({
          name: p.name || `传感器-${Math.random().toString(36).slice(2, 6)}`,
          x: Number(p.x) || 0,
          y: Number(p.y) || 0,
          z: Number(p.z) || 0,
          type: (p.type as 'laser' | 'detector' | 'reference') || 'detector',
        }));
      }
      if (data.startTime) startTime = data.startTime;
      if (data.endTime) endTime = data.endTime;
      if (timeSeries.length > 0) {
        startTime = timeSeries[0].timestamp;
        endTime = timeSeries[timeSeries.length - 1].timestamp;
      }
    }

    if (timeSeries.length === 0 && sensorPoints.length === 0) {
      const mockCount = 60;
      const mockStart = Date.now() - mockCount * 60000;
      timeSeries = [];
      for (let i = 0; i < mockCount; i++) {
        const values: Record<string, number> = {};
        for (let s = 1; s <= 5; s++) {
          values[`sensor-${s}`] = 0.4 + Math.random() * 0.5;
        }
        timeSeries.push({
          timestamp: new Date(mockStart + i * 60000).toISOString(),
          values,
        });
      }
      startTime = timeSeries[0].timestamp;
      endTime = timeSeries[timeSeries.length - 1].timestamp;
    }

    const batch: Omit<LogBatch, 'id' | 'logId'> = {
      fileName,
      importTime: now,
      importedBy: '当前用户',
      dataPointCount: timeSeries.length || sensorPoints.length,
      dataStartTime: startTime,
      dataEndTime: endTime,
    };

    return {
      batches: [batch],
      timeSeries,
      sensorPoints,
    };
  } catch (e) {
    console.error('JSON 解析失败:', e);
    return null;
  }
}

export function parseCSVLog(content: string, fileName: string): ParsedLogData | null {
  try {
    const lines = content.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return null;
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const now = new Date().toISOString();
    const timeSeries: TimeSeriesPoint[] = [];
    const sensorPoints: Omit<SensorPoint, 'id' | 'logId'>[] = [];

    const hasTimestamp = headers.includes('timestamp') || headers.includes('time');
    const hasXYZ = headers.includes('x') || headers.includes('X');

    if (hasTimestamp || (!hasXYZ && headers.length > 1)) {
      const tsIdx = headers.findIndex((h) => h.toLowerCase() === 'timestamp' || h.toLowerCase() === 'time');
      const valueHeaders = headers.filter((h, i) => i !== tsIdx);

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 2) continue;

        const timestamp = tsIdx >= 0 ? cols[tsIdx] : new Date(Date.now() - (lines.length - i) * 60000).toISOString();
        const values: Record<string, number> = {};
        valueHeaders.forEach((h, idx) => {
          const colIdx = headers.indexOf(h);
          const v = parseFloat(cols[colIdx]);
          if (!isNaN(v)) values[h] = v;
        });

        if (Object.keys(values).length > 0) {
          timeSeries.push({ timestamp, values });
        }
      }
    }

    if (hasXYZ) {
      const xIdx = headers.findIndex((h) => h.toLowerCase() === 'x');
      const yIdx = headers.findIndex((h) => h.toLowerCase() === 'y');
      const zIdx = headers.findIndex((h) => h.toLowerCase() === 'z');
      const nameIdx = headers.findIndex((h) => h.toLowerCase() === 'name');
      const typeIdx = headers.findIndex((h) => h.toLowerCase() === 'type');

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.trim());
        if (cols.length < 3) continue;

        sensorPoints.push({
          name: nameIdx >= 0 ? cols[nameIdx] : `传感器-${i}`,
          x: xIdx >= 0 ? parseFloat(cols[xIdx]) || 0 : (Math.random() - 0.5) * 6,
          y: yIdx >= 0 ? parseFloat(cols[yIdx]) || 0 : (Math.random() - 0.5) * 3,
          z: zIdx >= 0 ? parseFloat(cols[zIdx]) || 0 : (Math.random() - 0.5) * 6,
          type: (typeIdx >= 0 ? (cols[typeIdx] as any) : 'detector') || 'detector',
        });
      }
    }

    if (timeSeries.length === 0 && sensorPoints.length === 0) {
      return null;
    }

    let startTime = now;
    let endTime = now;
    if (timeSeries.length > 0) {
      startTime = timeSeries[0].timestamp;
      endTime = timeSeries[timeSeries.length - 1].timestamp;
    }

    const batch: Omit<LogBatch, 'id' | 'logId'> = {
      fileName,
      importTime: now,
      importedBy: '当前用户',
      dataPointCount: timeSeries.length || sensorPoints.length,
      dataStartTime: startTime,
      dataEndTime: endTime,
    };

    return {
      batches: [batch],
      timeSeries,
      sensorPoints,
    };
  } catch (e) {
    console.error('CSV 解析失败:', e);
    return null;
  }
}

export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function downloadMarkdown(content: string, filename: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
