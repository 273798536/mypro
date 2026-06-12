import type {
  WeatherForecast, SalinityRecord, TidalHarmonic, EnergyDevice,
  ResultItem, ResultStatus, MissingMaterial, NoGoZone,
} from '@/types';
import { evaluateHarmonicCoverage } from '@/utils/tideCalculator';
import { assessWeatherReliability } from '@/utils/energyCalculator';
import { detectDominantUnit, markUnitMismatches } from '@/utils/salinityConverter';

function pointInPolygon(lat: number, lng: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][1], yi = poly[i][0];
    const xj = poly[j][1], yj = poly[j][0];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function checkDeviceInNoGoZone(device: EnergyDevice, zones: NoGoZone[]): { inZone: boolean; zoneName?: string } {
  for (const z of zones) {
    if (pointInPolygon(device.lat, device.lng, z.coordinates)) {
      return { inZone: true, zoneName: z.name };
    }
  }
  return { inZone: false };
}

export function buildAllResults(p: {
  weather: WeatherForecast[];
  salinity: SalinityRecord[];
  harmonics: TidalHarmonic[];
  devices: EnergyDevice[];
  noGoZones: NoGoZone[];
}): { results: ResultItem[]; missing: MissingMaterial[]; devices: EnergyDevice[] } {
  const results: ResultItem[] = [];
  const missing: MissingMaterial[] = [];
  const tidalEval = evaluateHarmonicCoverage(p.harmonics);
  const weatherRel = assessWeatherReliability(p.weather);

  results.push({
    id: 'r-weather', category: 'weather', label: '气象预报数据',
    status: weatherRel.status,
    description: `共 ${p.weather.length} 条 · 可靠度 ${Math.round(weatherRel.score * 100)}% · ${weatherRel.note}`,
    sourceRefs: p.weather[0]?.source ? [p.weather[0].source] : [],
    nextAction: weatherRel.status === 'RECOLLECT' ? {
      type: 'recollect',
      label: '重新下载 ECMWF 72h 预报场（舟山海域）',
      hint: '建议取 6 月 12-14 日整点逐 3h 分辨率网格',
    } : weatherRel.status === 'DEFERRED' ? {
      type: 'verify', label: '核对中央台历史同期资料',
    } : undefined,
  });

  if (p.weather.length === 0) {
    missing.push({
      id: 'm-w', name: 'ECMWF 气象预报场', category: 'weather',
      dateRange: '2026-06-12 ~ 2026-06-14',
      impact: '无波浪输入，能流估算中断', severity: 'RECOLLECT',
    });
  }

  const salinityClean = markUnitMismatches(p.salinity);
  const mismatchCount = salinityClean.filter(s => s.unitMismatch).length;
  const dominant = detectDominantUnit(p.salinity);
  results.push({
    id: 'r-sal', category: 'salinity', label: '盐度观测记录',
    status: mismatchCount > p.salinity.length * 0.3 ? 'RECOLLECT' : mismatchCount > 0 ? 'DEFERRED' : 'AVAILABLE',
    description: `共 ${p.salinity.length} 条 · 站数 ${new Set(p.salinity.map(s => s.station)).size} 站 · 主口径 ${dominant}${mismatchCount ? ` · 混用 ${mismatchCount} 行` : ''}`,
    nextAction: mismatchCount ? {
      type: 'unify_unit',
      label: '一键统一为 PSU 口径（PSS-78）',
      hint: `当前混用 ${mismatchCount} 行：‰/ppt/mS/cm → PSU，换算说明见盐度换算表`,
    } : undefined,
  });

  const depthStationPairs = new Set(
    p.salinity.map(s => `${s.station}@${Math.floor(s.depth / 10) * 10}`)
  ).size;
  if (depthStationPairs < 6) {
    missing.push({
      id: 'm-sal', name: '深水层盐度观测记录（30m）', category: 'salinity',
      dateRange: '2026-06-12',
      impact: '潮位置信度下降约 18%，能流估算偏差约 9%', severity: depthStationPairs < 3 ? 'RECOLLECT' : 'DEFERRED',
    });
  }

  results.push({
    id: 'r-tide', category: 'tide', label: '潮汐调和推算',
    status: tidalEval.missingMajor.length >= 2 ? 'RECOLLECT' : tidalEval.missingMajor.length === 1 ? 'DEFERRED' : 'AVAILABLE',
    description: `输入 ${p.harmonics.length} 个分潮 · 缺主分潮 ${tidalEval.missingMajor.join('、') || '无'} · 置信度 ${Math.round(tidalEval.confidence * 100)}%`,
    sourceRefs: Array.from(new Set(p.harmonics.map(h => h.sourceMaterial))),
    nextAction: tidalEval.missingMajor.length ? {
      type: 'upload_material',
      label: `补充 ${tidalEval.missingMajor.join('、')} 调和常数`,
      hint: '来源：《近海海洋站年潮汐调和常数汇编》ZD-HX 系列',
    } : undefined,
  });

  const updatedDevices = p.devices.map(d => {
    const chk = checkDeviceInNoGoZone(d, p.noGoZones);
    let status: ResultStatus = d.status;
    if (chk.inZone) status = 'RECOLLECT';
    return { ...d, inNoGoZone: chk.inZone, status } as EnergyDevice;
  });

  updatedDevices.forEach(d => {
    const chk = checkDeviceInNoGoZone(d, p.noGoZones);
    results.push({
      id: `r-dev-${d.id}`, category: 'device', label: d.name,
      status: d.status,
      description: `坐标 (${d.lat.toFixed(4)}, ${d.lng.toFixed(4)}) · 额定 ${d.ratedPower}kW · 效率 ${Math.round(d.efficiency * 100)}%${chk.inZone ? ` · 位于「${chk.zoneName}」边界内` : ''}`,
      sourceRefs: ['设备台账 #' + d.id.toUpperCase()],
      nextAction: chk.inZone ? {
        type: 'recollect',
        label: '重新选点（移出航道/保护区）',
        hint: `当前位点越界：${chk.zoneName}`,
      } : d.status === 'DEFERRED' ? {
        type: 'verify', label: '复核该位点盐度深度覆盖',
      } : undefined,
    });
  });

  const redCount = results.filter(r => r.status === 'RECOLLECT').length;
  const yelCount = results.filter(r => r.status === 'DEFERRED').length;
  const totalEnergyEstimate = updatedDevices.length
    ? Math.round(updatedDevices.reduce((s, d) => s + 8760 * d.ratedPower * d.efficiency, 0) / 1000)
    : 0;

  results.push({
    id: 'r-energy', category: 'energy', label: '年发电量估算（理论值）',
    status: redCount > 0 ? 'DEFERRED' : yelCount > 0 ? 'DEFERRED' : 'AVAILABLE',
    description: updatedDevices.length
      ? `${updatedDevices.length} 台机组总估算 ${totalEnergyEstimate.toLocaleString()} MWh/年 · 平均容量因子 ${Math.round(updatedDevices.reduce((s, d) => s + d.efficiency, 0) / updatedDevices.length * 100)}%`
      : '暂无设备录入，无法估算',
    nextAction: !updatedDevices.length ? {
      type: 'upload_material', label: '录入设备台账（坐标/额定功率/效率）',
    } : undefined,
  });

  return { results, missing, devices: updatedDevices };
}

export function countByStatus<T extends { status: ResultStatus }>(items: T[]): Record<ResultStatus, number> {
  return {
    AVAILABLE: items.filter(i => i.status === 'AVAILABLE').length,
    DEFERRED: items.filter(i => i.status === 'DEFERRED').length,
    RECOLLECT: items.filter(i => i.status === 'RECOLLECT').length,
  };
}
