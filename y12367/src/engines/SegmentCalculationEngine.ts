import type {
  WorkingConditionSegment,
  SegmentScheme,
  VoltageCurrentData,
  TemperatureData,
  SpeedTorqueData,
  EfficiencyReport,
  AnomalyRecord,
  ChartDataPoint,
} from '@/types';
import { generateId } from '@/utils/helpers';

export class SegmentCalculationEngine {
  private activeScheme: SegmentScheme | null = null;

  setActiveScheme(scheme: SegmentScheme): void {
    this.activeScheme = scheme;
  }

  getActiveScheme(): SegmentScheme | null {
    return this.activeScheme;
  }

  getSegments(): WorkingConditionSegment[] {
    return this.activeScheme?.segments ?? [];
  }

  adjustSegmentBoundary(
    segmentId: string,
    newSpeedRange?: [number, number],
    newTorqueRange?: [number, number]
  ): WorkingConditionSegment[] {
    if (!this.activeScheme) return [];
    
    const segments = [...this.activeScheme.segments];
    const index = segments.findIndex(s => s.id === segmentId);
    
    if (index === -1) return segments;
    
    const updatedSegment = { ...segments[index] };
    
    if (newSpeedRange) {
      updatedSegment.speedRange = newSpeedRange;
    }
    if (newTorqueRange) {
      updatedSegment.torqueRange = newTorqueRange;
    }
    
    segments[index] = updatedSegment;
    
    if (index > 0) {
      const prevSegment = segments[index - 1];
      prevSegment.speedRange[1] = updatedSegment.speedRange[0];
      prevSegment.torqueRange[1] = updatedSegment.torqueRange[0];
    }
    if (index < segments.length - 1) {
      const nextSegment = segments[index + 1];
      nextSegment.speedRange[0] = updatedSegment.speedRange[1];
      nextSegment.torqueRange[0] = updatedSegment.torqueRange[1];
    }
    
    this.activeScheme.segments = segments;
    return segments;
  }

  addSegment(afterSegmentId: string, name: string): WorkingConditionSegment[] {
    if (!this.activeScheme) return [];
    
    const segments = [...this.activeScheme.segments];
    const index = segments.findIndex(s => s.id === afterSegmentId);
    
    if (index === -1) return segments;
    
    const currentSegment = segments[index];
    const nextSegment = segments[index + 1];
    
    const midSpeed = (currentSegment.speedRange[1] + (nextSegment?.speedRange[0] ?? currentSegment.speedRange[1] + 500)) / 2;
    const midTorque = (currentSegment.torqueRange[1] + (nextSegment?.torqueRange[0] ?? currentSegment.torqueRange[1] + 25)) / 2;
    
    const newSegment: WorkingConditionSegment = {
      id: generateId(),
      name,
      order: index + 1,
      speedRange: [currentSegment.speedRange[1], midSpeed],
      torqueRange: [currentSegment.torqueRange[1], midTorque],
      color: this.getSegmentColor(index + 1),
    };
    
    currentSegment.speedRange[1] = midSpeed;
    currentSegment.torqueRange[1] = midTorque;
    
    if (nextSegment) {
      nextSegment.speedRange[0] = midSpeed;
      nextSegment.torqueRange[0] = midTorque;
    }
    
    segments.splice(index + 1, 0, newSegment);
    
    segments.forEach((s, i) => {
      s.order = i;
    });
    
    this.activeScheme.segments = segments;
    return segments;
  }

