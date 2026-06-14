export const sampleCSVData = `设备编号,电池内阻,温度,采集时间,人工备注,操作人
BAT-001,1500,25,2026-06-14 08:00:00,,
BAT-002,2500,25,2026-06-14 08:01:00,传感器漂移,小林
BAT-003,1800,35,2026-06-14 08:02:00,,
BAT-004,3000,25,2026-06-14 08:03:00,,,
BAT-005,1200,25,2026-06-14 08:04:00,人工复核通过,张三
BAT-001,1500,25,2026-06-14 08:00:00,,
BAT-006,-100,25,2026-06-14 08:05:00,,
BAT-007,,25,2026-06-14 08:06:00,,
BAT-008,99999,150,2026-06-14 08:07:00,,
BAT-009,2200,25,2026-06-14 08:08:00,异常高温,李四
BAT-010,1900,25,2026-06-14 08:09:00,,`;

export const sampleCSVDataAltFields = `设备ID,电阻值,温度值,记录时间,备注,处理人
BAT-101,1600,26,2026-06-14 09:00:00,,
BAT-102,2800,28,2026-06-14 09:01:00,需进一步检测,王五
BAT-103,1750,30,2026-06-14 09:02:00,,
BAT-104,2100,25,2026-06-14 09:03:00,老化加速,小林`;

export const sampleJSONData = [
  {
    "device_id": "BAT-201",
    "resistance": 1450,
    "temperature": 24,
    "timestamp": "2026-06-14 10:00:00",
    "remark": "",
    "operator": ""
  },
  {
    "device_id": "BAT-202",
    "resistance": 3200,
    "temperature": 25,
    "timestamp": "2026-06-14 10:01:00",
    "remark": "确认为异常",
    "operator": "小林"
  }
];

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

export const defaultThresholdParamsA = {
  name: "参数组A（标准）",
  warningThreshold: 2.0,
  thresholdUnit: 'Ω' as const,
  temperatureCompensation: true,
  baseTemperature: 25,
  temperatureCoefficient: 0.004,
};

export const defaultThresholdParamsB = {
  name: "参数组B（严格）",
  warningThreshold: 1.8,
  thresholdUnit: 'Ω' as const,
  temperatureCompensation: true,
  baseTemperature: 25,
  temperatureCoefficient: 0.004,
};
