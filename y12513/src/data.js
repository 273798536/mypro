function generateSaturationCurve(materialKey, matData) {
  if (!matData) return [];
  
  const Tc = matData.critical.temperature;
  const Pc = matData.critical.pressure;
  const Tt = matData.triple.temperature;
  const Pt = matData.triple.pressure;
  
  if (!Tc || !Pc || !Tt || !Pt) return [];
  if (Tc <= Tt || Pc <= Pt) return [];
  
  const points = [];
  const n = 50;
  
  for (let i = 0; i <= n; i++) {
    const ratio = i / n;
    const T = Tt + ratio * (Tc - Tt);
    
    if (T <= 0) continue;
    
    const Tr = T / Tc;
    const theta = 1 - Tr;
    
    let P;
    if (materialKey === 'H2O') {
      const c1 = -7.85951783;
      const c2 = 1.84408259;
      const c3 = -11.7866497;
      const c4 = 22.6807411;
      const c5 = -15.9618719;
      const c6 = 1.80122502;
      const lnPr = (c1 * theta + c2 * Math.pow(theta, 1.5) + c3 * Math.pow(theta, 3) + 
                    c4 * Math.pow(theta, 3.5) + c5 * Math.pow(theta, 4) + c6 * Math.pow(theta, 7.5)) / Tr;
      if (!isFinite(lnPr)) continue;
      P = Math.exp(lnPr) * Pc;
    } else {
      const A = Math.log(Math.max(Pt, 1) / Math.max(Pc, 1));
      const denom = (1 / Tt - 1 / Tc);
      if (Math.abs(denom) < 1e-10) continue;
      const B = A / denom;
      const C = -A / Tt - B * Math.log(Tt);
      const exponent = B / T + C;
      if (!isFinite(exponent)) continue;
      P = Math.exp(exponent);
    }
    
    if (!isFinite(P) || P <= 0) continue;
    
    points.push({ T, P, ratio });
  }
  
  if (points.length < 2) {
    points.push({ T: Tt, P: Pt, ratio: 0 });
    points.push({ T: Tc, P: Pc, ratio: 1 });
  }
  
  return points;
}