  removeSegment(segmentId: string): WorkingConditionSegment[] {
    if (!this.activeScheme) return [];
    if (this.activeScheme.segments.length <= 2) return [];
    
    const segments = [...this.activeScheme.segments];
    const index = segments.findIndex(s => s.id === segmentId);
    
    if (index === -1) return segments;
    
    const removedSegment = segments[index];
    const prevSegment = segments[index - 1];
    const nextSegment = segments[index + 1];
    
    if (prevSegment) {
      prevSegment.speedRange[1] = removedSegment.speedRange[1];
      prevSegment.torqueRange[1] = removedSegment.torqueRange[1];
    }
    if (nextSegment) {
      nextSegment.speedRange[0] = removedSegment.speedRange[0];
      nextSegment.torqueRange[0] = removedSegment.torqueRange[0];
    }
    
    segments.splice(index, 1);
    
    segments.forEach((s, i) => {
      s.order = i;
    });
    
    this.activeScheme.segments = segments;
    return segments;
  }

  assignDataToSegments<T extends { speed?: number; torque?: number }>(
    data: T[],
    getValue: (item: T) => { speed: number; torque: number }
  ): Map<string, T[]> {
    const segments = this.getSegments();
    const result = new Map<string, T[]>();
    
    segments.forEach(s => result.set(s.id, []));
    
    for (const item of data) {
      const { speed, torque } = getValue(item);
      const segment = this.findSegmentForValue(speed, torque, segments);
      if (segment) {
        const arr = result.get(segment.id);
        if (arr) arr.push(item);
      }
    }
    
    return result;
  }

  private findSegmentForValue(
    speed: number,
    torque: number,
    segments: WorkingConditionSegment[]
  ): WorkingConditionSegment | null {
    for (const segment of segments) {
      if (speed >= segment.speedRange[0] && speed < segment.speedRange[1] &&
          torque >= segment.torqueRange[0] && torque < segment.torqueRange[1]) {
        return segment;
      }
    }
    
    if (segments.length > 0) {
      const lastSegment = segments[segments.length - 1];
      if (speed >= lastSegment.speedRange[1] || torque >= lastSegment.torqueRange[1]) {
        return lastSegment;
      }
      return segments[0];
    }
    
    return null;
  }

  onSegmentChange(
    voltageData: VoltageCurrentData[],
    temperatureData: TemperatureData[],
    speedData: SpeedTorqueData[],
    efficiencyReports: EfficiencyReport[],
    anomalies: AnomalyRecord[]
  ): {
    voltageData: VoltageCurrentData[];
    temperatureData: TemperatureData[];
    speedData: SpeedTorqueData[];
    efficiencyReports: EfficiencyReport[];
    anomalies: AnomalyRecord[];
    chartData: {
      efficiency: ChartDataPoint[];
      temperature: ChartDataPoint[];
      power: ChartDataPoint[];
    };
  } {
    const segments = this.getSegments();
    
    const updateSegmentId = <T extends { speed?: number; torque?: number; segmentId: string }>(
      items: T[],
      getValue: (item: T) => { speed: number; torque: number }
    ): T[] => {
      return items.map(item => {
        const { speed, torque } = getValue(item);
        const segment = this.findSegmentForValue(speed, torque, segments);
        return segment ? { ...item, segmentId: segment.id } : item;
      });
    };
    
    const updatedVoltageData = updateSegmentId(voltageData, item => ({ 
      speed: 0, torque: 0 
    }));
    
    const updatedTemperatureData = updateSegmentId(temperatureData, item => ({ 
      speed: 0, torque: 0 
    }));
    
    const updatedSpeedData = updateSegmentId(speedData, item => ({ 
      speed: item.speed ?? 0, torque: item.torque ?? 0 
    }));
    
    const updatedVoltageDataWithSpeed = updatedVoltageData.map(item => {
      const matchedSpeed = speedData.find(
        s => s.timestamp.getTime() === item.timestamp.getTime() &&
             s.testBenchId === item.testBenchId &&
             s.materialId === item.materialId
      );
      return {
        ...item,
        speed: matchedSpeed?.speed ?? 0,
        torque: matchedSpeed?.torque ?? 0,
      };
    });
    
    const assignedVoltage = this.assignDataToSegments(
      updatedVoltageDataWithSpeed,
      item => ({ speed: item.speed, torque: item.torque })
    );
    
    const finalVoltageData = updatedVoltageData.map(item => {
      const withValues = updatedVoltageDataWithSpeed.find(v => v.id === item.id)!;
      const segment = this.findSegmentForValue(
        withValues.speed, withValues.torque, segments
      );
      return segment ? { ...item, segmentId: segment.id } : item;
    });
    
    const finalTemperatureData = updatedTemperatureData.map(item => {
      const matchedSpeed = speedData.find(
        s => s.timestamp.getTime() === item.timestamp.getTime() &&
             s.testBenchId === item.testBenchId &&
             s.materialId === item.materialId
      );
      const segment = this.findSegmentForValue(
        matchedSpeed?.speed ?? 0, matchedSpeed?.torque ?? 0, segments
      );
      return segment ? { ...item, segmentId: segment.id } : item;
    });
    
    const finalSpeedData = updateSegmentId(speedData, item => ({
      speed: item.speed, torque: item.torque
    }));
    
    const chartData = this.generateChartData(
      finalVoltageData, finalTemperatureData, finalSpeedData, efficiencyReports
    );
    
    return {
      voltageData: finalVoltageData,
      temperatureData: finalTemperatureData,
      speedData: finalSpeedData,
      efficiencyReports,
      anomalies,
      chartData,
    };
  }

