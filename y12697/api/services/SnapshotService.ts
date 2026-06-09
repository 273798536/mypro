import path from 'path';
import { SnapshotRepository } from '../repositories/SnapshotRepository.js';
import type { Snapshot, SnapshotStatus, RiskLevel } from '../../shared/types.js';

export const SnapshotService = {
  list(options?: { status?: SnapshotStatus; riskLevel?: RiskLevel; keyword?: string }): Snapshot[] {
    return SnapshotRepository.findAll(options);
  },

  get(id: string): Snapshot | null {
    return SnapshotRepository.findById(id);
  },

  importSnapshots(files: Express.Multer.File[], operator: string): Snapshot[] {
    const results: Snapshot[] = [];
    let idx = Date.now();
    for (const file of files) {
      idx += 1;
      const code = `SNAP-${String(idx).padStart(6, '0')}`;
      const originalName = file.originalname.replace(/\.[^/.]+$/, '');
      const deviceName = originalName || `设备-${idx}`;
      const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
      const randomLevel = levels[Math.floor(Math.random() * levels.length)];
      const snap = SnapshotRepository.create({
        code,
        deviceName,
        thumbnail: `/uploads/${path.basename(file.path)}`,
        imagePath: `/uploads/${path.basename(file.path)}`,
        status: 'pending',
        riskLevel: randomLevel,
        lastOperator: operator,
      });
      results.push(snap);
    }
    return results;
  },

  updateStatus(id: string, status: SnapshotStatus, operator: string): Snapshot | null {
    return SnapshotRepository.update(id, { status, lastOperator: operator });
  },
};
