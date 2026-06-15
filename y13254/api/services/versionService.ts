import * as materialRepo from '../repositories/materialRepo';
import type { Material, MaterialType } from '../../shared/types';

function payloadTitle(payload: any): string {
  if (!payload) return '';
  return (
    payload.title ??
    payload.name ??
    payload.fileName ??
    payload.url ??
    JSON.stringify(payload).slice(0, 64)
  );
}

function payloadFilePath(payload: any): string {
  if (!payload) return '';
  return payload.path ?? payload.url ?? payload.file ?? '';
}

export async function createNextVersion(
  locationId: string,
  type: MaterialType,
  partial: Omit<Material, 'id' | 'version' | 'previousVersionId' | 'hasCaliberChange'>
): Promise<Material> {
  const currentCount = materialRepo.countByLocationAndType(locationId, type);
  const nextVersion = currentCount + 1;

  const existingVersions = materialRepo.listVersionsByLocationAndType(locationId, type);
  const previousVersion = existingVersions[0] ?? null;

  let hasCaliberChange: 0 | 1 = 0;
  if (previousVersion) {
    const prevTitle = payloadTitle(previousVersion.payload);
    const newTitle = payloadTitle(partial.payload);
    const prevPath = payloadFilePath(previousVersion.payload);
    const newPath = payloadFilePath(partial.payload);
    if (prevTitle !== newTitle || prevPath !== newPath) {
      hasCaliberChange = 1;
    }
  }

  const created = materialRepo.createMaterial({
    locationId,
    type,
    version: nextVersion,
    previousVersionId: previousVersion?.id ?? null,
    payload: partial.payload,
    hasCaliberChange,
    changeNote: partial.changeNote,
    capturedAt: partial.capturedAt,
    submittedBy: partial.submittedBy
  });

  return created;
}
