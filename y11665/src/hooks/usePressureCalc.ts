import type { PipeSegment, Valve, PumpStation, AnomalyItem } from '@/types';

export function getPressureColor(pressure: number, threshold: number, dataQuality: string): string {
  if (dataQuality === 'bad' || pressure < 0) {
    return '#FF4444';
  }
  if (pressure < threshold) {
    const ratio = pressure / threshold;
    return ratio < 0.5 ? '#FF6B6B' : '#FFAA00';
  }
  const maxPressure = 0.6;
  if (pressure >= maxPressure) return '#FF3333';
  const ratio = (pressure - threshold) / (maxPressure - threshold);
  if (ratio < 0.33) return '#00D4FF';
  if (ratio < 0.66) return '#00FF88';
  return '#FFDD00';
}

export function getPressureGradient(threshold: number): string[] {
  return ['#FF6B6B', '#FFAA00', '#00D4FF', '#00FF88', '#FFDD00', '#FF3333'];
}

export function recalculatePressures(
  segments: PipeSegment[],
  valves: Valve[],
  pumpStations: PumpStation[]
): PipeSegment[] {
  const closedValveSegments = new Set(
    valves.filter(v => !v.isOpen).map(v => v.pipeSegmentId)
  );

  return segments.map(segment => {
    if (segment.dataQuality === 'bad') {
      return { ...segment, currentPressure: segment.basePressure };
    }

    if (closedValveSegments.has(segment.id)) {
      return { ...segment, currentPressure: Math.max(0, segment.basePressure * 0.15) };
    }

    const hasPumpInfluence = pumpStations.some(ps => {
      const psPos = ps.position;
      const fromNode = findNodePosition(segment.fromNode, segments);
      const toNode = findNodePosition(segment.toNode, segments);
      if (!fromNode || !toNode) return false;
      const midX = (fromNode[0] + toNode[0]) / 2;
      const midZ = (fromNode[2] + toNode[2]) / 2;
      const dist = Math.sqrt((midX - psPos[0]) ** 2 + (midZ - psPos[2]) ** 2);
      return dist < 8 && ps.status === 'running';
    });

    let newPressure = segment.basePressure;
    if (hasPumpInfluence) {
      newPressure = Math.min(0.55, segment.basePressure * 1.1);
    }

    const nearbyClosedValves = valves.filter(v => !v.isOpen && v.pipeSegmentId !== segment.id);
    if (nearbyClosedValves.length > 0) {
      newPressure *= 0.92;
    }

    return {
      ...segment,
      currentPressure: Math.round(newPressure * 100) / 100,
    };
  });
}

function findNodePosition(nodeId: string, segments: PipeSegment[]): [number, number, number] | null {
  for (const seg of segments) {
    if (seg.fromNode === nodeId || seg.toNode === nodeId) {
      return seg.fromNode === nodeId
        ? getNodeApproximatePosition(nodeId, segments)
        : getNodeApproximatePosition(nodeId, segments);
    }
  }
  return null;
}

function getNodeApproximatePosition(nodeId: string, segments: PipeSegment[]): [number, number, number] {
  const nodePositions: Record<string, [number, number, number]> = {
    'N01': [0, 0, 0], 'N02': [5, 0, 0], 'N03': [10, 0, 0],
    'N04': [10, 0, 5], 'N05': [5, 0, 5], 'N06': [0, 0, 5],
    'N07': [15, 0, 2.5], 'N08': [10, 0, -3], 'N09': [0, 0, -3],
    'N10': [5, 0, 10], 'N11': [15, 0, -3], 'N12': [-3, 0, 2.5],
  };
  return nodePositions[nodeId] || [0, 0, 0];
}

export function detectAnomalies(
  segments: PipeSegment[],
  valves: Valve[],
  threshold: number
): AnomalyItem[] {
  const anomalies: AnomalyItem[] = [];

  segments.forEach(segment => {
    if (segment.dataQuality === 'bad') {
      anomalies.push({
        id: 'ANOM_BAD_' + segment.id,
        type: 'bad_data',
        severity: 'high',
        location: segment.id,
        locationId: segment.id,
        message: `管段 ${segment.id} 压力值异常 (${segment.currentPressure}MPa)，数据源: ${segment.source}`,
        suggestion: '检查传感器状态，更换故障设备，重新校准后录入正确值',
        timestamp: Date.now(),
        acknowledged: false,
      });
    }

    if (segment.isClosedLoop && segment.dataQuality !== 'bad') {
      anomalies.push({
        id: 'ANOM_LOOP_' + segment.id,
        type: 'closed_loop',
        severity: 'medium',
        location: segment.id,
        locationId: segment.id,
        message: `管段 ${segment.id} 构成闭环管网，可能导致压力计算偏差`,
        suggestion: '确认闭环结构合理性，必要时增加压力监测点',
        timestamp: Date.now(),
        acknowledged: false,
      });
    }

    if (segment.dataQuality !== 'bad' && segment.currentPressure < threshold && segment.currentPressure >= 0) {
      anomalies.push({
        id: 'ANOM_LOW_' + segment.id,
        type: 'low_pressure',
        severity: segment.currentPressure < threshold * 0.8 ? 'high' : 'medium',
        location: segment.id,
        locationId: segment.id,
        message: `管段 ${segment.id} 压力 ${segment.currentPressure}MPa 低于阈值 ${threshold}MPa`,
        suggestion: segment.currentPressure < threshold * 0.8
          ? '紧急检查上游阀门状态和泵站供压，必要时启动备用泵'
          : '关注压力变化趋势，准备切换阀门或增加供压',
        timestamp: Date.now(),
        acknowledged: false,
      });
    }
  });

  valves.forEach(valve => {
    if (!valve.isSaved) {
      anomalies.push({
        id: 'ANOM_UNSAVED_' + valve.id,
        type: 'unsaved_state',
        severity: 'low',
        location: valve.id,
        locationId: valve.id,
        message: `阀门 ${valve.id} 当前状态未保存，修改时间: ${new Date(valve.lastModified).toLocaleString()}`,
        suggestion: '确认阀门状态后点击保存，避免重启后状态丢失',
        timestamp: Date.now(),
        acknowledged: false,
      });
    }
  });

  return anomalies;
}

export function formatPressure(value: number): string {
  if (value < 0) return `${value.toFixed(2)} MPa (异常)`;
  return `${value.toFixed(2)} MPa`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
