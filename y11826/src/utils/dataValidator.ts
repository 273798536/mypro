import { Station, BusLine, Bus, DataValidationIssue, ImportResult } from '../types';

export function validateStations(data: Partial<Station>[]): ImportResult<Station[]> {
  const issues: DataValidationIssue[] = [];
  const validatedData: Station[] = [];

  data.forEach((station, index) => {
    const stationIssues: DataValidationIssue[] = [];

    if (!station.passengerFlow && station.passengerFlow !== 0) {
      stationIssues.push({
        field: `stations[${index}].passengerFlow`,
        type: 'missing',
        message: `站点"${station.name || station.id}"缺少客流数据`,
        suggestion: '建议补充站点当前客流人数，默认填充为30',
      });
    }

    if (!station.maxCapacity) {
      stationIssues.push({
        field: `stations[${index}].maxCapacity`,
        type: 'missing',
        message: `站点"${station.name || station.id}"缺少最大容量`,
        suggestion: '建议补充站点最大承载人数，默认填充为80',
      });
    }

    if (station.isTransfer === undefined) {
      stationIssues.push({
        field: `stations[${index}].isTransfer`,
        type: 'missing',
        message: `站点"${station.name || station.id}"缺少换乘站标记`,
        suggestion: '建议标记是否为换乘站，默认填充为false',
      });
    }

    issues.push(...stationIssues);

    validatedData.push({
      id: station.id || `s${index}`,
      name: station.name || `站点${index + 1}`,
      x: station.x || 100 + index * 100,
      y: station.y || 200,
      passengerFlow: station.passengerFlow ?? 30,
      maxCapacity: station.maxCapacity ?? 80,
      isTransfer: station.isTransfer ?? false,
      connectedLines: station.connectedLines || [],
      consecutiveOverload: 0,
    });
  });

  return {
    success: issues.length === 0,
    data: validatedData,
    issues,
  };
}

export function validateLines(data: Partial<BusLine>[]): ImportResult<BusLine[]> {
  const issues: DataValidationIssue[] = [];
  const validatedData: BusLine[] = [];

  data.forEach((line, index) => {
    const lineIssues: DataValidationIssue[] = [];

    if (!line.stations || line.stations.length === 0) {
      lineIssues.push({
        field: `lines[${index}].stations`,
        type: 'missing',
        message: `线路"${line.name || line.id}"缺少站点列表`,
        suggestion: '建议补充线路经过的站点ID列表，默认使用样例数据',
      });
    }

    if (!line.interval) {
      lineIssues.push({
        field: `lines[${index}].interval`,
        type: 'missing',
        message: `线路"${line.name || line.id}"缺少发车间隔`,
        suggestion: '建议补充发车间隔(分钟)，默认填充为10分钟',
      });
    }

    issues.push(...lineIssues);

    validatedData.push({
      id: line.id || `l${index}`,
      name: line.name || `${index + 1}路`,
      color: line.color || '#165DFF',
      stations: line.stations || [],
      interval: line.interval ?? 10,
      firstBus: line.firstBus || '06:00',
      lastBus: line.lastBus || '22:00',
    });
  });

  return {
    success: issues.length === 0,
    data: validatedData,
    issues,
  };
}

export function validateBuses(data: Partial<Bus>[]): ImportResult<Bus[]> {
  const issues: DataValidationIssue[] = [];
  const validatedData: Bus[] = [];

  data.forEach((bus, index) => {
    const busIssues: DataValidationIssue[] = [];

    if (!bus.driverName) {
      busIssues.push({
        field: `buses[${index}].driverName`,
        type: 'missing',
        message: `车辆"${bus.plateNumber || bus.id}"缺少司机姓名`,
        suggestion: '建议补充司机姓名，默认填充为"未知司机"',
      });
    }

    if (!bus.continuousDriving && bus.continuousDriving !== 0) {
      busIssues.push({
        field: `buses[${index}].continuousDriving`,
        type: 'missing',
        message: `车辆"${bus.plateNumber || bus.id}"缺少连续驾驶时长`,
        suggestion: '建议补充连续驾驶时长(小时)，默认填充为1.0小时',
      });
    }

    if (!bus.maxPassengers) {
      busIssues.push({
        field: `buses[${index}].maxPassengers`,
        type: 'missing',
        message: `车辆"${bus.plateNumber || bus.id}"缺少最大载客量`,
        suggestion: '建议补充最大载客人数，默认填充为50人',
      });
    }

    issues.push(...busIssues);

    validatedData.push({
      id: bus.id || `b${index}`,
      lineId: bus.lineId || 'l1',
      plateNumber: bus.plateNumber || `车辆${index + 1}`,
      driverName: bus.driverName || '未知司机',
      currentStationIndex: bus.currentStationIndex || 0,
      direction: bus.direction || 'forward',
      status: bus.status || 'running',
      passengerCount: bus.passengerCount || 20,
      maxPassengers: bus.maxPassengers ?? 50,
      continuousDriving: bus.continuousDriving ?? 1.0,
      lastDepartureTime: bus.lastDepartureTime || 0,
      isOnTime: bus.isOnTime ?? true,
    });
  });

  return {
    success: issues.length === 0,
    data: validatedData,
    issues,
  };
}
