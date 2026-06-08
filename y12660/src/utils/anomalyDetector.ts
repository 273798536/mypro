import type { Anomaly, AnomalySeverity, AnomalyType, SoundRecord, DeviceCoordinates } from '@/types';
import { uid } from '@/utils/formatters';
import { isEqual } from 'lodash-es';

function make(recordId: string, type: AnomalyType, severity: AnomalySeverity, description: string, fieldName?: string): Anomaly {
  return { id: uid('a_'), recordId, type, severity, description, fieldName };
}

function coordKey(c: DeviceCoordinates): string {
  return `${c.x ?? 'null'}|${c.y ?? 'null'}|${c.z ?? 'null'}`;
}

export function detectAnomaliesForBatch(records: SoundRecord[]): Map<string, Anomaly[]> {
  const result = new Map<string, Anomaly[]>();
  records.forEach((r) => result.set(r.id, []));

  const codeCount = new Map<string, string[]>();
  const coordCount = new Map<string, string[]>();

  records.forEach((r) => {
    const list = result.get(r.id)!;

    const c = r.deviceCoordinates;
    if (c.x === null || c.y === null || c.z === null || c.x === undefined || c.y === undefined || c.z === undefined) {
      const emptyFields = ['x', 'y', 'z'].filter((k) => (c as any)[k] === null || (c as any)[k] === undefined).join('/');
      list.push(make(r.id, 'empty_coordinate', 'error', `设备坐标存在空值 (${emptyFields})`, 'deviceCoordinates'));
    }

    if (!r.cameraView || r.cameraView.isValid === false) {
      list.push(make(r.id, 'camera_view_lost', 'error', '该记录相机视角已丢失，请设计师重新标定', 'cameraView'));
    }

    const remark = r.rawRemark ?? '';
    if (remark.length > 0) {
      const hasCN = /[\u4e00-\u9fa5]/.test(remark);
      const hasEN = /[a-zA-Z]/.test(remark);
      const hasNum = /[0-9]/.test(remark);
      const mixedNoSep = hasCN && hasEN && hasNum && !/[\s,，;；\-_|]/.test(remark);
      const specialCount = (remark.match(/[\/\\|]/g) ?? []).length;
      if (mixedNoSep || specialCount > 2) {
        list.push(make(r.id, 'remark_mixed', 'warning', `备注字段内容混写，建议规范化（特殊符号 ${specialCount} 个）`, 'rawRemark'));
      }
    }

    if (!codeCount.has(r.deviceCode)) codeCount.set(r.deviceCode, []);
    codeCount.get(r.deviceCode)!.push(r.id);

    const k = coordKey(r.deviceCoordinates);
    if (!coordCount.has(k)) coordCount.set(k, []);
    coordCount.get(k)!.push(r.id);
  });

  codeCount.forEach((ids, code) => {
    if (ids.length > 1 && code.trim() !== '') {
      ids.forEach((id) => {
        const list = result.get(id)!;
        if (!list.some((a) => a.type === 'duplicate_record')) {
          list.push(make(id, 'duplicate_record', 'error', `同批次内设备编号重复: ${code} (共 ${ids.length} 条)`, 'deviceCode'));
        }
      });
    }
  });

  coordCount.forEach((ids, key) => {
    if (ids.length > 1 && key !== 'null|null|null') {
      ids.forEach((id) => {
        const list = result.get(id)!;
        if (!list.some((a) => a.type === 'duplicate_record' && a.fieldName === 'deviceCoordinates')) {
          list.push(make(id, 'duplicate_record', 'error', `同批次内坐标三元组重复 (共 ${ids.length} 条)`, 'deviceCoordinates'));
        }
      });
    }
  });

  return result;
}

export function isSameRecord(a: { deviceCode: string; deviceCoordinates: DeviceCoordinates }, b: { deviceCode: string; deviceCoordinates: DeviceCoordinates }): boolean {
  if (a.deviceCode && a.deviceCode === b.deviceCode) return true;
  return isEqual(a.deviceCoordinates, b.deviceCoordinates);
}
