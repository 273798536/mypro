"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePhase1SampleData = generatePhase1SampleData;
exports.generatePhase2SampleData = generatePhase2SampleData;
exports.generateDeterministicPhase1Data = generateDeterministicPhase1Data;
exports.generateDeterministicPhase2Data = generateDeterministicPhase2Data;
function generatePhase1SampleData() {
    const baseDate = new Date('2026-05-01T00:00:00Z');
    const sensors = [
        {
            sensor_code: 'SNS-CABLE-001',
            installation_date: '2025-01-15T00:00:00Z',
            status: 'active',
            location: '主桥左幅1#拉索'
        },
        {
            sensor_code: 'SNS-CABLE-002',
            installation_date: '2025-01-15T00:00:00Z',
            status: 'active',
            location: '主桥左幅2#拉索'
        },
        {
            sensor_code: 'SNS-CABLE-003',
            installation_date: '2025-01-15T00:00:00Z',
            status: 'active',
            location: '主桥右幅1#拉索'
        }
    ];
    const temperatureRecords = [];
    const sensorCodes = ['SNS-CABLE-001', 'SNS-CABLE-002', 'SNS-CABLE-003'];
    for (let sensorIdx = 0; sensorIdx < sensorCodes.length; sensorIdx++) {
        for (let hour = 0; hour < 48; hour++) {
            const recordTime = new Date(baseDate.getTime() + hour * 3600 * 1000).toISOString();
            let temperature = 15 + Math.sin(hour / 24 * Math.PI * 2) * 10 + (Math.random() - 0.5) * 2;
            let baseFrequency = 3.5 + sensorIdx * 0.2;
            let frequency = baseFrequency + Math.sin(hour / 12 * Math.PI) * 0.1;
            let windSpeed = 5 + Math.random() * 10;
            if (sensorIdx === 0 && hour >= 20 && hour <= 22) {
                temperature = 45 + Math.random() * 5;
            }
            if (sensorIdx === 1 && hour === 10) {
                frequency = null;
                temperature = null;
            }
            if (sensorIdx === 1 && hour === 11) {
                frequency = baseFrequency * 0.3;
            }
            if (sensorIdx === 2 && hour >= 30 && hour <= 35) {
                windSpeed = null;
            }
            if (sensorIdx === 0 && hour >= 36 && hour <= 47) {
                frequency = baseFrequency * 0.7;
            }
            temperatureRecords.push({
                sensor_id: sensorCodes[sensorIdx],
                record_time: recordTime,
                temperature: Math.round(temperature * 10) / 10,
                frequency: frequency !== null ? Math.round(frequency * 1000) / 1000 : null,
                wind_speed: windSpeed !== null ? Math.round(windSpeed * 10) / 10 : null
            });
        }
    }
    return { sensors, temperatureRecords };
}
function generatePhase2SampleData() {
    const cableArchives = [
        {
            cable_code: 'CABLE-001',
            cable_name: '主桥左幅1号拉索',
            design_frequency: 3.52,
            material: 'steel',
            length: 125.5,
            tension: 2850000,
            diameter: 0.12,
            temperature_coefficient: 0.000012,
            reference_temperature: 20,
            installation_date: '2020-06-15T00:00:00Z'
        },
        {
            cable_code: 'CABLE-002',
            cable_name: '主桥左幅2号拉索',
            design_frequency: 3.68,
            material: 'steel',
            length: 118.2,
            tension: 3120000,
            diameter: 0.12,
            temperature_coefficient: 0.000012,
            reference_temperature: 20,
            installation_date: '2020-06-15T00:00:00Z'
        },
        {
            cable_code: 'CABLE-003',
            cable_name: '主桥右幅1号拉索',
            design_frequency: 3.71,
            material: 'steel',
            length: 115.8,
            tension: 3200000,
            diameter: 0.12,
            temperature_coefficient: 0.000012,
            reference_temperature: 20,
            installation_date: '2020-06-15T00:00:00Z'
        }
    ];
    return { cableArchives };
}
function generateDeterministicPhase1Data() {
    const baseDate = new Date('2026-05-01T00:00:00Z');
    const sensors = [
        {
            sensor_code: 'SNS-CABLE-001',
            installation_date: '2025-01-15T00:00:00Z',
            status: 'active',
            location: '主桥左幅1#拉索'
        },
        {
            sensor_code: 'SNS-CABLE-002',
            installation_date: '2025-01-15T00:00:00Z',
            status: 'active',
            location: '主桥左幅2#拉索'
        }
    ];
    const temperatureRecords = [];
    const sensorCodes = ['SNS-CABLE-001', 'SNS-CABLE-002'];
    for (let sensorIdx = 0; sensorIdx < sensorCodes.length; sensorIdx++) {
        for (let hour = 0; hour < 24; hour++) {
            const recordTime = new Date(baseDate.getTime() + hour * 3600 * 1000).toISOString();
            let temperature = 15 + Math.sin(hour / 24 * Math.PI * 2) * 10;
            const baseFrequency = 3.5 + sensorIdx * 0.2;
            let frequency = baseFrequency + Math.sin(hour / 12 * Math.PI) * 0.05;
            let windSpeed = 8 + Math.sin(hour / 6 * Math.PI) * 4;
            if (sensorIdx === 0 && hour === 12) {
                temperature = 50;
            }
            if (sensorIdx === 1 && hour === 6) {
                frequency = null;
                temperature = null;
            }
            if (sensorIdx === 0 && hour === 18) {
                windSpeed = null;
            }
            temperatureRecords.push({
                sensor_id: sensorCodes[sensorIdx],
                record_time: recordTime,
                temperature: temperature !== null ? Math.round(temperature * 10) / 10 : null,
                frequency: frequency !== null ? Math.round(frequency * 1000) / 1000 : null,
                wind_speed: windSpeed !== null ? Math.round(windSpeed * 10) / 10 : null
            });
        }
    }
    return { sensors, temperatureRecords };
}
function generateDeterministicPhase2Data() {
    return {
        cableArchives: [
            {
                cable_code: 'CABLE-001',
                cable_name: '主桥左幅1号拉索',
                design_frequency: 3.52,
                material: 'steel',
                length: 125.5,
                tension: 2850000,
                diameter: 0.12,
                temperature_coefficient: 0.000012,
                reference_temperature: 20,
                installation_date: '2020-06-15T00:00:00Z'
            }
        ]
    };
}
//# sourceMappingURL=sampleDataGenerator.js.map