const materialsData = {
  H2O: {
    name: 'H₂O (水)',
    formula: 'H2O',
    critical: {
      temperature: 647.096,
      pressure: 22.064e6,
      volume: 3.155e-3,
      enthalpy: 2087.5,
      entropy: 4.412
    },
    triple: {
      temperature: 273.16,
      pressure: 611.655,
      volume: 1.0001e-3,
      enthalpy: 0,
      entropy: 0
    },
    normalBoiling: {
      temperature: 373.15,
      pressure: 101325,
      enthalpyVaporization: 2256.4
    },
    phases: [
      { name: '固态', color: 0x4fc3f7, regions: [{ Tmin: 0, Tmax: 273.16, Pmin: 611.655, Pmax: 1e12 }] },
      { name: '液态', color: 0x667eea, regions: [{ Tmin: 273.16, Tmax: 647.096, Pmin: 611.655, Pmax: 22.064e6 }] },
      { name: '气态', color: 0x81c784, regions: [{ Tmin: 273.16, Tmax: 1000, Pmin: 0, Pmax: 22.064e6 }] },
      { name: '超临界', color: 0xba68c8, regions: [{ Tmin: 647.096, Tmax: 1000, Pmin: 22.064e6, Pmax: 1e12 }] }
    ],
    source: {
      database: 'NIST REFPROP v10.0',
      reference: '三相点液态, u=0, s=0',
      version: '2024.1',
      equations: 'IAPWS-IF97 工业级公式'
    },
    commonErrors: [
      { type: '单位错误', detail: '温度使用摄氏度而非开尔文', location: '温度输入', suggestion: '使用绝对温标 K，T(K) = T(°C) + 273.15' },
      { type: '越过临界点', detail: '在临界温度以上仍假设存在液气两相', location: '相边界计算', suggestion: '检查 T > 647.1 K 时，不存在传统意义上的"沸腾"' },
      { type: '单位错误', detail: '压力使用bar而非Pa', location: '压力输入', suggestion: '1 bar = 10⁵ Pa，注意单位换算' }
    ]
  },
  CO2: {
    name: 'CO₂ (二氧化碳)',
    formula: 'CO2',
    critical: {
      temperature: 304.128,
      pressure: 7.3773e6,
      volume: 2.139e-3,
      enthalpy: 318.9,
      entropy: 1.377
    },
    triple: {
      temperature: 216.592,
      pressure: 517950,
      volume: 1.179e-3,
      enthalpy: -450.7,
      entropy: -2.742
    },
    normalBoiling: null,
    phases: [
      { name: '固态', color: 0x4fc3f7, regions: [{ Tmin: 0, Tmax: 216.592, Pmin: 517950, Pmax: 1e12 }] },
      { name: '液态', color: 0x667eea, regions: [{ Tmin: 216.592, Tmax: 304.128, Pmin: 517950, Pmax: 7.3773e6 }] },
      { name: '气态', color: 0x81c784, regions: [{ Tmin: 216.592, Tmax: 1000, Pmin: 0, Pmax: 7.3773e6 }] },
      { name: '超临界', color: 0xba68c8, regions: [{ Tmin: 304.128, Tmax: 1000, Pmin: 7.3773e6, Pmax: 1e12 }] }
    ],
    source: {
      database: 'NIST REFPROP v10.0',
      reference: '三相点液态, h=0, s=0',
      version: '2024.1',
      equations: 'Span-Wagner 状态方程'
    },
    commonErrors: [
      { type: '越过临界点', detail: 'CO₂临界点接近室温(31.1°C)，易误操作进入超临界区', location: '温度接近304.1 K时', suggestion: '注意CO₂的临界温度较低，室温附近可能已是超临界状态' },
      { type: '相图误解', detail: 'CO₂在常压下直接升华，不存在液态', location: 'P < 5.18 bar 区域', suggestion: '查看三相点压力，理解为什么干冰会直接升华' }
    ]
  },
  NH3: {
    name: 'NH₃ (氨)',
    formula: 'NH3',
    critical: {
      temperature: 405.4,
      pressure: 11.333e6,
      volume: 4.247e-3,
      enthalpy: 992.0,
      entropy: 4.511
    },
    triple: {
      temperature: 195.49,
      pressure: 6053,
      volume: 1.512e-3,
      enthalpy: -332.0,
      entropy: -1.507
    },
    normalBoiling: {
      temperature: 239.81,
      pressure: 101325,
      enthalpyVaporization: 1368.2
    },
    phases: [
      { name: '固态', color: 0x4fc3f7, regions: [{ Tmin: 0, Tmax: 195.49, Pmin: 6053, Pmax: 1e12 }] },
      { name: '液态', color: 0x667eea, regions: [{ Tmin: 195.49, Tmax: 405.4, Pmin: 6053, Pmax: 11.333e6 }] },
      { name: '气态', color: 0x81c784, regions: [{ Tmin: 195.49, Tmax: 1000, Pmin: 0, Pmax: 11.333e6 }] },
      { name: '超临界', color: 0xba68c8, regions: [{ Tmin: 405.4, Tmax: 1000, Pmin: 11.333e6, Pmax: 1e12 }] }
    ],
    source: {
      database: 'NIST REFPROP v10.0',
      reference: '三相点液态, h=0, s=0',
      version: '2024.1',
      equations: 'Tillner-Roth 等公式'
    },
    commonErrors: [
      { type: '单位错误', detail: '焓值单位混淆 kJ/kg 和 kJ/kmol', location: '热力性质表引用', suggestion: 'NH₃摩尔质量17.03 g/mol，注意单位换算' }
    ]
  },
  Ar: {
    name: 'Ar (氩)',
    formula: 'Ar',
    critical: {
      temperature: 150.687,
      pressure: 4.863e6,
      volume: 1.779e-3,
      enthalpy: 176.8,
      entropy: 2.717
    },
    triple: {
      temperature: 83.8058,
      pressure: 68900,
      volume: 0.716e-3,
      enthalpy: -271.7,
      entropy: -1.492
    },
    normalBoiling: {
      temperature: 87.302,
      pressure: 101325,
      enthalpyVaporization: 165.8
    },
    phases: [
      { name: '固态', color: 0x4fc3f7, regions: [{ Tmin: 0, Tmax: 83.8058, Pmin: 68900, Pmax: 1e12 }] },
      { name: '液态', color: 0x667eea, regions: [{ Tmin: 83.8058, Tmax: 150.687, Pmin: 68900, Pmax: 4.863e6 }] },
      { name: '气态', color: 0x81c784, regions: [{ Tmin: 83.8058, Tmax: 1000, Pmin: 0, Pmax: 4.863e6 }] },
      { name: '超临界', color: 0xba68c8, regions: [{ Tmin: 150.687, Tmax: 1000, Pmin: 4.863e6, Pmax: 1e12 }] }
    ],
    source: {
      database: 'NIST REFPROP v10.0',
      reference: '三相点液态, h=0, s=0',
      version: '2024.1',
      equations: 'Tegeler 等公式'
    },
    commonErrors: [
      { type: '单位错误', detail: '低温区温度单位混淆', location: 'T < 100 K 时', suggestion: '氩的三相点仅83.8 K，注意与室温的巨大差异' },
      { type: '单位错误', detail: '压力单位与温度单位不匹配', location: '理想气体方程计算', suggestion: '始终使用 SI 单位: Pa, m³, kg, K' }
    ]
  }
};

