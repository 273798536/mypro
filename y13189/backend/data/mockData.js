const mockReports = [
  {
    id: 'WT-2024-001',
    name: '某型飞机机翼烟流试验报告',
    testDate: '2024-03-15',
    operator: '张工',
    reviewer: '老何',
    status: 'draft',
    basicInfo: {
      specimenName: '机翼模型A-01',
      specimenMaterial: '铝合金6061',
      materialAlias: '6061铝合金',
      testSection: '1.2m×1.2m亚声速风洞',
      testType: '烟线显示试验',
      description: '观察不同攻角下机翼表面的流动分离情况'
    },
    parameters: {
      windSpeed: { value: 30, unit: 'm/s', displayUnit: 'm/s' },
      reynoldsNumber: { value: 3.2e5, unit: '', displayUnit: '' },
      attackAngle: { value: 5, unit: '°', displayUnit: '°' },
      smokeWireDiameter: { value: 0.05, unit: 'mm', displayUnit: 'mm' },
      smokeWireMaterial: '钨丝'
    },
    rawParameters: {
      windSpeedInput: '30',
      windSpeedUnit: 'm/s',
      attackAngleInput: '5',
      attackAngleDir: 'positive',
      hasUnitError: false,
      hasDirectionError: false
    },
    samples: [
      {
        id: 'S001',
        name: '攻角0°',
        attackAngle: 0,
        windSpeed: 30,
        windSpeedUnit: 'm/s',
        separationPoint: null,
        flowStatus: '附着流',
        isNormal: true,
        isBoundary: false,
        screenshotNote: '气流平滑附着于机翼表面，无分离现象',
        sceneLabel: '正常附着流状态',
        sideNote: '攻角0°，流速30m/s，流动完全附着',
        maintenanceRemark: '设备运行正常，钨丝无断丝',
        processingRecord: '参数校准完成，数据有效'
      },
      {
        id: 'S002',
        name: '攻角5°',
        attackAngle: 5,
        windSpeed: 30,
        windSpeedUnit: 'm/s',
        separationPoint: 0.75,
        flowStatus: '小分离',
        isNormal: true,
        isBoundary: false,
        screenshotNote: '机翼后缘出现小规模流动分离，约弦长75%位置',
        sceneLabel: '小分离状态',
        sideNote: '攻角5°，流速30m/s，后缘小分离',
        maintenanceRemark: '正常',
        processingRecord: '数据有效'
      },
      {
        id: 'S003',
        name: '攻角15°',
        attackAngle: 15,
        windSpeed: 30,
        windSpeedUnit: 'm/s',
        separationPoint: 0.3,
        flowStatus: '大分离',
        isNormal: true,
        isBoundary: false,
        screenshotNote: '机翼前缘30%弦长位置出现明显分离，分离区较大',
        sceneLabel: '大分离状态',
        sideNote: '攻角15°，流速30m/s，前缘大分离',
        maintenanceRemark: '正常',
        processingRecord: '数据有效'
      },
      {
        id: 'S004',
        name: '攻角12°（边界）',
        attackAngle: 12,
        windSpeed: 30,
        windSpeedUnit: 'm/s',
        separationPoint: 0.45,
        flowStatus: '临界分离',
        isNormal: true,
        isBoundary: true,
        boundaryNote: '接近失速临界攻角，分离点对攻角变化敏感',
        screenshotNote: '攻角12°为临界状态，分离点在弦长45%位置，再增加1-2度分离会迅速前移',
        sceneLabel: '临界分离状态（边界样本）',
        sideNote: '攻角12°，流速30m/s，临界分离，对参数敏感',
        maintenanceRemark: '烟线发生器工作状态良好',
        processingRecord: '边界样本，需标注敏感性'
      },
      {
        id: 'S005',
        name: '攻角-5°（方向异常）',
        attackAngle: -5,
        windSpeed: 30,
        windSpeedUnit: 'm/s',
        separationPoint: 0.2,
        flowStatus: '异常分离',
        isNormal: false,
        isBoundary: false,
        anomalyType: 'direction',
        anomalyDescription: '方向符号异常：负攻角下前缘分离点异常靠前，疑似攻角方向设置反',
        screenshotNote: '负攻角下出现异常的前缘分离，与预期不符。检查记录发现攻角方向设置可能写反',
        sceneLabel: '异常 - 方向符号错误',
        sideNote: '⚠️ 异常：攻角方向符号可能写反，数据需复核',
        maintenanceRemark: '攻角机构校准记录待查',
        processingRecord: '异常数据，已标记方向符号问题，待重测'
      },
      {
        id: 'S006',
        name: '低速工况（单位混写）',
        attackAngle: 5,
        windSpeed: 108,
        windSpeedUnit: 'km/h',
        rawWindSpeedInput: '108',
        rawInputUnit: 'km/h',
        standardWindSpeed: 30,
        separationPoint: 0.78,
        flowStatus: '小分离',
        isNormal: true,
        isBoundary: false,
        hasUnitIssue: true,
        unitIssueNote: '原始录入单位为 km/h，与其他样本 m/s 不一致，已自动换算',
        screenshotNote: '流速30m/s（录入值108km/h）攻角5°，后缘小分离',
        sceneLabel: '小分离状态（单位换算）',
        sideNote: '流速30m/s（原始录入108km/h，已统一单位）',
        maintenanceRemark: '正常',
        processingRecord: '单位已统一换算，数据有效'
      }
    ],
    materialConclusion: {
      materialName: '铝合金6061',
      materialNameInRecord: '6061铝合金',
      isNameConsistent: false,
      conclusion: '6061铝合金机翼模型在30m/s流速下，失速攻角约12°-13°。材料强度满足试验要求。',
      relatedSamples: ['S001', 'S002', 'S003', 'S004']
    },
    formulas: [
      {
        name: '雷诺数',
        expression: 'Re = ρ·v·L / μ',
        description: '基于弦长的雷诺数计算公式',
        variables: {
          'ρ': '空气密度 (1.225 kg/m³)',
          'v': '来流速度 (m/s)',
          'L': '特征长度 (机翼弦长, m)',
          'μ': '空气动力粘度 (1.81e-5 Pa·s)'
        }
      },
      {
        name: '单位换算',
        expression: 'v(m/s) = v(km/h) × 1000 / 3600',
        description: '速度单位从 km/h 换算为 m/s',
        variables: {
          'v(m/s)': '标准单位下的速度',
          'v(km/h)': '原始录入速度'
        }
      }
    ],
    overallConclusion: '本次试验观察了机翼模型在不同攻角下的流动分离特性。正常攻角范围内（0°-15°），分离点随攻角增大从前缘向后缘移动。失速临界攻角约为12°。发现1条异常记录（S005攻角方向疑似写反）和1条单位不一致记录（S006单位已统一换算）。',
    screenshots: [
      { sampleId: 'S001', url: '/mock/s001.svg', description: '攻角0° 附着流' },
      { sampleId: 'S002', url: '/mock/s002.svg', description: '攻角5° 小分离' },
      { sampleId: 'S003', url: '/mock/s003.svg', description: '攻角15° 大分离' },
      { sampleId: 'S004', url: '/mock/s004.svg', description: '攻角12° 临界分离' },
      { sampleId: 'S005', url: '/mock/s005.svg', description: '攻角-5° 异常' },
      { sampleId: 'S006', url: '/mock/s006.svg', description: '低速工况 单位换算' }
    ]
  }
];

module.exports = { mockReports };