  private generateChartData(
    voltageData: VoltageCurrentData[],
    temperatureData: TemperatureData[],
    speedData: SpeedTorqueData[],
    reports: EfficiencyReport[]
  ): {
    efficiency: ChartDataPoint[];
    temperature: ChartDataPoint[];
    power: ChartDataPoint[];
  } {
    const efficiencyMap = new Map<number, number>();
    reports.forEach(r => {
      const midTime = (r.startTime.getTime() + r.endTime.getTime()) / 2;
      efficiencyMap.set(midTime, r.efficiency);
    });
    
    const efficiency: ChartDataPoint[] = Array.from(efficiencyMap.entries())
      .map(([timestamp, value]) => ({ timestamp, value }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const temperature: ChartDataPoint[] = temperatureData
      .filter(d => d.objectType === 'winding')
      .map(d => ({
        timestamp: d.timestamp.getTime(),
        value: d.temperature,
        segmentId: d.segmentId,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    const power: ChartDataPoint[] = voltageData
      .map(d => ({
        timestamp: d.timestamp.getTime(),
        value: d.power,
        segmentId: d.segmentId,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return { efficiency, temperature, power };
  }

  createNewScheme(name: string, segments: WorkingConditionSegment[], createdBy: string): SegmentScheme {
    return {
      id: generateId(),
      name,
      segments: segments.map((s, i) => ({ ...s, order: i })),
      isActive: false,
      createdAt: new Date(),
      createdBy,
    };
  }

  private getSegmentColor(index: number): string {
    const colors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];
    return colors[index % colors.length];
  }

  validateSegmentBoundaries(segments: WorkingConditionSegment[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (segments.length < 2) {
      errors.push('至少需要2个工况分段');
    }
    
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      
      if (seg.speedRange[0] >= seg.speedRange[1]) {
        errors.push(`分段"${seg.name}"转速范围无效`);
      }
      if (seg.torqueRange[0] >= seg.torqueRange[1]) {
        errors.push(`分段"${seg.name}"扭矩范围无效`);
      }
      
      if (i > 0) {
        const prevSeg = segments[i - 1];
        if (Math.abs(prevSeg.speedRange[1] - seg.speedRange[0]) > 0.01) {
          errors.push(`分段"${prevSeg.name}"和"${seg.name}"转速范围不连续`);
        }
        if (Math.abs(prevSeg.torqueRange[1] - seg.torqueRange[0]) > 0.01) {
          errors.push(`分段"${prevSeg.name}"和"${seg.name}"扭矩范围不连续`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}

export const segmentEngine = new SegmentCalculationEngine();