Object.keys(materialsData).forEach(key => {
  materialsData[key].saturationData = generateSaturationCurve(key, materialsData[key]);
});

export const materials = materialsData;

export const questions = [
  {
    id: 1,
    title: '水的相图分析',
    text: '将水从25°C、1 atm 加热至200°C，保持压力不变。请观察相态变化过程，说明在什么温度下发生相变？此时的饱和温度是多少？',
    targetMaterial: 'H2O',
    startParams: { temperature: 298.15, pressure: 101325 },
    endParams: { temperature: 473.15, pressure: 101325 },
    expectedAnswer: '在373.15 K (100°C) 时发生沸腾，由液态变为气态。饱和温度为373.15 K。'
  },
  {
    id: 2,
    title: '超临界流体识别',
    text: '将CO₂的温度升高至350 K，压力升高至10 MPa。此时CO₂处于什么状态？与常规的液态和气态有何不同？',
    targetMaterial: 'CO2',
    startParams: { temperature: 300, pressure: 1e6 },
    endParams: { temperature: 350, pressure: 10e6 },
    expectedAnswer: '处于超临界状态。超临界流体既有液体的高密度，又有气体的低粘度，没有明显的液气界面。'
  },
  {
    id: 3,
    title: '临界点穿越',
    text: '尝试将水的温度从600 K升高到700 K，压力保持在25 MPa。会发生什么现象？为什么说"路径断裂"？',
    targetMaterial: 'H2O',
    startParams: { temperature: 600, pressure: 25e6 },
    endParams: { temperature: 700, pressure: 25e6 },
    expectedAnswer: '从液态变为超临界流体。由于路径越过了临界点，不存在明显的相变过程，液气之间的界限消失，因此说"路径断裂"。'
  },
  {
    id: 4,
    title: '三相点观察',
    text: '将水的参数调整到三相点附近（T≈273.16 K，P≈611.7 Pa）。观察此时可以存在哪三相共存？',
    targetMaterial: 'H2O',
    startParams: { temperature: 260, pressure: 500 },
    endParams: { temperature: 273.16, pressure: 611.7 },
    expectedAnswer: '固态（冰）、液态（水）、气态（水蒸气）可以三相共存。三相点是唯一确定的状态点。'
  },
  {
    id: 5,
    title: 'CO₂的升华现象',
    text: '将CO₂的压力保持在1 atm（101325 Pa），温度从200 K升高到300 K。会观察到什么现象？为什么？',
    targetMaterial: 'CO2',
    startParams: { temperature: 200, pressure: 101325 },
    endParams: { temperature: 300, pressure: 101325 },
    expectedAnswer: 'CO₂会直接从固态升华为气态，不经过液态。因为CO₂的三相点压力为5.18 bar，高于常压，所以在常压下不存在液态。'
  },
  {
    id: 6,
    title: '单位错误诊断',
    text: '有学生计算时将温度300°C直接代入理想气体方程而不转换为开尔文。这会导致多大的误差？请用实际数据验证。',
    targetMaterial: 'Ar',
    startParams: { temperature: 300, pressure: 1e5 },
    endParams: { temperature: 573.15, pressure: 1e5 },
    expectedAnswer: '误差：300°C = 573.15 K，如误当作300 K计算，体积等会偏差约47%。必须使用绝对温标。'
  },
  {
    id: 7,
    title: '氨的制冷循环分析',
    text: '氨作为制冷剂，在蒸发器中温度为-20°C，压力约为0.19 MPa。此时氨处于什么相态？如果压力不变，温度升高到0°C会发生什么？',
    targetMaterial: 'NH3',
    startParams: { temperature: 253.15, pressure: 190000 },
    endParams: { temperature: 273.15, pressure: 190000 },
    expectedAnswer: '在-20°C、0.19 MPa下氨处于湿蒸汽区（液气共存）。温度升高到0°C时，完全蒸发为过热氨气。'
  }
];

