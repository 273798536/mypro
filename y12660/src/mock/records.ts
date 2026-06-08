import type { SoundRecord, ImportBatch } from '@/types';
import { mockBatches } from './batches';
import { generateSoundRays } from './hallGeometry';
import { uid } from '@/utils/formatters';

function mk(
  batch: ImportBatch,
  idx: number,
  overrides: Partial<SoundRecord> = {}
): SoundRecord {
  const baseX = -8 + (idx % 5) * 4;
  const baseZ = -8 + Math.floor(idx / 5) * 5;
  const recordId = uid('r_');
  return {
    id: recordId,
    batchId: batch.id,
    deviceCode: `MIC-${String(100 + idx).padStart(3, '0')}`,
    deviceCoordinates: { x: baseX, y: 1.5, z: baseZ },
    rawRemark: `A区 第${idx + 1}号点位`,
    availabilityStatus: 'review_needed',
    anomalies: [],
    processNotes: [],
    paramChanges: [],
    soundRays: generateSoundRays(recordId, baseX, baseZ),
    cameraView: {
      id: uid('cv_'),
      recordId,
      isValid: true,
      position: [0, 8, 15],
      target: [0, 2, -5],
      fov: 50,
      label: '默认视角',
    },
    ...overrides,
  };
}

const b1 = mockBatches[0];
const b2 = mockBatches[1];

export const mockRecords: SoundRecord[] = [
  mk(b1, 0, { availabilityStatus: 'usable', reviewedBy: '李工', reviewedAt: '2026-06-02T09:00:00' }),
  mk(b1, 1),
  mk(b1, 2, { deviceCoordinates: { x: null, y: 1.5, z: -3 } }),
  mk(b1, 3, { rawRemark: 'B区mic/003|北侧\\备注混写测试' }),
  mk(b1, 4, {
    cameraView: { id: uid('cv_'), recordId: '', isValid: false, position: [0, 0, 0], target: [0, 0, 0], fov: 50 },
  }),
  mk(b1, 5, { deviceCode: 'MIC-101', deviceCoordinates: { x: -4, y: 1.5, z: -8 } }),
  mk(b1, 6, { availabilityStatus: 'unusable', reviewedBy: '王工', reviewedAt: '2026-06-03T11:20:00' }),
  mk(b1, 7, { rawRemark: 'C区靠近包厢' }),

  mk(b2, 0),
  mk(b2, 1, { availabilityStatus: 'usable' }),
  mk(b2, 2, { deviceCoordinates: { x: 4, y: null, z: 2 } }),
  mk(b2, 3, { rawRemark: '备注中英文Digit123无分隔' }),
  mk(b2, 4, {
    cameraView: { id: uid('cv_'), recordId: '', isValid: false, position: [0, 0, 0], target: [0, 0, 0], fov: 50 },
  }),
  mk(b2, 5),
].map((r) => ({ ...r, soundRays: r.soundRays.map((ray) => ({ ...ray, recordId: r.id })), cameraView: r.cameraView ? { ...r.cameraView, recordId: r.id } : undefined }));
