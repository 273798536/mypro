import type { Sample } from '@/types';

export function samplesToCSV(samples: Sample[]): string {
  const header = [
    'id',
    'created_at',
    'status',
    'diameter_value',
    'diameter_unit',
    'particle_density_kgm3',
    'liquid_viscosity_Pas',
    'temperature_C',
    'observation_height_m',
    'stokes_velocity_ms',
    'reynolds',
    'source',
    'note',
    'corrections',
    'errors',
    'raw',
  ];
  const rows = samples.map((s) => [
    s.id,
    s.createdAt,
    s.status,
    s.diameter.value,
    s.diameter.unit,
    s.particleDensity,
    s.liquidViscosity,
    s.temperature ?? '',
    s.observationHeight,
    s.stokesVelocity ?? '',
    s.reynolds ?? '',
    escapeCSV(s.source),
    escapeCSV(s.note),
    escapeCSV(s.corrections.join(' | ')),
    escapeCSV(s.errors.join(' | ')),
    escapeCSV(s.raw),
  ]);
  return [header, ...rows].map((r) => r.join(',')).join('\n');
}

function escapeCSV(s: string): string {
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function downloadCSV(samples: Sample[], filename = 'sedimentation.csv') {
  const csv = samplesToCSV(samples);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPNG(canvas: HTMLCanvasElement, filename = 'sedimentation.png') {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
