import { saveAs } from 'file-saver';
import type { Patient, GameRecord, ImportMode, ImportResult, ValidationResult } from '@/types';

const PATIENTS_STORAGE_KEY = 'triage_custom_patients';

export function validatePatientData(data: any): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['数据格式错误，应为数组'] };
  }

  data.forEach((patient: any, index: number) => {
    if (!patient.id) {
      errors.push(`第 ${index + 1} 条数据缺少 id`);
    }
    if (!patient.name) {
      errors.push(`第 ${index + 1} 条数据缺少 name`);
    }
    if (!patient.age || typeof patient.age !== 'number') {
      errors.push(`第 ${index + 1} 条数据 age 应为数字`);
    }
    if (!['male', 'female'].includes(patient.gender)) {
      errors.push(`第 ${index + 1} 条数据 gender 应为 'male' 或 'female'`);
    }
    if (!Array.isArray(patient.symptoms)) {
      errors.push(`第 ${index + 1} 条数据 symptoms 应为数组`);
    }
    if (!['critical', 'urgent', 'normal', 'low'].includes(patient.initialPriority)) {
      errors.push(`第 ${index + 1} 条数据 initialPriority 无效`);
    }
    if (!['critical', 'urgent', 'normal', 'low'].includes(patient.currentPriority)) {
      errors.push(`第 ${index + 1} 条数据 currentPriority 无效`);
    }
    if (typeof patient.maxWaitTime !== 'number') {
      errors.push(`第 ${index + 1} 条数据 maxWaitTime 应为数字`);
    }
    if (typeof patient.treatmentTime !== 'number') {
      errors.push(`第 ${index + 1} 条数据 treatmentTime 应为数字`);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function importPatients(
  newPatients: Patient[],
  mode: ImportMode,
  existingPatients: Patient[]
): ImportResult {
  const result: ImportResult = {
    success: true,
    added: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const validation = validatePatientData(newPatients);
  if (!validation.valid) {
    result.success = false;
    result.errors = validation.errors;
    return result;
  }

  const existingMap = new Map(existingPatients.map(p => [p.id, p]));
  const finalPatients: Patient[] = [];

  switch (mode) {
    case 'overwrite':
      finalPatients.push(...newPatients);
      result.added = newPatients.length;
      break;

    case 'append':
      finalPatients.push(...existingPatients);
      newPatients.forEach(patient => {
        if (existingMap.has(patient.id)) {
          result.skipped++;
          result.errors.push(`患者 ${patient.name} (ID: ${patient.id}) 已存在，已跳过`);
        } else {
          finalPatients.push(patient);
          result.added++;
        }
      });
      break;

    case 'ignore':
      finalPatients.push(...existingPatients);
      newPatients.forEach(patient => {
        if (existingMap.has(patient.id)) {
          result.skipped++;
        } else {
          finalPatients.push(patient);
          result.added++;
        }
      });
      break;
  }

  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(finalPatients));
  return result;
}

export function getStoredPatients(): Patient[] {
  try {
    const data = localStorage.getItem(PATIENTS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function clearStoredPatients(): void {
  localStorage.removeItem(PATIENTS_STORAGE_KEY);
}

export function exportPatients(patients: Patient[]): Blob {
  const dataStr = JSON.stringify(patients, null, 2);
  return new Blob([dataStr], { type: 'application/json;charset=utf-8' });
}

export function downloadPatients(patients: Patient[], filename: string = 'patients.json'): void {
  const blob = exportPatients(patients);
  saveAs(blob, filename);
}

export function exportGameRecordJson(record: GameRecord): Blob {
  const dataStr = JSON.stringify(record, null, 2);
  return new Blob([dataStr], { type: 'application/json;charset=utf-8' });
}

export function exportGameRecordCsv(record: GameRecord): Blob {
  const headers = [
    '时间',
    '事件类型',
    '消息',
    '分数变化',
    '患者ID',
    '诊室ID',
    '详情',
  ];

  const rows = record.events.map(event => [
    new Date(event.timestamp).toLocaleString('zh-CN'),
    event.type,
    event.message,
    event.pointsChange,
    event.patientId || '',
    event.roomId || '',
    event.details ? JSON.stringify(event.details) : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const BOM = '\uFEFF';
  return new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
}

export function downloadGameRecord(
  record: GameRecord,
  format: 'json' | 'csv' = 'json',
  filename?: string
): void {
  const blob = format === 'csv' ? exportGameRecordCsv(record) : exportGameRecordJson(record);
  const defaultName = `分诊成绩_${new Date(record.startTime).toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
  saveAs(blob, `${filename || defaultName}.${format}`);
}

export function getGameRecords(): GameRecord[] {
  try {
    const data = localStorage.getItem('triage_game_records');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function deleteGameRecord(recordId: string): void {
  const records = getGameRecords();
  const filtered = records.filter(r => r.id !== recordId);
  localStorage.setItem('triage_game_records', JSON.stringify(filtered));
}

export function clearGameRecords(): void {
  localStorage.removeItem('triage_game_records');
}

export function generatePatientTemplate(): Patient[] {
  return [
    {
      id: 'template-1',
      name: '示例患者',
      age: 45,
      gender: 'male',
      symptoms: ['胸痛', '呼吸困难'],
      initialPriority: 'critical',
      currentPriority: 'critical',
      waitTime: 0,
      maxWaitTime: 60,
      arrivalTime: Date.now(),
      status: 'waiting',
      source: '示例数据',
      reEvaluateCount: 0,
      history: [],
      treatmentTime: 300,
    },
  ];
}

export function downloadTemplate(): void {
  const template = generatePatientTemplate();
  downloadPatients(template, '患者导入模板.json');
}
