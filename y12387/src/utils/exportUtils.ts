import { Sample, Track, License } from '@/types';

export const exportToCSV = (
  data: (Sample | Track | License)[],
  filename: string
): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]).filter(
    (key) => key !== 'versions' && key !== 'manualEdits' && key !== 'duplicateWith'
  );
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = (row as any)[header];
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`;
          }
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

export const exportSamplesCSV = (samples: Sample[]): void => {
  exportToCSV(samples, '采样素材清单');
};

export const exportTracksCSV = (tracks: Track[]): void => {
  exportToCSV(tracks, '曲目项目清单');
};

export const exportLicensesCSV = (licenses: License[]): void => {
  exportToCSV(licenses, '授权报告清单');
};

export const exportAllData = (
  samples: Sample[],
  tracks: Track[],
  licenses: License[]
): void => {
  exportSamplesCSV(samples);
  exportTracksCSV(tracks);
  exportLicensesCSV(licenses);
};
