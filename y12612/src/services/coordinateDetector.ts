import type { CoordinateCheckResult, Device, FlipType } from '@/types';

export class CoordinateFlipDetector {
  private static readonly LAT_MIN = -90;
  private static readonly LAT_MAX = 90;
  private static readonly LNG_MIN = -180;
  private static readonly LNG_MAX = 180;

  static check(x: number, y: number): CoordinateCheckResult {
    const swapResult = this.detectLatLngSwap(x, y);
    if (swapResult.hasFlip) {
      return swapResult;
    }

    const rangeResult = this.detectOutOfRange(x, y);
    if (rangeResult.hasFlip) {
      return rangeResult;
    }

    return {
      hasFlip: false,
      reason: '坐标值在正常范围内',
      correctedX: x,
      correctedY: y,
    };
  }

  static detectLatLngSwap(x: number, y: number): CoordinateCheckResult {
    const xLooksLikeLat = x >= this.LAT_MIN && x <= this.LAT_MAX;
    const yLooksLikeLng = y >= this.LNG_MIN && y <= this.LNG_MAX;
    const xLooksLikeLng = x >= this.LNG_MIN && x <= this.LNG_MAX;
    const yLooksLikeLat = y >= this.LAT_MIN && y <= this.LAT_MAX;

    if (xLooksLikeLat && yLooksLikeLng && !xLooksLikeLng && !yLooksLikeLat) {
      return {
        hasFlip: true,
        flipType: 'lat_lng_swapped',
        reason: this.generateReadableReason('lat_lng_swapped', [x, y]),
        correctedX: y,
        correctedY: x,
      };
    }

    if (xLooksLikeLat && yLooksLikeLng && Math.abs(x) <= 90 && Math.abs(y) > 90) {
      return {
        hasFlip: true,
        flipType: 'lat_lng_swapped',
        reason: this.generateReadableReason('lat_lng_swapped', [x, y]),
        correctedX: y,
        correctedY: x,
      };
    }

    return {
      hasFlip: false,
      reason: '',
      correctedX: x,
      correctedY: y,
    };
  }

  static detectOutOfRange(x: number, y: number): CoordinateCheckResult {
    const xOutOfRange = x < this.LNG_MIN || x > this.LNG_MAX;
    const yOutOfRange = y < this.LAT_MIN || y > this.LAT_MAX;

    if (xOutOfRange || yOutOfRange) {
      const issues: string[] = [];
      let correctedX = x;
      let correctedY = y;

      if (xOutOfRange) {
        issues.push(`经度${x}°超出正常值域[-180°, 180°]`);
        correctedX = this.clampToRange(x, this.LNG_MIN, this.LNG_MAX);
      }
      if (yOutOfRange) {
        issues.push(`纬度${y}°超出正常值域[-90°, 90°]`);
        correctedY = this.clampToRange(y, this.LAT_MIN, this.LAT_MAX);
      }

      return {
        hasFlip: true,
        flipType: 'out_of_range',
        reason: this.generateReadableReason('out_of_range', [x, y], issues),
        correctedX,
        correctedY,
      };
    }

    return {
      hasFlip: false,
      reason: '',
      correctedX: x,
      correctedY: y,
    };
  }

  static generateReadableReason(
    flipType: FlipType,
    values: number[],
    extra: string[] = []
  ): string {
    const [x, y] = values;

    switch (flipType) {
      case 'lat_lng_swapped':
        return `经纬度数值颠倒：原始填入的经度值${x}（纬度正常值域-90°~90°）实际应为纬度，` +
               `原始填入的纬度值${y}（经度正常值域-180°~180°）实际应为经度，` +
               `系统已自动交换两值位置。`;

      case 'out_of_range':
        return `坐标值超出正常范围：${extra.join('，')}。` +
               `已自动修正到合理范围，修正后经度：${this.clampToRange(x, -180, 180).toFixed(4)}°，` +
               `纬度：${this.clampToRange(y, -90, 90).toFixed(4)}°。`;

      case 'wrong_coordinate_system':
        return `坐标系不匹配：检测到坐标值${x}, ${y}疑似使用了非WGS84坐标系，` +
               `请确认设备使用的是GPS坐标还是其他工程坐标系。`;

      default:
        return `坐标异常：${x}, ${y}`;
    }
  }

  static deduplicateDevices(newDevices: Device[], existing: Device[]): Device[] {
    const existingMap = new Map(existing.map((d) => [d.id, d]));
    const result: Device[] = [...existing];

    for (const newDev of newDevices) {
      const existingDev = existingMap.get(newDev.id);
      if (existingDev) {
        const index = result.findIndex((d) => d.id === newDev.id);
        if (index !== -1) {
          result[index] = {
            ...existingDev,
            ...newDev,
            annotations: [
              ...existingDev.annotations,
              ...newDev.annotations.filter(
                (a) => !existingDev.annotations.some((ea) => ea.id === a.id)
              ),
            ],
          };
        }
      } else {
        result.push(newDev);
      }
    }

    return result;
  }

  private static clampToRange(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  static processDevices(devices: Device[]): {
    devices: Device[];
    issues: Array<{ deviceId: string; deviceName: string; result: CoordinateCheckResult }>;
  } {
    const issues: Array<{ deviceId: string; deviceName: string; result: CoordinateCheckResult }> = [];

    const processed = devices.map((device) => {
      const result = this.check(device.x, device.y);
      if (result.hasFlip) {
        issues.push({
          deviceId: device.id,
          deviceName: device.name,
          result,
        });
        return {
          ...device,
          x: result.correctedX,
          y: result.correctedY,
          coordinateFlip: {
            type: result.flipType!,
            originalX: device.x,
            originalY: device.y,
            correctedX: result.correctedX,
            correctedY: result.correctedY,
            reason: result.reason,
            userConfirmed: false,
          },
        };
      }
      return device;
    });

    return { devices: processed, issues };
  }
}
