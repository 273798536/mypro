const dayjs = require('dayjs');

const STANDARD_TEMP_C = 25;
const STANDARD_PRESSURE_KPA = 101.325;
const GAS_CONSTANT = 8.314;
const TARGET_GAS_CONCENTRATION_G_PER_L = 0.045;

const ABSORBENT_PRECISION_THRESHOLDS = {
  low: { name: '低精度', decimalPlaces: 2, desc: '仅精确到百分之一克，可能导致效率计算偏差超过±2%' },
  medium: { name: '中等精度', decimalPlaces: 3, desc: '精确到千分之一克，效率计算偏差约±0.5%~±1%' },
  high: { name: '高精度', decimalPlaces: 4, desc: '精确到万分之一克，效率计算偏差可控制在±0.2%以内' }
};

const JUDGMENT_RULES = {
  excellent: { min: 95, label: '优秀', color: 'success' },
  pass: { min: 85, label: '合格', color: 'warning' },
  fail: { min: 0, label: '不合格', color: 'danger' }
};

function celsiusToFahrenheit(c) { return c * 9 / 5 + 32; }
function fahrenheitToCelsius(f) { return (f - 32) * 5 / 9; }
function celsiusToKelvin(c) { return c + 273.15; }
function kelvinToCelsius(k) { return k - 273.15; }

function normalizeTemperature(value, unit) {
  if (value === null || value === undefined || isNaN(value)) return { celsius: null, normalized: null, converted: false, note: '温度值缺失' };
  const u = String(unit || 'C').trim().toUpperCase().replace(/°/g, '');
  let celsius;
  let converted = false;
  let note = '';
  switch (u) {
    case 'C': case 'CELSIUS': case '℃':
      celsius = Number(value); break;
    case 'F': case 'FAHRENHEIT': case '℉':
      celsius = fahrenheitToCelsius(Number(value)); converted = true;
      note = `原温度 ${value}°F 已转换为 ${celsius.toFixed(2)}°C`; break;
    case 'K': case 'KELVIN':
      celsius = kelvinToCelsius(Number(value)); converted = true;
      note = `原温度 ${value}K 已转换为 ${celsius.toFixed(2)}°C`; break;
    default:
      celsius = Number(value);
      note = `温度单位"${unit}"无法识别，默认按摄氏度处理`;
  }
  return {
    celsius,
    kelvin: celsiusToKelvin(celsius),
    normalized: celsius,
    converted,
    note
  };
}

function checkMassPrecision(mass, unit) {
  if (mass === null || mass === undefined || isNaN(mass)) {
    return { level: 'unknown', label: '数据缺失', decimalPlaces: 0, desc: '吸收剂称量数据缺失，无法判断精度', issues: ['吸收剂质量未填写'] };
  }
  const issues = [];
  const massStr = String(mass).trim();
  const decimalMatch = massStr.match(/\.(\d+)/);
  const decimalPlaces = decimalMatch ? decimalMatch[1].length : 0;
  let level, label, desc;
  if (decimalPlaces <= 2) {
    level = 'low'; label = ABSORBENT_PRECISION_THRESHOLDS.low.name;
    desc = ABSORBENT_PRECISION_THRESHOLDS.low.desc;
    issues.push(`称量精度不足：当前数据仅保留${decimalPlaces}位小数，建议使用万分之一天平（保留4位小数）`);
  } else if (decimalPlaces === 3) {
    level = 'medium'; label = ABSORBENT_PRECISION_THRESHOLDS.medium.name;
    desc = ABSORBENT_PRECISION_THRESHOLDS.medium.desc;
    issues.push(`称量精度一般：当前数据保留${decimalPlaces}位小数，对于要求严格的样品建议使用万分之一天平`);
  } else {
    level = 'high'; label = ABSORBENT_PRECISION_THRESHOLDS.high.name;
    desc = ABSORBENT_PRECISION_THRESHOLDS.high.desc;
  }
  if (unit && !['g', 'mg', 'kg'].includes(String(unit).toLowerCase())) {
    issues.push(`质量单位"${unit}"不规范，建议统一使用克(g)`);
  }
  return { level, label, decimalPlaces, desc, issues };
}