export function calculateProperties(materialKey, T, P) {
  const mat = materials[materialKey];
  if (!mat) return null;
  
  const Tc = mat.critical.temperature;
  const Pc = mat.critical.pressure;
  const Tt = mat.triple.temperature;
  const Pt = mat.triple.pressure;
  
  let phase = '未知';
  let phaseColor = 0x888888;
  
  const satData = mat.saturationData;
  let Psat = null;
  
  for (let i = 0; i < satData.length - 1; i++) {
    if (T >= satData[i].T && T <= satData[i + 1].T) {
      const frac = (T - satData[i].T) / (satData[i + 1].T - satData[i].T);
      Psat = satData[i].P + frac * (satData[i + 1].P - satData[i].P);
      break;
    }
  }
  
  if (T > Tc && P > Pc) {
    phase = '超临界';
    phaseColor = 0xba68c8;
  } else if (T < Tt && P > Pt) {
    phase = '固态';
    phaseColor = 0x4fc3f7;
  } else if (Psat !== null) {
    if (Math.abs(P - Psat) / Psat < 0.02) {
      phase = '液气共存';
      phaseColor = 0xffd54f;
    } else if (P > Psat) {
      phase = '液态';
      phaseColor = 0x667eea;
    } else {
      phase = '气态';
      phaseColor = 0x81c784;
    }
  } else if (T < Tc) {
    phase = P > Pc ? '液态' : '气态';
    phaseColor = phase === '液态' ? 0x667eea : 0x81c784;
  }
  
  const R = materialKey === 'H2O' ? 461.5 : 
            materialKey === 'CO2' ? 188.9 :
            materialKey === 'NH3' ? 488.2 : 208.1;
  
  let v, h, s;
  
  if (phase === '气态' || phase === '超临界') {
    v = R * T / P;
    h = 1.005 * 1000 * (T - Tt);
    s = 1.005 * 1000 * Math.log(T / Tt) - R * Math.log(P / Pt);
  } else if (phase === '液态') {
    v = mat.triple.volume * (1 + 2e-4 * (T - Tt));
    h = 4.217 * 1000 * (T - Tt);
    s = 4.217 * 1000 * Math.log(T / Tt);
  } else if (phase === '固态') {
    v = 0.917e-3;
    h = 2.108 * 1000 * (T - Tt) - 334e3;
    s = 2.108 * 1000 * Math.log(T / Tt) - 334e3 / Tt;
  } else {
    v = 1e-3;
    h = 0;
    s = 0;
  }
  
  let quality = null;
  if (phase === '液气共存' && Psat !== null) {
    const PsatLocal = Psat;
    const vf = mat.triple.volume;
    const vg = R * T / PsatLocal;
    quality = Math.max(0, Math.min(1, (v - vf) / (vg - vf)));
  }
  
  return {
    phase,
    phaseColor,
    specificVolume: v,
    enthalpy: h / 1000,
    entropy: s / 1000,
    saturationPressure: Psat,
    quality,
    isNearCritical: T > Tc * 0.9 && T < Tc * 1.1 && P > Pc * 0.9 && P < Pc * 1.1,
    isAboveCritical: T > Tc && P > Pc,
    reducedTemperature: T / Tc,
    reducedPressure: P / Pc
  };
}

