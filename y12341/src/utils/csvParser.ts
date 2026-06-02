import type { Experiment, TemperaturePoint, CSVMapping } from '@/types';

export interface ParseResult {
  experiments: Experiment[];
  errors: string[];
  totalRows: number;
}

export function parseCSV(content: string, fileName: string): ParseResult {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { experiments: [], errors: ['CSV文件为空或数据不足'], totalRows: 0 };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const errors: string[] = [];

  const timeIdx = headers.findIndex(
    (h) => h.includes('time') || h.includes('时间') || h.includes('t(s)') || h === 't'
  );
  const tempIdx = headers.findIndex(
    (h) => h.includes('temp') || h.includes('温度') || h.includes('°c') || h === 'temp'
  );
  const materialIdx = headers.findIndex(
    (h) => h.includes('material') || h.includes('材料') || h.includes('id')
  );
  const thicknessIdx = headers.findIndex(
    (h) => h.includes('thick') || h.includes('厚度') || h.includes('d(')
  );
  const boundaryIdx = headers.findIndex(
    (h) => h.includes('boundary') || h.includes('边界') || h.includes('t_boundary')
  );
  const sensorIdx = headers.findIndex(
    (h) => h.includes('sensor') || h.includes('传感器')
  );
  const batchIdx = headers.findIndex(
    (h) => h.includes('batch') || h.includes('批次')
  );

  if (timeIdx === -1 || tempIdx === -1) {
    errors.push('CSV必须包含时间列和温度列');
    return { experiments: [], errors, totalRows: lines.length - 1 };
  }

  const dataRows = lines.slice(1).filter((line) => line.trim().length > 0);
  const experiments: Experiment[] = [];
  const batchId = `batch-${Date.now()}`;

  const groupedByKey: Map<string, TemperaturePoint[]> = new Map();
  const groupMetadata: Map<
    string,
    { materialId: string | null; thickness: number | null; boundaryTemp: number | null }
  > = new Map();

  dataRows.forEach((line) => {
    const values = line.split(',').map((v) => v.trim());

    const time = parseFloat(values[timeIdx]);
    const temp = parseFloat(values[tempIdx]);

    if (isNaN(time) || isNaN(temp)) {
      return;
    }

    const point: TemperaturePoint = {
      time,
      temperature: temp,
      sensorId: sensorIdx >= 0 ? parseInt(values[sensorIdx]) || 1 : 1,
    };

    const materialId =
      materialIdx >= 0 && values[materialIdx]
        ? values[materialIdx].toString()
        : null;
    const thickness =
      thicknessIdx >= 0 && values[thicknessIdx]
        ? parseFloat(values[thicknessIdx])
        : null;
    const boundaryTemp =
      boundaryIdx >= 0 && values[boundaryIdx]
        ? parseFloat(values[boundaryIdx])
        : null;

    const groupKey = materialId
      ? `${materialId}::${fileName}`
      : `__no_material__::${fileName}`;

    if (!groupedByKey.has(groupKey)) {
      groupedByKey.set(groupKey, []);
      groupMetadata.set(groupKey, {
        materialId,
        thickness,
        boundaryTemp,
      });
    } else {
      const existing = groupMetadata.get(groupKey)!;
      if (existing.thickness == null && thickness != null) {
        existing.thickness = thickness;
      }
      if (existing.boundaryTemp == null && boundaryTemp != null) {
        existing.boundaryTemp = boundaryTemp;
      }
    }

    groupedByKey.get(groupKey)!.push(point);
  });

  let groupIndex = 0;
  groupedByKey.forEach((points, groupKey) => {
    const metadata = groupMetadata.get(groupKey)!;
    const expId = `exp-${batchId}-${groupIndex}`;

    const sortedPoints = [...points].sort((a, b) => a.time - b.time);

    experiments.push({
      id: expId,
      materialId: metadata.materialId,
      thickness: metadata.thickness,
      boundaryTemp: metadata.boundaryTemp,
      temperaturePoints: sortedPoints,
      sourceFile: fileName,
      batchId,
      status: 'pending',
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    groupIndex++;
  });

  return { experiments, errors, totalRows: dataRows.length };
}

export function detectColumns(content: string): CSVMapping | null {
  const firstLine = content.split(/\r?\n/)[0];
  if (!firstLine) return null;

  const headers = firstLine.split(',').map((h) => h.trim().toLowerCase());

  const mapping: CSVMapping = {
    timeColumn: '',
    tempColumn: '',
  };

  for (const h of headers) {
    if ((h.includes('time') || h.includes('时间') || h.includes('t(s)')) && !mapping.timeColumn) {
      mapping.timeColumn = h;
    }
    if ((h.includes('temp') || h.includes('温度') || h.includes('°c')) && !mapping.tempColumn) {
      mapping.tempColumn = h;
    }
    if (h.includes('material') || h.includes('材料') || h.includes('id')) {
      mapping.materialColumn = h;
    }
    if (h.includes('thick') || h.includes('厚度')) {
      mapping.thicknessColumn = h;
    }
    if (h.includes('boundary') || h.includes('边界')) {
      mapping.boundaryTempColumn = h;
    }
    if (h.includes('sensor') || h.includes('传感器')) {
      mapping.sensorColumn = h;
    }
  }

  return mapping.timeColumn && mapping.tempColumn ? mapping : null;
}

export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
