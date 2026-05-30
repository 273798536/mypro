function generateTestData() {
  const baseTime = new Date('2024-01-15T00:00:00Z').getTime();

  return {
    defrost_records: [
      {
        record_id: 'DEF_001',
        start_time: new Date(baseTime + 2 * 3600000).toISOString(),
        end_time: new Date(baseTime + 2.5 * 3600000).toISOString(),
        duration_seconds: 1800,
        energy_consumption: 4.2,
        evaporator_temp_before: -18.5,
        evaporator_temp_after: 8.2,
        status: 'completed',
        fan_status: 'off_during_defrost',
        remarks: ''
      },
      {
        record_id: 'DEF_002',
        start_time: new Date(baseTime + 2.4 * 3600000).toISOString(),
        end_time: new Date(baseTime + 2.9 * 3600000).toISOString(),
        duration_seconds: 1800,
        energy_consumption: 4.0,
        evaporator_temp_before: -17.8,
        evaporator_temp_after: 7.5,
        status: 'completed',
        fan_status: 'off_during_defrost',
        remarks: ''
      },
      {
        record_id: 'DEF_003',
        start_time: new Date(baseTime + 6 * 3600000).toISOString(),
        energy_consumption: 7.5,
        evaporator_temp_before: -19.2,
        status: 'completed',
        remarks: '手动融霜，结霜较厚'
      },
      {
        record_id: 'DEF_004',
        start_time: new Date(baseTime + 10 * 3600000).toISOString(),
        end_time: new Date(baseTime + 10.4 * 3600000).toISOString(),
        evaporator_temp_before: -18.0,
        evaporator_temp_after: 6.8,
        status: 'completed',
        fan_status: 'off_during_defrost'
      }
    ],
    temperature_readings: [
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime).toISOString(), temperature: -18.2, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 300000).toISOString(), temperature: -18.0, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 600000).toISOString(), temperature: -17.8, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 900000).toISOString(), temperature: -18.1, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 3600000).toISOString(), temperature: -17.5, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 5400000).toISOString(), temperature: -18.3, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 9000000).toISOString(), temperature: -17.9, remarks: '' },
      { probe_id: 'PROBE_001', reading_time: new Date(baseTime + 10800000).toISOString(), temperature: -18.4, remarks: '' },
      { probe_id: 'PROBE_002', reading_time: new Date(baseTime).toISOString(), temperature: -19.1, remarks: '' },
      { probe_id: 'PROBE_002', reading_time: new Date(baseTime + 300000).toISOString(), temperature: -18.9, remarks: '' },
      { probe_id: 'PROBE_002', reading_time: new Date(baseTime + 600000).toISOString(), temperature: -18.7, remarks: '' },
      { probe_id: 'PROBE_002', reading_time: new Date(baseTime + 5400000).toISOString(), temperature: -19.0, remarks: '探头离线后恢复' },
      { probe_id: 'PROBE_002', reading_time: new Date(baseTime + 7200000).toISOString(), temperature: -19.2, remarks: '' },
      { probe_id: 'PROBE_002', reading_time: new Date(baseTime + 10800000).toISOString(), temperature: -18.8, remarks: '' }
    ],
    fan_status: [
      { fan_id: 'FAN_001', status_time: new Date(baseTime + 2.5 * 3600000 + 300000).toISOString(), status: 'running', speed_percent: 100 },
      { fan_id: 'FAN_001', status_time: new Date(baseTime + 2.9 * 3600000 + 420000).toISOString(), status: 'running', speed_percent: 100 },
      { fan_id: 'FAN_002', status_time: new Date(baseTime + 6.5 * 3600000 + 240000).toISOString(), status: 'running', speed_percent: 85 }
    ],
    door_status: [
      { door_id: 'DOOR_001', event_time: new Date(baseTime + 4 * 3600000).toISOString(), is_open: true, duration_seconds: 480 },
      { door_id: 'DOOR_001', event_time: new Date(baseTime + 8 * 3600000).toISOString(), is_open: true, duration_seconds: 120 },
      { door_id: 'DOOR_002', event_time: new Date(baseTime + 11 * 3600000).toISOString(), is_open: true, duration_seconds: 1200 }
    ]
  };
}

function generateModifiedTestData() {
  const data = generateTestData();
  
  data.defrost_records[1].start_time = new Date(new Date(data.defrost_records[1].start_time).getTime() + 1800000).toISOString();
  data.defrost_records[1].end_time = new Date(new Date(data.defrost_records[1].end_time).getTime() + 1800000).toISOString();
  data.defrost_records[2].energy_consumption = 5.5;
  data.door_status[2].duration_seconds = 300;
  
  return data;
}

module.exports = { generateTestData, generateModifiedTestData };