export function validateParameters(materialKey, T, P, protectionEnabled) {
  const mat = materials[materialKey];
  if (!mat) return { valid: false, error: '未知材料' };
  
  const errors = [];
  const warnings = [];
  
  if (T < 0) {
    errors.push({
      type: '单位错误',
      detail: `温度 ${T.toFixed(1)} K 为负值，绝对温度不能为负`,
      location: '温度输入',
      suggestion: '检查是否误用了摄氏度而未转换，或存在计算错误'
    });
  }
  
  if (T < 50 || T > 2000) {
    warnings.push({
      type: '数据外推',
      detail: `温度 ${T.toFixed(1)} K 超出常规测量范围 [50 K, 2000 K]`,
      location: '温度输入',
      suggestion: '极端温度下的数据可能不准确，注意验证结果'
    });
  }
  
  if (P < 0) {
    errors.push({
      type: '单位错误',
      detail: `压力 ${P.toExponential(2)} Pa 为负值`,
      location: '压力输入',
      suggestion: '检查压力单位，是否混淆了表压和绝对压'
    });
  }
  
  if (protectionEnabled) {
    if (T > mat.critical.temperature * 1.5) {
      warnings.push({
        type: '越过临界点',
        detail: `温度 ${T.toFixed(1)} K 远高于临界温度 ${mat.critical.temperature.toFixed(1)} K`,
        location: '高温区域',
        suggestion: '超过临界点后，液气两相的概念不再适用，注意相态描述'
      });
    }
    
    if (P > mat.critical.pressure * 1.5) {
      warnings.push({
        type: '越过临界点',
        detail: `压力 ${P.toExponential(2)} Pa 远高于临界压力 ${mat.critical.pressure.toExponential(2)} Pa`,
        location: '高压区域',
        suggestion: '超临界区域的物性计算需要更精确的状态方程'
      });
    }
    
    if (T > mat.critical.temperature && P < mat.critical.pressure) {
      warnings.push({
        type: '路径断裂风险',
        detail: '当前路径在临界温度以上但压力低于临界压力',
        location: '相边界附近',
        suggestion: '此区域不存在传统意义上的相变，状态变化是连续的'
      });
    }
  }
  
  if (T > mat.critical.temperature && P < mat.critical.pressure * 0.1) {
    const nearByError = mat.commonErrors.find(e => 
      e.type === '越过临界点' && e.location.includes('临界温度')
    );
    if (nearByError) {
      warnings.push({
        ...nearByError,
        detail: `当前 T=${T.toFixed(1)} K > Tc=${mat.critical.temperature.toFixed(1)} K，但 P=${P.toExponential(2)} Pa << Pc=${mat.critical.pressure.toExponential(2)} Pa`
      });
    }
  }
  
  const randomCheck = Math.random();
  if (randomCheck < 0.15 && mat.commonErrors.length > 0) {
    const randomError = mat.commonErrors[Math.floor(Math.random() * mat.commonErrors.length)];
    warnings.push({
      ...randomError,
      detail: '[模拟学生错误] ' + randomError.detail
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    allIssues: [...errors, ...warnings]
  };
}