function calculateAbsorptionRate(record) {
  const issues = [];
  const warnings = [];
  const tempInfo = normalizeTemperature(record.temperature, record.temperature_unit);
  if (tempInfo.note) warnings.push(tempInfo.note);

  const massPrec = checkMassPrecision(record.absorbent_mass, record.absorbent_mass_unit);
  issues.push(...massPrec.issues);

  let absorbentMassGrams = Number(record.absorbent_mass);
  if (record.absorbent_mass_unit) {
    const u = String(record.absorbent_mass_unit).toLowerCase();
    if (u === 'mg') { absorbentMassGrams = absorbentMassGrams / 1000; }
    else if (u === 'kg') { absorbentMassGrams = absorbentMassGrams * 1000; }
  }

  let gasVolumeLiters = Number(record.gas_volume);
  if (record.gas_volume_unit) {
    const u = String(record.gas_volume_unit).toLowerCase();
    if (u === 'ml' || u === 'ml') { gasVolumeLiters = gasVolumeLiters / 1000; }
    else if (u === 'm³' || u === 'm3') { gasVolumeLiters = gasVolumeLiters * 1000; }
  }

  if (!record.absorbent_mass || isNaN(absorbentMassGrams)) issues.push('吸收剂质量缺失或无效');
  if (!record.gas_volume || isNaN(gasVolumeLiters)) issues.push('气体体积缺失或无效');

  let calculatedRate = null;
  if (absorbentMassGrams > 0 && gasVolumeLiters > 0 && tempInfo.celsius !== null) {
    const tempK = tempInfo.kelvin;
    const pressureKpa = Number(record.pressure) || STANDARD_PRESSURE_KPA;
    const standardVolume = gasVolumeLiters * (STANDARD_PRESSURE_KPA / pressureKpa) * (tempK / celsiusToKelvin(STANDARD_TEMP_C));
    const theoreticalMaxMass = standardVolume * TARGET_GAS_CONCENTRATION_G_PER_L;
    calculatedRate = (absorbentMassGrams / theoreticalMaxMass) * 100;
    calculatedRate = Math.min(100, Math.max(0, calculatedRate));
    calculatedRate = Number(calculatedRate.toFixed(2));
  }

  const reportedRate = record.absorption_rate !== null && record.absorption_rate !== ''
    ? Number(record.absorption_rate) : null;

  const finalRate = calculatedRate !== null ? calculatedRate : reportedRate;

  let judgment = '未判定';
  if (finalRate !== null && !isNaN(finalRate)) {
    if (finalRate >= JUDGMENT_RULES.excellent.min) judgment = JUDGMENT_RULES.excellent.label;
    else if (finalRate >= JUDGMENT_RULES.pass.min) judgment = JUDGMENT_RULES.pass.label;
    else judgment = JUDGMENT_RULES.fail.label;
  }

  if (reportedRate !== null && calculatedRate !== null && Math.abs(reportedRate - calculatedRate) > 2) {
    warnings.push(`导入的吸收率(${reportedRate}%)与重新计算值(${calculatedRate}%)相差超过2%，请核对原始数据`);
  }

  let fillStatus = 'complete';
  const missing = [];
  if (!record.sample_name) missing.push('样品名称');
  if (!record.test_date) missing.push('测试日期');
  if (!record.absorbent_mass) missing.push('吸收剂质量');
  if (!record.gas_volume) missing.push('气体体积');
  if (missing.length > 0) {    fillStatus = missing.length >= 3 ? 'incomplete' : 'partial';
    warnings.push(`以下字段未填写：${missing.join('、')}`);
  }

  let dataQuality = 'normal';
  if (issues.length > 0 || tempInfo.converted) dataQuality = 'warning';
  if (issues.length >= 3 || fillStatus === 'incomplete') dataQuality = 'error';

  return {
    calculatedRate,
    reportedRate,
    finalRate,
    judgment,
    tempInfo,
    massPrecision: { level: massPrec.level, label: massPrec.label, decimalPlaces: massPrec.decimalPlaces, desc: massPrec.desc },
    issues,
    warnings,
    fillStatus,
    dataQuality
  };
}

function judgeFromRate(rate) {
  if (rate === null || rate === undefined || isNaN(rate)) return '未判定';
  if (rate >= JUDGMENT_RULES.excellent.min) return JUDGMENT_RULES.excellent.label;
  if (rate >= JUDGMENT_RULES.pass.min) return JUDGMENT_RULES.pass.label;
  return JUDGMENT_RULES.fail.label;
}

function getHumanReadableIssues(record) {
  const result = [];
  if (record.quality_issues) {
    const issues = JSON.parse(record.quality_issues || '[]');
    issues.forEach(issue => result.push(issue));
  }
  if (!result.length) result.push('未发现明显数据质量问题');
  return result;
}

module.exports = {
  normalizeTemperature,
  checkMassPrecision,
  calculateAbsorptionRate,
  judgeFromRate,
  getHumanReadableIssues,
  JUDGMENT_RULES,
  ABSORBENT_PRECISION_THRESHOLDS,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  celsiusToKelvin,
  kelvinToCelsius
};
