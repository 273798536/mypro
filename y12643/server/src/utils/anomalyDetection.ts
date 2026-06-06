import { ExceptionRecord, AnomalyResult, ExceptionType, RecordType, RecordStatus } from '../types';

export function detectScaleErrors(record: ExceptionRecord): AnomalyResult {
  const data = record.data || {};
  const { scaleValue, scaleUnit, mapScale, coordinateSystem } = data;

  if (record.recordType !== RecordType.SCALE_ERROR) {
    return { isAnomaly: false };
  }

  if (!scaleValue || scaleValue <= 0) {
    return {
      isAnomaly: true,
      type: ExceptionType.SCALE_ERROR,
      title: '比例尺值无效',
      details: `比例尺值为非正数或缺失: ${scaleValue || '空'}`
    };
  }

  const validUnits = ['m', 'km', 'cm', 'mm'];
  if (scaleUnit && !validUnits.includes(scaleUnit)) {
    return {
      isAnomaly: true,
      type: ExceptionType.SCALE_ERROR,
      title: '比例尺单位错误',
      details: `使用了无效的比例尺单位: ${scaleUnit}，应为 ${validUnits.join('/')}`
    };
  }

  if (!scaleUnit) {
    return {
      isAnomaly: true,
      type: ExceptionType.SCALE_ERROR,
      title: '比例尺配置不完整',
      details: '比例尺单位缺失'
    };
  }

  if (coordinateSystem === 'WGS84' && mapScale && mapScale < 1000) {
    return {
      isAnomaly: true,
      type: ExceptionType.SCALE_ERROR,
      title: '坐标系不匹配',
      details: 'WGS84坐标被误用于平面直角坐标系场景'
    };
  }

  if (mapScale && scaleValue) {
    const ratio = Math.abs(scaleValue - mapScale) / mapScale;
    if (ratio > 0.5) {
      return {
        isAnomaly: true,
        type: ExceptionType.SCALE_ERROR,
        title: '比例尺与图幅不匹配',
        details: `比例尺值(${scaleValue})与图幅比例尺(${mapScale})偏差超过50%`
      };
    }
  }

  return { isAnomaly: false };
}

export function detectTrajectoryAnomalies(record: ExceptionRecord): AnomalyResult {
  const data = record.data || {};
  const { points, startTime, endTime, distance, speed } = data;

  if (record.recordType !== RecordType.TRAJECTORY) {
    return { isAnomaly: false };
  }

  if (!points || !Array.isArray(points) || points.length < 2) {
    return {
      isAnomaly: true,
      type: ExceptionType.TRAJECTORY_ANOMALY,
      title: '轨迹数据不完整',
      details: `轨迹点数不足: ${points ? points.length : 0}，至少需要2个点`
    };
  }

  if (startTime && endTime) {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (end < start) {
      return {
        isAnomaly: true,
        type: ExceptionType.TRAJECTORY_ANOMALY,
        title: '轨迹时间异常',
        details: '结束时间早于开始时间'
      };
    }
  }

  if (speed !== undefined) {
    if (speed < 0 || speed > 300) {
      return {
        isAnomaly: true,
        type: ExceptionType.TRAJECTORY_ANOMALY,
        title: '轨迹速度异常',
        details: `速度值超出合理范围(0-300): ${speed}`
      };
    }
  }

  if (distance !== undefined && distance < 0) {
    return {
      isAnomaly: true,
      type: ExceptionType.TRAJECTORY_ANOMALY,
      title: '轨迹距离异常',
      details: `距离值为负数: ${distance}`
    };
  }

  if (Array.isArray(points) && points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (p1.lat !== undefined && p2.lat !== undefined) {
        if (p1.lat < -90 || p1.lat > 90 || p2.lat < -90 || p2.lat > 90) {
          return {
            isAnomaly: true,
            type: ExceptionType.TRAJECTORY_ANOMALY,
            title: '轨迹坐标异常',
            details: `第${i + 1}或${i + 2}点纬度超出范围(-90~90)`
          };
        }
      }
    }
  }

  return { isAnomaly: false };
}

