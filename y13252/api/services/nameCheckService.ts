import type { Photo } from '../../shared/types.js';

export interface NameCheckResult {
  mismatches: Photo[];
  totalChecked: number;
}

export function checkPhotoNames(photos: Photo[]): NameCheckResult {
  const mismatches: Photo[] = [];
  
  for (const photo of photos) {
    const isMismatch = photo.originalName !== photo.systemName;
    photo.isNameMismatch = isMismatch;
    if (isMismatch) {
      mismatches.push(photo);
    }
  }
  
  return {
    mismatches,
    totalChecked: photos.length
  };
}

export function formatNameMismatchInfo(photo: Photo): string {
  return `原始文件名"${photo.originalName}"与系统重命名"${photo.systemName}"不一致，` +
    `可能导致早晚高峰巡检口径不一致，需核实照片实际拍摄地点。`;
}

export function compareNames(name1: string, name2: string): number {
  let differences = 0;
  const minLen = Math.min(name1.length, name2.length);
  
  for (let i = 0; i < minLen; i++) {
    if (name1[i] !== name2[i]) {
      differences++;
    }
  }
  
  differences += Math.abs(name1.length - name2.length);
  return differences;
}
