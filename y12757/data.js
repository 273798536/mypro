// 水质 COD 批量报告 - 模拟数据
// 包含日常场景：旧表格式、补录备注、漏填单位、称量精度不足、温度单位混用等

const MOCK_BATCH_DATA = {
  batchId: 'COD-20260609-003',
  batchName: '2026年6月9日 COD 批量检测',
  analyst: '李工',
  reviewer: '张工',
  createTime: '2026-06-09 14:30:00',
  updateTime: '2026-06-10 09:15:00',
  status: '待复核',
  remark: '上午9点收到采水站送样，共18个样品。称量单于下午16:20补到，晚到约2小时。3号样瓶标签磨损，已联系采样组补录信息。',

  samples: [
    {
      id: 'S001',
      sampleCode: 'WS-20260609-001',
      sampleName: '城东水厂进水',
      sampleType: '地表水',
      collectTime: '2026-06-09 08:15',
      collectPoint: '城东水厂取水口',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-01',
        weighTime: '2026-06-09 15:45',
        containerWeight: 25.321,
        containerUnit: 'g',
        sampleWeight: 20.0045,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 148,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '消解温度148℃，按规程执行'
      },

      spectrum: {
        absorbance: 0.3245,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 17:30',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.2980 },
          { wl: 590, abs: 0.3120 },
          { wl: 600, abs: 0.3245 },
          { wl: 610, abs: 0.3180 },
          { wl: 620, abs: 0.3050 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S002',
      sampleCode: 'WS-20260609-002',
      sampleName: '城东水厂出水',
      sampleType: '地表水',
      collectTime: '2026-06-09 08:20',
      collectPoint: '城东水厂出水口',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-02',
        weighTime: '2026-06-09 15:50',
        containerWeight: 25.189,
        containerUnit: 'g',
        sampleWeight: 20.0032,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: ''
      },

      spectrum: {
        absorbance: 0.0876,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 17:35',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.0790 },
          { wl: 590, abs: 0.0835 },
          { wl: 600, abs: 0.0876 },
          { wl: 610, abs: 0.0860 },
          { wl: 620, abs: 0.0820 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S003',
      sampleCode: 'WS-20260609-003',
      sampleName: '化工园区排污口',
      sampleType: '废水',
      collectTime: '2026-06-09 09:00',
      collectPoint: '化工园区3号排放口',
      isOldFormat: true,
      remark: '旧表录入，标签磨损，样品名称根据采样记录补填。',

      weighRecord: {
        weighSheetId: 'W-20260609-03',
        weighTime: '2026-06-09 16:00',
        containerWeight: 24.876,
        containerUnit: 'g',
        sampleWeight: 19.998,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: '样品量偏少，勉强够做一次平行'
      },

      reaction: {
        digestionTemp: 302,
        digestionTempUnit: 'F',
        digestionTime: 2,
        digestionTimeUnit: 'h',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '旧表记录，温度写的华氏度，时间写的小时'
      },

      spectrum: {
        absorbance: 0.8923,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 17:40',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.8210 },
          { wl: 590, abs: 0.8620 },
          { wl: 600, abs: 0.8923 },
          { wl: 610, abs: 0.8750 },
          { wl: 620, abs: 0.8410 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 10,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S004',
      sampleCode: 'WS-20260609-004',
      sampleName: '南河断面A',
      sampleType: '地表水',
      collectTime: '2026-06-09 07:45',
      collectPoint: '南河公路桥断面',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-04',
        weighTime: '2026-06-09 16:05',
        containerWeight: 25.445,
        containerUnit: 'g',
        sampleWeight: 20.0,
        sampleWeightUnit: 'g',
        balanceModel: 'TD5002',
        precisionLevel: '0.01g',
        operator: '李称量（代）',
        remark: 'FA2004天平故障，临时用TD5002，精度0.01g'
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '温度单位漏填'
      },

      spectrum: {
        absorbance: 0.2134,
        wavelength: 600,
        wavelengthUnit: '',
        measureTime: '2026-06-09 17:45',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.1950 },
          { wl: 590, abs: 0.2050 },
          { wl: 600, abs: 0.2134 },
          { wl: 610, abs: 0.2090 },
          { wl: 620, abs: 0.2000 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S005',
      sampleCode: 'WS-20260609-005',
      sampleName: '南河断面B',
      sampleType: '地表水',
      collectTime: '2026-06-09 07:50',
      collectPoint: '南河下游2km断面',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-05',
        weighTime: '2026-06-09 16:10',
        containerWeight: 25.112,
        containerUnit: 'g',
        sampleWeight: 20.0058,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 149,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: ''
      },

      spectrum: {
        absorbance: 0.1982,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 17:50',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.1820 },
          { wl: 590, abs: 0.1910 },
          { wl: 600, abs: 0.1982 },
          { wl: 610, abs: 0.1940 },
          { wl: 620, abs: 0.1860 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S006',
      sampleCode: 'WS-20260609-006',
      sampleName: '污水处理厂进水',
      sampleType: '污水',
      collectTime: '2026-06-09 06:30',
      collectPoint: '市污水处理厂粗格栅前',
      isOldFormat: false,
      remark: '补录记录：6月9日晚21:00追加检测',

      weighRecord: {
        weighSheetId: 'W-20260609-06',
        weighTime: '2026-06-09 21:30',
        containerWeight: 24.998,
        containerUnit: 'g',
        sampleWeight: 19.8,
        sampleWeightUnit: 'g',
        balanceModel: 'TD5002',
        precisionLevel: '0.01g',
        operator: '李称量（代）',
        remark: '夜间加急，天平室只开了TD5002'
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '加急样，消解正常'
      },

      spectrum: {
        absorbance: 1.1234,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 23:45',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 1.0350 },
          { wl: 590, abs: 1.0870 },
          { wl: 600, abs: 1.1234 },
          { wl: 610, abs: 1.1020 },
          { wl: 620, abs: 1.0580 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 20,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S007',
      sampleCode: 'WS-20260609-007',
      sampleName: '污水处理厂出水',
      sampleType: '污水',
      collectTime: '2026-06-09 06:35',
      collectPoint: '市污水处理厂排放口',
      isOldFormat: false,
      remark: '补录记录：6月9日晚21:00追加检测',

      weighRecord: {
        weighSheetId: 'W-20260609-07',
        weighTime: '2026-06-09 21:35',
        containerWeight: 25.234,
        containerUnit: 'g',
        sampleWeight: 20.0067,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '李称量（代）',
        remark: '后来修好FA2004了，换回来用'
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: ''
      },

      spectrum: {
        absorbance: 0.0567,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 23:50',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.0510 },
          { wl: 590, abs: 0.0540 },
          { wl: 600, abs: 0.0567 },
          { wl: 610, abs: 0.0555 },
          { wl: 620, abs: 0.0530 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S008',
      sampleCode: 'WS-20260609-008',
      sampleName: '北湖水厂进水',
      sampleType: '地表水',
      collectTime: '2026-06-09 08:00',
      collectPoint: '北湖水厂取水口',
      isOldFormat: true,
      remark: '旧表格式，2019版记录表',

      weighRecord: {
        weighSheetId: 'W-20260609-08',
        weighTime: '2026-06-09 16:15',
        containerWeight: 25.678,
        containerUnit: 'g',
        sampleWeight: 20.0000,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 423,
        digestionTempUnit: 'K',
        digestionTime: 7200,
        digestionTimeUnit: 's',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '旧表用开尔文和秒，需要换算'
      },

      spectrum: {
        absorbance: 0.4567,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 17:55',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.4200 },
          { wl: 590, abs: 0.4410 },
          { wl: 600, abs: 0.4567 },
          { wl: 610, abs: 0.4480 },
          { wl: 620, abs: 0.4300 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 2,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S009',
      sampleCode: 'WS-20260609-009',
      sampleName: '北湖水厂出水',
      sampleType: '地表水',
      collectTime: '2026-06-09 08:05',
      collectPoint: '北湖水厂出水口',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-09',
        weighTime: '2026-06-09 16:20',
        containerWeight: 25.432,
        containerUnit: 'g',
        sampleWeight: 20.0012,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: ''
      },

      spectrum: {
        absorbance: 0.0789,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 18:00',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.0720 },
          { wl: 590, abs: 0.0755 },
          { wl: 600, abs: 0.0789 },
          { wl: 610, abs: 0.0775 },
          { wl: 620, abs: 0.0740 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S010',
      sampleCode: 'WS-20260609-010',
      sampleName: '工业园区应急池',
      sampleType: '废水',
      collectTime: '2026-06-09 10:30',
      collectPoint: '园区应急事故池',
      isOldFormat: false,
      remark: '应急采样，记录不全',

      weighRecord: {
        weighSheetId: '',
        weighTime: '',
        containerWeight: null,
        containerUnit: '',
        sampleWeight: null,
        sampleWeightUnit: '',
        balanceModel: '',
        precisionLevel: '',
        operator: '',
        remark: '称量单尚未送达，预计6月10日上午补'
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '先做消解，等称量单'
      },

      spectrum: {
        absorbance: 0.6789,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 18:05',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.6230 },
          { wl: 590, abs: 0.6550 },
          { wl: 600, abs: 0.6789 },
          { wl: 610, abs: 0.6650 },
          { wl: 620, abs: 0.6380 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 5,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S011',
      sampleCode: 'WS-20260609-011',
      sampleName: '东河上游',
      sampleType: '地表水',
      collectTime: '2026-06-09 07:00',
      collectPoint: '东河水库出口',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-11',
        weighTime: '2026-06-09 16:25',
        containerWeight: 25.876,
        containerUnit: 'g',
        sampleWeight: 20.0034,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 150,
        digestionTempUnit: '℃',
        digestionTime: 120,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: ''
      },

      spectrum: {
        absorbance: 0.1567,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 18:10',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.1430 },
          { wl: 590, abs: 0.1510 },
          { wl: 600, abs: 0.1567 },
          { wl: 610, abs: 0.1535 },
          { wl: 620, abs: 0.1470 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    },

    {
      id: 'S012',
      sampleCode: 'WS-20260609-012',
      sampleName: '东河下游',
      sampleType: '地表水',
      collectTime: '2026-06-09 07:15',
      collectPoint: '东河入江口',
      isOldFormat: false,
      remark: '',

      weighRecord: {
        weighSheetId: 'W-20260609-12',
        weighTime: '2026-06-09 16:30',
        containerWeight: 25.543,
        containerUnit: 'g',
        sampleWeight: 20.0078,
        sampleWeightUnit: 'g',
        balanceModel: 'FA2004',
        precisionLevel: '0.1mg',
        operator: '王称量',
        remark: ''
      },

      reaction: {
        digestionTemp: 147,
        digestionTempUnit: '℃',
        digestionTime: 118,
        digestionTimeUnit: 'min',
        reagentType: '重铬酸钾标准溶液',
        reagentBatch: 'RG-20260515',
        catalyst: '硫酸银-硫酸',
        catalystBatch: 'CT-20260420',
        remark: '消解仪最后一排温度略低，时间差2分钟'
      },

      spectrum: {
        absorbance: 0.2345,
        wavelength: 600,
        wavelengthUnit: 'nm',
        measureTime: '2026-06-09 18:15',
        instrument: 'UV-1800',
        rawDataPoints: [
          { wl: 580, abs: 0.2150 },
          { wl: 590, abs: 0.2260 },
          { wl: 600, abs: 0.2345 },
          { wl: 610, abs: 0.2300 },
          { wl: 620, abs: 0.2200 }
        ]
      },

      calculation: {
        standardCurveSlope: 0.00156,
        standardCurveIntercept: 0.0023,
        dilutionFactor: 1,
        rawConcentration: null,
        finalConcentration: null,
        concentrationUnit: 'mg/L',
        issues: []
      }
    }
  ],

  qualityControl: {
    blankSample: {
      absorbance: 0.0045,
      pass: true,
      threshold: 0.010,
      remark: '空白吸光度0.0045，低于阈值0.010，合格'
    },
    standardSample: {
      theoreticalValue: 100,
      measuredValue: null,
      absorbance: 0.1583,
      pass: null,
      tolerance: 5,
      remark: ''
    },
    parallelSample: {
      sample1Abs: 0.3245,
      sample2Abs: 0.3258,
      relativeDeviation: null,
      pass: null,
      threshold: 5,
      remark: '平行样：S001复测'
    }
  },

  standardCurve: {
    points: [
      { concentration: 0, absorbance: 0.0032 },
      { concentration: 25, absorbance: 0.0418 },
      { concentration: 50, absorbance: 0.0805 },
      { concentration: 100, absorbance: 0.1583 },
      { concentration: 200, absorbance: 0.3142 },
      { concentration: 400, absorbance: 0.6265 },
      { concentration: 800, absorbance: 1.2510 }
    ],
    slope: 0.00156,
    intercept: 0.0023,
    rSquare: 0.9998,
    equation: 'A = 0.00156C + 0.0023'
  }
};

const ANOMALY_RULES = {
  tempUnitMismatch: {
    name: '温度单位混用',
    severity: 'warning',
    description: '同一批样品中使用了多种温度单位（℃、°F、K），需统一换算后再判断消解条件',
    suggestion: '建议统一换算为摄氏度(℃)后进行复核，标准消解温度为146-150℃'
  },
  weighPrecisionLow: {
    name: '称量精度不足',
    severity: 'warning',
    description: '称量使用的天平精度低于要求的0.1mg级，可能影响结果准确性',
    suggestion: '如条件允许，建议使用万分之一天平(0.1mg)重新称量；如无法重测，需在报告中注明'
  },
  weighRecordMissing: {
    name: '称量记录缺失',
    severity: 'error',
    description: '称量单未送达或关键称量数据缺失，无法完成准确计算',
    suggestion: '请联系称量组尽快补送称量单，收到后重新计算'
  },
  unitMissing: {
    name: '计量单位漏填',
    severity: 'warning',
    description: '记录中存在未填写的计量单位，可能导致数据理解歧义',
    suggestion: '请确认漏填单位的字段，根据同期记录或标准方法补填后再复核'
  },
  oldFormatData: {
    name: '旧表格式录入',
    severity: 'info',
    description: '该样品使用旧版记录表录入，存在单位制式或字段差异风险',
    suggestion: '建议核对旧表原始记录，确认所有单位和数值已正确转换'
  },
  digestionTempDeviation: {
    name: '消解温度偏离',
    severity: 'warning',
    description: '消解温度不在标准范围(146-150℃)内，可能影响氧化效率',
    suggestion: '温度偏差超过±2℃时建议重新消解；如无法重测，需在报告中注明'
  },
  digestionTimeDeviation: {
    name: '消解时间偏离',
    severity: 'warning',
    description: '消解时间不在标准范围(115-125min)内，可能影响氧化效率',
    suggestion: '时间偏差超过±5分钟时建议重新消解；如无法重测，需在报告中注明'
  },
  highConcentration: {
    name: '高浓度样品',
    severity: 'info',
    description: '样品浓度较高(>400mg/L)，已按稀释倍数换算，请注意稀释操作记录',
    suggestion: '确认稀释操作准确，建议对高浓度样品做平行样验证'
  },
  absorbanceOutOfRange: {
    name: '吸光度超出线性范围',
    severity: 'warning',
    description: '样品吸光度接近或超出标准曲线线性上限(1.200)，结果可能存在偏差',
    suggestion: '建议进一步稀释后重新测定，确保吸光度在线性范围内'
  },
  patchedData: {
    name: '补录数据',
    severity: 'info',
    description: '该记录为后续补录，请注意与原始记录核对一致性',
    suggestion: '核对补录信息与原始采样/检测记录是否一致'
  }
};
