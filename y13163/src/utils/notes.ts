import type { MaintenanceNote } from '@/types';
import { fieldMapping } from '@/data/notes';

export const noteStatusLabels: Record<MaintenanceNote['status'], string> = {
  draft: '草稿',
  submitted: '已提交',
  verified: '已核实',
};

export const noteStatusColors: Record<MaintenanceNote['status'], string> = {
  draft: '#64748B',
  submitted: '#FF6B35',
  verified: '#00C853',
};

export function normalizeNoteFields(note: MaintenanceNote): Record<string, string> {
  const normalized: Record<string, string> = {
    content: note.content,
    source: note.source,
    timestamp: note.timestamp,
    status: note.status,
  };

  for (const [rawField, standardField] of Object.entries(fieldMapping)) {
    if (note.rawFields[rawField] && !normalized[standardField]) {
      normalized[standardField] = note.rawFields[rawField];
    }
  }

  return normalized;
}

export function getFieldMappingInfo(note: MaintenanceNote): Array<{
  rawField: string;
  rawValue: string;
  standardField: string;
}> {
  const mapping: Array<{
    rawField: string;
    rawValue: string;
    standardField: string;
  }> = [];

  for (const [rawField, rawValue] of Object.entries(note.rawFields)) {
    const standardField = fieldMapping[rawField] || 'other';
    mapping.push({
      rawField,
      rawValue,
      standardField,
    });
  }

  return mapping;
}

export function sortNotesByTime(notes: MaintenanceNote[], ascending: boolean = true): MaintenanceNote[] {
  return [...notes].sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return ascending ? timeA - timeB : timeB - timeA;
  });
}

export function groupNotesByDate(notes: MaintenanceNote[]): Record<string, MaintenanceNote[]> {
  const groups: Record<string, MaintenanceNote[]> = {};

  for (const note of notes) {
    const date = new Date(note.timestamp).toISOString().split('T')[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(note);
  }

  return groups;
}

export function getSourceLabel(source: string): string {
  if (source.includes('现场老师')) {
    return `现场老师 · ${source.split('-')[1] || '未知'}`;
  }
  if (source.includes('系统')) {
    return '系统自动';
  }
  if (source.includes('项目助理')) {
    return `项目助理 · ${source.split('-')[1] || '未知'}`;
  }
  return source;
}
