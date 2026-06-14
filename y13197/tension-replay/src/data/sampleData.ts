import { RawSensorLog } from '../types';

export function generateSampleData(): RawSensorLog[] {
  const logs: RawSensorLog[] = [];
  const baseTime = Date.now() - 3600 * 1000 * 2;

  const materials = [
    { id: 'MAT-001', name: '钢丝绳A类' },
    { id: 'MAT-002', name: '钢丝绳B类' },
    { id: 'MAT-003', name: '钢丝绳C型' },
  ];

  const pulleyGroups = ['PG-01', 'PG-02', 'PG-03'];

  for (let i = 0; i < 100; i++) {
    const timestamp = baseTime + i * 60 * 1000;
    const material = materials[i % materials.length];
    const pulley = pulleyGroups[i % pulleyGroups.length];
    const baseTension = 5 + Math.sin(i * 0.1) * 2;

    let tension = baseTension + (Math.random() - 0.5) * 0.5;
    let fieldStyle = i % 3;

    if (i === 15) {
      tension = 30;
    } else if (i === 32) {
      tension = 0.01;
    } else if (i === 47) {
      tension = 25;
    } else if (i === 55) {
      tension = 15;
    } else if (i === 68) {
      tension = 5000;
    } else if (i === 82) {
      tension = 0.8;
    }

    const speed = 2 + Math.random() * 1;
    const temperature = 25 + Math.random() * 10;

    if (fieldStyle === 0) {
      logs.push({
        timestamp,
        material_id: material.id,
        material_name: material.name,
        tension: tension.toFixed(2),
        tension_unit: 'kN',
        pulley_group_id: pulley,
        speed: speed.toFixed(2),
        temperature: temperature.toFixed(1),
      });
    } else if (fieldStyle === 1) {
      logs.push({
        ts: timestamp,
        matId: material.id,
        matName: material.name,
        force: tension.toFixed(2),
        unit: 'kN',
        pulleyId: pulley,
        velocity: speed.toFixed(2),
        temp: temperature.toFixed(1),
      });
    } else {
      logs.push({
        datetime: new Date(timestamp).toISOString(),
        batch_id: material.id,
        product_name: material.name,
        pull_force: tension.toFixed(2),
        pulley_group: pulley,
        lineSpeed: speed.toFixed(2),
        env_temp: temperature.toFixed(1),
      });
    }
  }

  return logs;
}

export const SAMPLE_DATA = generateSampleData();