export function detectDeviceListErrors(record: ExceptionRecord): AnomalyResult {
  const data = record.data || {};
  const { devices, deviceId, deviceName, status, quantity } = data;

  if (record.recordType !== RecordType.DEVICE_LIST) {
    return { isAnomaly: false };
  }

  if (devices && Array.isArray(devices)) {
    const ids = devices.map((d: any) => d.deviceId || d.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      return {
        isAnomaly: true,
        type: ExceptionType.DEVICE_LIST_ERROR,
        title: '设备清单存在重复ID',
        details: `清单中有${ids.length - uniqueIds.size}个重复设备ID`
      };
    }

    for (const device of devices) {
      if (!device.deviceId && !device.id) {
        return {
          isAnomaly: true,
          type: ExceptionType.DEVICE_LIST_ERROR,
          title: '设备ID缺失',
          details: `设备 ${device.deviceName || device.name || '未知'} 缺少唯一标识`
        };
      }
      if (!device.deviceName && !device.name) {
        return {
          isAnomaly: true,
          type: ExceptionType.DEVICE_LIST_ERROR,
          title: '设备名称缺失',
          details: `设备ID: ${device.deviceId || device.id} 缺少名称`
        };
      }
      if (device.quantity !== undefined && device.quantity < 0) {
        return {
          isAnomaly: true,
          type: ExceptionType.DEVICE_LIST_ERROR,
          title: '设备数量异常',
          details: `设备 ${device.deviceName || '未知'} 数量为负数: ${device.quantity}`
        };
      }
    }
  }

  if (deviceId !== undefined && !deviceId) {
    return {
      isAnomaly: true,
      type: ExceptionType.DEVICE_LIST_ERROR,
      title: '设备ID无效',
      details: '设备ID为空字符串'
    };
  }

  if (quantity !== undefined && quantity < 0) {
    return {
      isAnomaly: true,
      type: ExceptionType.DEVICE_LIST_ERROR,
      title: '设备数量异常',
      details: `设备数量为负数: ${quantity}`
    };
  }

  return { isAnomaly: false };
}

export function detectOfflineMissing(record: ExceptionRecord): AnomalyResult {
  const data = record.data || {};
  const { offlineAssets, assetPaths, textureFile, iconFile, hasOfflineDependency } = data;

  if (hasOfflineDependency === false) {
    return { isAnomaly: false };
  }

  if (offlineAssets && Array.isArray(offlineAssets)) {
    const missing = offlineAssets.filter((a: any) => a.exists === false || a.status === 'missing');
    if (missing.length > 0) {
      return {
        isAnomaly: true,
        type: ExceptionType.OFFLINE_MISSING,
        title: '离线素材缺失',
        details: `检测到${missing.length}个离线素材缺失: ${missing.map((m: any) => m.path || m.name).join(', ')}`
      };
    }
  }

  if (assetPaths && Array.isArray(assetPaths)) {
    const missing = assetPaths.filter((p: any) => typeof p === 'object' ? p.missing : false);
    if (missing.length > 0) {
      return {
        isAnomaly: true,
        type: ExceptionType.OFFLINE_MISSING,
        title: '素材路径不存在',
        details: `以下素材路径不存在: ${missing.map((m: any) => m.path || m).join(', ')}`
      };
    }
  }

  if (textureFile && textureFile.exists === false) {
    return {
      isAnomaly: true,
      type: ExceptionType.OFFLINE_MISSING,
      title: '纹理素材缺失',
      details: `地面纹理贴图文件不存在: ${textureFile.path || '未知路径'}`
    };
  }

  if (iconFile && iconFile.exists === false) {
    return {
      isAnomaly: true,
      type: ExceptionType.OFFLINE_MISSING,
      title: '设备图标缺失',
      details: `设备图标文件未找到: ${iconFile.path || '未知路径'}`
    };
  }

  if (record.offlineMissing) {
    return {
      isAnomaly: true,
      type: ExceptionType.OFFLINE_MISSING,
      title: '离线素材缺失',
      details: '记录标记为离线素材缺失'
    };
  }

  return { isAnomaly: false };
}

export function runAllAnomalyDetections(record: ExceptionRecord): AnomalyResult[] {
  return [
    detectScaleErrors(record),
    detectTrajectoryAnomalies(record),
    detectDeviceListErrors(record),
    detectOfflineMissing(record)
  ].filter(r => r.isAnomaly);
}

export function determineRecordStatus(record: ExceptionRecord): RecordStatus {
  if (record.offlineMissing) {
    return RecordStatus.OFFLINE_MISSING;
  }

  const anomalies = runAllAnomalyDetections(record);
  if (anomalies.length > 0) {
    const hasScaleOrDeviceError = anomalies.some(
      a => a.type === ExceptionType.SCALE_ERROR || a.type === ExceptionType.DEVICE_LIST_ERROR
    );
    if (hasScaleOrDeviceError) {
      return RecordStatus.ABNORMAL;
    }
    return RecordStatus.PENDING;
  }

  if (record.isDuplicate) {
    return RecordStatus.PROCESSING;
  }

  return RecordStatus.NORMAL;
}
