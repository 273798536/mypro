import type { BuildingModel, MeterData, MergeDiff } from '../types';

export const detectDifferences = (building: BuildingModel, meter: MeterData): MergeDiff[] => {
  const diffs: MergeDiff[] = [];
  const floorIdsInModel = new Set(building.floors.map(f => f.id));
  const floorIdsInMeter = new Set(meter.floorMeters.map(fm => fm.floorId));

  for (const floor of building.floors) {
    if (!floorIdsInMeter.has(floor.id)) {
      diffs.push({
        type: 'meter_missing',
        floorId: floor.id,
        floorName: floor.name,
        message: `${floor.name}在楼栋模型中存在，但电表数据中缺少该楼层的能耗记录`,
        suggestion: '请联系电表数据管理员补录该楼层数据，或确认该楼层是否已停用',
      });
    } else {
      const meterFloor = meter.floorMeters.find(fm => fm.floorId === floor.id);
      if (meterFloor) {
        const deviceIdsInModel = new Set(floor.devices.map(d => d.id));
        const deviceIdsInMeter = new Set(meterFloor.devices.map(d => d.deviceId));
        const deviceNamesInModel = floor.devices.map(d => d.name);
        const duplicateNames = deviceNamesInModel.filter(
          (name, index) => deviceNamesInModel.indexOf(name) !== index
        );

        for (const dupName of [...new Set(duplicateNames)]) {
          const dupDevices = floor.devices.filter(d => d.name === dupName);
          diffs.push({
            type: 'device_duplicate',
            floorId: floor.id,
            floorName: floor.name,
            deviceName: dupName,
            oldValue: dupDevices.map(d => d.id),
            message: `${floor.name}存在同名设备"${dupName}"，共${dupDevices.length}台`,
            suggestion: '请核实设备名称是否正确，建议为每台设备分配唯一标识名称',
          });
        }

        for (const device of floor.devices) {
          if (!deviceIdsInMeter.has(device.id)) {
            diffs.push({
              type: 'device_added',
              floorId: floor.id,
              floorName: floor.name,
              deviceId: device.id,
              deviceName: device.name,
              newValue: device,
              message: `${floor.name}的"${device.name}"是模型中的新增设备，电表数据中无对应记录`,
              suggestion: '请确认该设备是否已接入电表系统，如已接入请更新电表数据',
            });
          }
        }

        for (const deviceMeter of meterFloor.devices) {
          if (!deviceIdsInModel.has(deviceMeter.deviceId)) {
            diffs.push({
              type: 'device_removed',
              floorId: floor.id,
              floorName: floor.name,
              deviceId: deviceMeter.deviceId,
              deviceName: deviceMeter.deviceName,
              oldValue: deviceMeter,
              message: `${floor.name}的"${deviceMeter.deviceName}"在电表数据中有记录，但楼栋模型中已不存在`,
              suggestion: '请确认该设备是否已拆除，如已拆除请从电表统计中移除',
            });
          }
        }
      }
    }
  }

  for (const meterFloor of meter.floorMeters) {
    if (!floorIdsInModel.has(meterFloor.floorId)) {
      diffs.push({
        type: 'floor_removed',
        floorId: meterFloor.floorId,
        floorName: meterFloor.floorName,
        oldValue: meterFloor,
        message: `${meterFloor.floorName}在电表数据中有记录，但楼栋模型中不存在该楼层`,
        suggestion: '请核实是否为模型更新遗漏，或该楼层数据属于其他楼栋',
      });
    }
  }

  return diffs;
};

export const getDiffTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    floor_added: '新增楼层',
    floor_removed: '楼层缺失',
    floor_modified: '楼层修改',
    device_added: '新增设备',
    device_removed: '设备缺失',
    device_duplicate: '设备重名',
    meter_missing: '电表缺口',
  };
  return labels[type] || type;
};

export const getDiffTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    floor_added: 'bg-green-500',
    floor_removed: 'bg-red-500',
    floor_modified: 'bg-yellow-500',
    device_added: 'bg-blue-500',
    device_removed: 'bg-orange-500',
    device_duplicate: 'bg-purple-500',
    meter_missing: 'bg-rose-500',
  };
  return colors[type] || 'bg-gray-500';
};
