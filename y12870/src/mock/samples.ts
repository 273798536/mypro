import type { WeatherForecast, SalinityRecord, EnergyDevice, TidalHarmonic, NoGoZone, MapViewPreset } from '@/types';

export const sampleWeather: WeatherForecast[] = Array.from({ length: 72 }, (_, i) => {
  const hour = i;
  const date = new Date(2026, 5, 12, 0, 0, 0);
  date.setHours(hour);
  const waveBase = 1.2 + Math.sin(hour / 6) * 0.5 + Math.random() * 0.3;
  return {
    timestamp: date.toISOString().slice(0, 16).replace('T', ' '),
    windSpeed: +(5 + Math.sin(hour / 8) * 3 + Math.random() * 2).toFixed(1),
    windDirection: Math.round((hour * 8 + 90) % 360),
    waveHeight: +waveBase.toFixed(2),
    wavePeriod: +(7 + Math.random() * 3).toFixed(1),
    airPressure: Math.round(1008 + Math.sin(hour / 24) * 6 + Math.random() * 2),
    temperature: +(23 + Math.sin(hour / 12) * 2 + Math.random()).toFixed(1),
    source: 'ECMWF_20260612_舟山海域.csv',
  };
});

export const sampleSalinity: SalinityRecord[] = [
  { id: 's1', station: 'ZS01', timestamp: '2026-06-12 08:00', depth: 0, value: 29.8, unit: 'PSU' },
  { id: 's2', station: 'ZS01', timestamp: '2026-06-12 08:00', depth: 15, value: 31.2, unit: 'PSU' },
  { id: 's3', station: 'ZS01', timestamp: '2026-06-12 08:00', depth: 30, value: 33.5, unit: 'PSU' },
  { id: 's4', station: 'ZS02', timestamp: '2026-06-12 09:30', depth: 0, value: 30.1, unit: '‰', unitMismatch: true },
  { id: 's5', station: 'ZS02', timestamp: '2026-06-12 09:30', depth: 20, value: 32.8, unit: 'ppt', unitMismatch: true },
  { id: 's6', station: 'ZS02', timestamp: '2026-06-12 09:30', depth: 40, value: 49500, unit: 'mS/cm', unitMismatch: true },
  { id: 's7', station: 'ZS03', timestamp: '2026-06-12 11:00', depth: 0, value: 30.5, unit: 'PSU' },
  { id: 's8', station: 'ZS03', timestamp: '2026-06-12 11:00', depth: 25, value: 32.3, unit: 'PSU' },
  { id: 's9', station: 'ZS04', timestamp: '2026-06-12 12:30', depth: 0, value: 28.9, unit: '‰', unitMismatch: true },
  { id: 's10', station: 'ZS04', timestamp: '2026-06-12 12:30', depth: 35, value: 32.1, unit: 'PSU' },
];

export const sampleDevices: EnergyDevice[] = [
  {
    id: 'd1', name: '海浪能机组 #A1', lat: 30.1520, lng: 122.1080,
    ratedPower: 120, efficiency: 0.32, status: 'AVAILABLE',
  },
  {
    id: 'd2', name: '海浪能机组 #A2', lat: 30.1540, lng: 122.1120,
    ratedPower: 120, efficiency: 0.30, status: 'AVAILABLE',
  },
  {
    id: 'd3', name: '海浪能机组 #B1', lat: 30.1680, lng: 122.1280,
    ratedPower: 200, efficiency: 0.28, status: 'DEFERRED',
    notes: '盐度数据暂缺30m深度',
  },
  {
    id: 'd4', name: '海浪能机组 #C1', lat: 30.1780, lng: 122.1520,
    ratedPower: 300, efficiency: 0.35, status: 'RECOLLECT',
    notes: '位于航道缓冲区，建议重新选点', inNoGoZone: true,
  },
];

export const sampleHarmonics: TidalHarmonic[] = [
  { constituent: 'M2', amplitude: 95, phase: 128.5, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
  { constituent: 'S2', amplitude: 32, phase: 145.2, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
  { constituent: 'K1', amplitude: 28, phase: 210.8, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
  { constituent: 'O1', amplitude: 22, phase: 195.3, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
  { constituent: 'P1', amplitude: 9, phase: 208.1, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
  { constituent: 'N2', amplitude: 20, phase: 118.6, sourceMaterial: 'ZD-HX-2025-舟山站-01' },
];

export const sampleNoGoZones: NoGoZone[] = [
  {
    id: 'nogo1', name: '舟山主航道缓冲区', type: 'channel',
    coordinates: [
      [30.1850, 122.1350], [30.1950, 122.1700],
      [30.1600, 122.1800], [30.1520, 122.1450],
    ],
  },
  {
    id: 'nogo2', name: '马鞍列岛海洋保护区', type: 'reserve',
    coordinates: [
      [30.2200, 122.2000], [30.2500, 122.2400],
      [30.2300, 122.2800], [30.1950, 122.2400],
    ],
  },
];

export const sampleViewPresets: MapViewPreset[] = [
  {
    id: 'v1', name: '总体布设图', center: [30.165, 122.14], zoom: 12,
    createdAt: '2026-06-12 10:30',
  },
  {
    id: 'v2', name: 'A区机组放大', center: [30.153, 122.11], zoom: 14,
    createdAt: '2026-06-12 10:32',
  },
];
