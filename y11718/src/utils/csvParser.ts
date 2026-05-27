import { Measurement, ExperimentData } from '../types';

export function parseCSV(content: string): Partial<ExperimentData>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const experiments: Partial<ExperimentData>[] = [];

  let currentExp: Partial<ExperimentData> | null = null;

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());

    const studentNameIdx = headers.findIndex((h) => h.includes('student') || h.includes('姓名'));
    const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('日期'));
    const tempIdx = headers.findIndex((h) => h.includes('temp') || h.includes('温度'));
    const freqIdx = headers.findIndex((h) => h.includes('freq') || h.includes('频率'));
    const nodeIdx = headers.findIndex((h) => h.includes('node') || h.includes('节点'));
    const lengthIdx = headers.findIndex((h) => h.includes('length') || h.includes('管长'));
    const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('备注'));

    const studentName = studentNameIdx >= 0 ? values[studentNameIdx] : '未知学生';
    const date = dateIdx >= 0 ? values[dateIdx] : new Date().toISOString().split('T')[0];
    const temperature = tempIdx >= 0 ? parseFloat(values[tempIdx]) : 25;
    const frequency = freqIdx >= 0 ? parseFloat(values[freqIdx]) : 1000;
    const nodeNumber = nodeIdx >= 0 ? parseInt(values[nodeIdx]) : i;
    const tubeLength = lengthIdx >= 0 ? parseFloat(values[lengthIdx]) : 0;
    const notes = notesIdx >= 0 ? values[notesIdx] : '';

    if (!currentExp || currentExp.studentName !== studentName) {
      if (currentExp) {
        experiments.push(currentExp);
      }
      currentExp = {
        id: `exp-${Date.now()}-${i}`,
        studentName,
        experimentDate: date,
        temperature,
        frequency,
        measurements: [],
        notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    if (tubeLength > 0) {
      const measurement: Measurement = {
        id: `meas-${Date.now()}-${i}`,
        nodeNumber,
        tubeLength,
        isOutlier: false,
        isTemperatureCorrected: true,
        createdAt: new Date().toISOString(),
      };
      currentExp.measurements?.push(measurement);
      currentExp.temperature = temperature;
      currentExp.frequency = frequency;
      currentExp.notes = notes;
    }
  }

  if (currentExp) {
    experiments.push(currentExp);
  }

  return experiments;
}

export function exportToCSV(experiment: ExperimentData): string {
  const headers = ['学生姓名', '实验日期', '温度(°C)', '频率(Hz)', '节点编号', '管长(cm)', '是否离群值', '已温度修正', '备注'];
  const rows: string[] = [headers.join(',')];

  experiment.measurements.forEach((m) => {
    const row = [
      experiment.studentName,
      experiment.experimentDate,
      experiment.temperature,
      experiment.frequency,
      m.nodeNumber,
      m.tubeLength,
      m.isOutlier ? '是' : '否',
      m.isTemperatureCorrected ? '是' : '否',
      experiment.notes,
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}
