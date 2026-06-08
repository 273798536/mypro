import { db, generateId, nowISO } from '../database.js';
import type { SectionParams } from '../../../shared/types.js';

interface SectionParamsRow {
  id: string;
  inspection_id: string;
  batch_id: string;
  beam_height: number;
  pipe_diameter: number;
  ceiling_thickness: number;
  slab_thickness: number;
  floor_elevation: number;
  updated_at: string;
}

function rowToSectionParams(row: SectionParamsRow): SectionParams {
  return {
    id: row.id,
    inspectionId: row.inspection_id,
    batchId: row.batch_id,
    beamHeight: row.beam_height,
    pipeDiameter: row.pipe_diameter,
    ceilingThickness: row.ceiling_thickness,
    slabThickness: row.slab_thickness,
    floorElevation: row.floor_elevation,
    updatedAt: row.updated_at,
  };
}

export const SectionParamsRepository = {
  getByBatch(inspectionId: string, batchId: string): SectionParams | null {
    const row = db
      .prepare('SELECT * FROM section_params WHERE inspection_id = ? AND batch_id = ?')
      .get(inspectionId, batchId) as SectionParamsRow | undefined;
    return row ? rowToSectionParams(row) : null;
  },

  create(data: {
    inspectionId: string;
    batchId: string;
    beamHeight?: number;
    pipeDiameter?: number;
    ceilingThickness?: number;
    slabThickness?: number;
    floorElevation?: number;
  }): SectionParams {
    const id = generateId('param_');
    const now = nowISO();
    db.prepare(
      `INSERT INTO section_params (id, inspection_id, batch_id, beam_height, pipe_diameter, ceiling_thickness, slab_thickness, floor_elevation, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      data.inspectionId,
      data.batchId,
      data.beamHeight ?? 600,
      data.pipeDiameter ?? 150,
      data.ceilingThickness ?? 50,
      data.slabThickness ?? 200,
      data.floorElevation ?? 0,
      now
    );
    return SectionParamsRepository.getByBatch(data.inspectionId, data.batchId)!;
  },

  update(inspectionId: string, batchId: string, data: Partial<{
    beamHeight: number;
    pipeDiameter: number;
    ceilingThickness: number;
    slabThickness: number;
    floorElevation: number;
  }>): void {
    const fields: string[] = [];
    const params: unknown[] = [];
    const map: Record<string, string> = {
      beamHeight: 'beam_height',
      pipeDiameter: 'pipe_diameter',
      ceilingThickness: 'ceiling_thickness',
      slabThickness: 'slab_thickness',
      floorElevation: 'floor_elevation',
    };
    for (const [key, col] of Object.entries(map)) {
      if (key in data && (data as Record<string, unknown>)[key] !== undefined) {
        fields.push(`${col} = ?`);
        params.push((data as Record<string, unknown>)[key]);
      }
    }
    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    params.push(nowISO(), inspectionId, batchId);
    db.prepare(`UPDATE section_params SET ${fields.join(', ')} WHERE inspection_id = ? AND batch_id = ?`).run(...params);
  },
};
