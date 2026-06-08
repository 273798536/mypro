import Papa from 'papaparse';
import type { ImportRawRecord, DeviceCoordinates } from '@/types';

function parseCoordinate(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function parseJsonFile(file: File): Promise<ImportRawRecord[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSON 文件必须是数组');
  return data.map((d: any) => normalizeRawRecord(d));
}

export async function parseCsvFile(file: File): Promise<ImportRawRecord[]> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (result.errors.length) {
    console.warn('CSV parse warnings:', result.errors);
  }
  return result.data.map((row) => {
    const coords: DeviceCoordinates = {
      x: parseCoordinate(row.x ?? row.coordX),
      y: parseCoordinate(row.y ?? row.coordY),
      z: parseCoordinate(row.z ?? row.coordZ),
    };
    return normalizeRawRecord({
      deviceCode: row.deviceCode ?? row.device_code ?? row.code ?? '',
      deviceCoordinates: coords,
      rawRemark: row.remark ?? row.rawRemark ?? row.note ?? '',
    });
  });
}

function normalizeRawRecord(d: any): ImportRawRecord {
  return {
    deviceCode: String(d.deviceCode ?? d.device_code ?? ''),
    deviceCoordinates: {
      x: parseCoordinate(d.deviceCoordinates?.x ?? d.x),
      y: parseCoordinate(d.deviceCoordinates?.y ?? d.y),
      z: parseCoordinate(d.deviceCoordinates?.z ?? d.z),
    },
    rawRemark: String(d.rawRemark ?? d.remark ?? ''),
    cameraView: d.cameraView
      ? {
          isValid: Boolean(d.cameraView.isValid ?? d.cameraView.valid ?? true),
          position: [
            parseCoordinate(d.cameraView.position?.[0]) ?? 0,
            parseCoordinate(d.cameraView.position?.[1]) ?? 0,
            parseCoordinate(d.cameraView.position?.[2]) ?? 0,
          ] as [number, number, number],
          target: [
            parseCoordinate(d.cameraView.target?.[0]) ?? 0,
            parseCoordinate(d.cameraView.target?.[1]) ?? 0,
            parseCoordinate(d.cameraView.target?.[2]) ?? 0,
          ] as [number, number, number],
          fov: Number(d.cameraView.fov ?? 50),
          label: d.cameraView.label,
        }
      : undefined,
    soundRays: Array.isArray(d.soundRays)
      ? d.soundRays.map((r: any) => ({
          startPoint: [
            parseCoordinate(r.startPoint?.[0]) ?? 0,
            parseCoordinate(r.startPoint?.[1]) ?? 0,
            parseCoordinate(r.startPoint?.[2]) ?? 0,
          ] as [number, number, number],
          endPoint: [
            parseCoordinate(r.endPoint?.[0]) ?? 0,
            parseCoordinate(r.endPoint?.[1]) ?? 0,
            parseCoordinate(r.endPoint?.[2]) ?? 0,
          ] as [number, number, number],
          blockedBy: r.blockedBy,
          energyLoss: Number(r.energyLoss ?? 0),
        }))
      : [],
  };
}

export async function parseImportFile(file: File): Promise<ImportRawRecord[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.json')) return parseJsonFile(file);
  if (name.endsWith('.csv')) return parseCsvFile(file);
  throw new Error('仅支持 .json 或 .csv 文件');
}
