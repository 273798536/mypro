import { useState, useCallback, useEffect, useMemo } from 'react';
import { Device, CoordRecord, ConflictRecord, Batch, Status, ValidationError } from './types';

export interface BatchData {
  batch: Batch;
  devices: Device[];
  coordRecords: CoordRecord[];
  conflicts: ConflictRecord[];
  resolvedCount: number;
  pendingCount: number;
  failedCount: number;
}

export function useAppState() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [coordRecords, setCoordRecords] = useState<CoordRecord[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<'命中检测' | '图层管理'>('命中检测');

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const computeBatchStatus = (batchConflicts: ConflictRecord[]): Status => {
    if (batchConflicts.length === 0) return '通过';
    if (batchConflicts.every(c => c.status === '通过')) return '通过';
    if (batchConflicts.some(c => c.status === '失败')) return '失败';
    return '待确认';
  };

  const getBatchData = useCallback((batchId: string): BatchData | null => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return null;

    const batchCoords = coordRecords.filter(c => c.batchId === batchId);
    const batchDevices = devices.filter(d =>
      batchCoords.some(c => c.deviceId === d.id)
    );
    const batchConflicts = conflicts.filter(c => c.batchId === batchId);
    const resolvedCount = batchConflicts.filter(c => c.status === '通过').length;
    const pendingCount = batchConflicts.filter(c => c.status === '待确认').length;
    const failedCount = batchConflicts.filter(c => c.status === '失败').length;

    const currentStatus = computeBatchStatus(batchConflicts);

    return {
      batch: { ...batch, status: currentStatus, conflictCount: batchConflicts.length },
      devices: batchDevices,
      coordRecords: batchCoords,
      conflicts: batchConflicts,
      resolvedCount,
      pendingCount,
      failedCount
    };
  }, [batches, devices, coordRecords, conflicts]);

  const currentBatchData = useMemo(() => {
    if (!currentBatchId) return null;
    return getBatchData(currentBatchId);
  }, [currentBatchId, getBatchData]);

  const validateImport = useCallback((data: any): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!data) {
      errors.push({
        field: '导入数据',
        message: '导入数据为空',
        suggestion: '请粘贴完整的JSON数据，包含batchName、devices和coords字段'
      });
      return errors;
    }

    if (typeof data !== 'object') {
      errors.push({
        field: '数据格式',
        message: '数据格式不正确，需要JSON对象',
        suggestion: '请检查JSON格式，最外层应为 {} 对象，而非数组或字符串'
      });
      return errors;
    }

    if (!data.batchName || typeof data.batchName !== 'string' || data.batchName.trim() === '') {
      errors.push({
        field: '批次名称',
        message: '缺少有效的批次名称',
        suggestion: '请填写batchName字段，例如"上午康复课A班"'
      });
    }

    if (!Array.isArray(data.devices) || data.devices.length === 0) {
      errors.push({
        field: '设备清单',
        message: '设备清单为空或格式错误',
        suggestion: '请在devices数组中至少填写一台设备，每台设备需包含id、name、type、location字段'
      });
    } else {
      data.devices.forEach((d: any, idx: number) => {
        if (!d.name || typeof d.name !== 'string') {
          errors.push({
            field: `设备清单[${idx}]`,
            message: `第${idx + 1}台设备缺少name字段`,
            suggestion: '请为每台设备填写name字段，例如"站立架1"'
          });
        }
        if (!d.type || typeof d.type !== 'string') {
          errors.push({
            field: `设备清单[${idx}]`,
            message: `第${idx + 1}台设备缺少type字段`,
            suggestion: '请为每台设备填写type字段，例如"康复设备"或"移动设备"'
          });
        }
        if (!d.location || typeof d.location !== 'string') {
          errors.push({
            field: `设备清单[${idx}]`,
            message: `第${idx + 1}台设备缺少location字段`,
            suggestion: '请为每台设备填写location字段，例如"A区1号"'
          });
        }
      });
    }

    if (!Array.isArray(data.coords) || data.coords.length === 0) {
      errors.push({
        field: '坐标数据',
        message: '缺少坐标数据或格式错误',
        suggestion: '请在coords数组中填写坐标记录，每条记录需包含deviceName、x、y、source字段'
      });
    } else {
      const deviceNames = Array.isArray(data.devices) ? data.devices.map((d: any) => d.name) : [];
      data.coords.forEach((c: any, idx: number) => {
        if (!c.deviceName || typeof c.deviceName !== 'string') {
          errors.push({
            field: `坐标数据[${idx}]`,
            message: `第${idx + 1}条坐标缺少deviceName字段`,
            suggestion: '请填写deviceName字段，值需与设备清单中某台设备的name一致'
          });
        } else if (deviceNames.length > 0 && !deviceNames.includes(c.deviceName)) {
          errors.push({
            field: `坐标数据[${idx}]`,
            message: `坐标的deviceName"${c.deviceName}"在设备清单中不存在`,
            suggestion: `请检查设备名称是否正确，当前设备清单包含: ${deviceNames.join('、')}`
          });
        }
        if (typeof c.x !== 'number' || isNaN(c.x)) {
          errors.push({
            field: `坐标数据[${idx}]`,
            message: `第${idx + 1}条坐标的x值无效`,
            suggestion: '请确保x字段为有效数字，例如200'
          });
        }
        if (typeof c.y !== 'number' || isNaN(c.y)) {
          errors.push({
            field: `坐标数据[${idx}]`,
            message: `第${idx + 1}条坐标的y值无效`,
            suggestion: '请确保y字段为有效数字，例如300'
          });
        }
        if (c.source !== '底图坐标' && c.source !== '轨迹记录') {
          errors.push({
            field: `坐标数据[${idx}]`,
            message: `第${idx + 1}条坐标的source值"${c.source}"无效`,
            suggestion: 'source字段只能是"底图坐标"或"轨迹记录"'
          });
        }
      });

      if (data.coords.length > 0) {
        const hasBase = data.coords.some((c: any) => c.source === '底图坐标');
        const hasTrack = data.coords.some((c: any) => c.source === '轨迹记录');
        if (!hasBase) {
          errors.push({
            field: '坐标数据',
            message: '缺少底图坐标数据',
            suggestion: '请至少导入一条source为"底图坐标"的记录用于基准比对'
          });
        }
        if (!hasTrack) {
          errors.push({
            field: '坐标数据',
            message: '缺少轨迹记录数据',
            suggestion: '请至少导入一条source为"轨迹记录"的记录用于冲突检测'
          });
        }
      }
    }

    return errors;
  }, []);

  const detectConflicts = (devices: Device[], coords: CoordRecord[], batchId: string, existingConflicts: ConflictRecord[] = []): ConflictRecord[] => {
    const conflicts: ConflictRecord[] = [];
    const deviceCoords = new Map<string, CoordRecord[]>();

    coords.forEach(coord => {
      if (!deviceCoords.has(coord.deviceId)) {
        deviceCoords.set(coord.deviceId, []);
      }
      deviceCoords.get(coord.deviceId)!.push(coord);
    });

    deviceCoords.forEach((coordList, deviceId) => {
      if (coordList.length > 1) {
        const baseCoords = coordList.filter(c => c.source === '底图坐标');
        const trackCoords = coordList.filter(c => c.source === '轨迹记录');
        if (baseCoords.length > 0 && trackCoords.length > 0) {
          const device = devices.find(d => d.id === deviceId);
          if (device) {
            const existingConflict = existingConflicts.find(ec =>
              ec.deviceId === deviceId && ec.batchId === batchId
            );

            conflicts.push({
              id: existingConflict?.id || generateId(),
              deviceId,
              deviceName: device.name,
              coordId1: baseCoords[0].id,
              coordId2: trackCoords[0].id,
              reason: '底图坐标与轨迹记录位置不一致',
              status: existingConflict?.status || '待确认',
              notes: existingConflict?.notes,
              batchId
            });
          }
        }
      }
    });

    return conflicts;
  };

  const importBatch = useCallback((importData: any) => {
    const validationErrors = validateImport(importData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return false;
    }

    const timestamp = Date.now();
    const existingBatch = batches.find(b => b.name === importData.batchName);
    const batchId = existingBatch ? existingBatch.id : generateId();

    const existingConflicts = existingBatch
      ? conflicts.filter(c => c.batchId === existingBatch.id)
      : [];

    const newDevices: Device[] = importData.devices.map((d: any) => ({
      id: `${batchId}-${d.id || d.name}`,
      name: d.name,
      type: d.type,
      location: d.location,
      status: '通过' as Status
    }));

    const newCoords: CoordRecord[] = importData.coords.map((c: any) => ({
      id: generateId(),
      batchId,
      deviceId: newDevices.find(d => d.name === c.deviceName)?.id || '',
      x: c.x,
      y: c.y,
      timestamp,
      source: c.source
    }));

    const newConflicts: ConflictRecord[] = detectConflicts(newDevices, newCoords, batchId, existingConflicts);
    const batchStatus: Status = computeBatchStatus(newConflicts);

    const newBatch: Batch = {
      id: batchId,
      name: importData.batchName,
      timestamp,
      status: batchStatus,
      deviceCount: newDevices.length,
      conflictCount: newConflicts.length
    };

    if (existingBatch) {
      setDevices(prev => {
        const filtered = prev.filter(d => !d.id.startsWith(batchId + '-'));
        return [...filtered, ...newDevices];
      });
      setCoordRecords(prev => {
        const filtered = prev.filter(c => c.batchId !== batchId);
        return [...filtered, ...newCoords];
      });
      setConflicts(prev => {
        const filtered = prev.filter(c => c.batchId !== batchId);
        return [...filtered, ...newConflicts];
      });
      setBatches(prev => prev.map(b => b.id === batchId ? newBatch : b));
    } else {
      setDevices(prev => [...prev, ...newDevices]);
      setCoordRecords(prev => [...prev, ...newCoords]);
      setConflicts(prev => [...prev, ...newConflicts]);
      setBatches(prev => [...prev, newBatch]);
    }

    setCurrentBatchId(batchId);
    setErrors([]);
    return true;
  }, [batches, conflicts, validateImport]);

  const updateConflictStatus = useCallback((conflictId: string, status: Status, notes?: string) => {
    setConflicts(prev => prev.map(c =>
      c.id === conflictId ? { ...c, status, notes } : c
    ));

    setConflicts(prevConflicts => {
      const updatedConflict = prevConflicts.find(c => c.id === conflictId);
      if (updatedConflict) {
        const batchConflicts = prevConflicts.filter(c => c.batchId === updatedConflict.batchId);
        const newStatus = computeBatchStatus(batchConflicts);
        setBatches(prevBatches => prevBatches.map(b =>
          b.id === updatedConflict.batchId
            ? { ...b, status: newStatus, conflictCount: batchConflicts.length }
            : b
        ));
      }
      return prevConflicts;
    });
  }, []);

  const exportBatch = useCallback((batchId: string) => {
    return getBatchData(batchId);
  }, [getBatchData]);

  const downloadReport = useCallback((batchId: string) => {
    const data = getBatchData(batchId);
    if (!data) return;

    const content = `班级座次冲突调整报告 - ${data.batch.name}
生成时间: ${new Date(data.batch.timestamp).toLocaleString()}
整体状态: ${data.batch.status}
设备数量: ${data.batch.deviceCount}
冲突总数: ${data.batch.conflictCount}
已解决: ${data.resolvedCount}
待确认: ${data.pendingCount}
失败: ${data.failedCount}

--- 设备清单 ---
${data.devices.map(d => `${d.name} (${d.type}) - ${d.location}`).join('\n')}

--- 冲突明细 ---
${data.conflicts.length > 0
  ? data.conflicts.map(c => {
      const coords = data.coordRecords.filter(cr => cr.deviceId === c.deviceId);
      const baseCoord = coords.find(cr => cr.source === '底图坐标');
      const trackCoord = coords.find(cr => cr.source === '轨迹记录');
      const coordInfo = baseCoord && trackCoord
        ? ` [底图:(${baseCoord.x},${baseCoord.y}) vs 轨迹:(${trackCoord.x},${trackCoord.y})]`
        : '';
      return `${c.deviceName}: ${c.reason}${coordInfo} - 状态: ${c.status}${c.notes ? ` - 备注: ${c.notes}` : ''}`;
    }).join('\n')
  : '无冲突'}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `座次冲突调整_${data.batch.name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getBatchData]);

  const parseAndImport = useCallback((rawInput: string): ValidationError[] | null => {
    if (!rawInput || rawInput.trim() === '') {
      return [{
        field: '输入内容',
        message: '输入为空',
        suggestion: '请粘贴JSON格式的导入数据'
      }];
    }

    let parsed;
    try {
      parsed = JSON.parse(rawInput);
    } catch (e: any) {
      const errorMsg = e.message || '未知解析错误';
      let suggestion = '请检查JSON语法，确保使用双引号、逗号正确、括号匹配。';

      if (errorMsg.includes('Unexpected token')) {
        const match = errorMsg.match(/position (\d+)/);
        if (match) {
          const pos = parseInt(match[1]);
          const lines = rawInput.substring(0, pos).split('\n');
          const lineNum = lines.length;
          const colNum = lines[lines.length - 1].length + 1;
          suggestion = `在第${lineNum}行第${colNum}列附近存在语法错误，请检查该处的引号、逗号或括号。`;
        }
      } else if (errorMsg.includes('Unexpected end of JSON')) {
        suggestion = 'JSON数据不完整，请检查是否缺少右括号或右引号。';
      }

      return [{
        field: 'JSON解析',
        message: errorMsg,
        suggestion
      }];
    }

    const validationErrors = validateImport(parsed);
    if (validationErrors.length > 0) {
      return validationErrors;
    }

    const success = importBatch(parsed);
    if (success) {
      return null;
    }
    return null;
  }, [validateImport, importBatch]);

  useEffect(() => {
    const mockBatches: Batch[] = [
      { id: 'b1', name: '上午康复课A班', timestamp: Date.now() - 86400000, status: '通过', deviceCount: 12, conflictCount: 0 },
      { id: 'b2', name: '上午康复课B班', timestamp: Date.now() - 3600000, status: '待确认', deviceCount: 15, conflictCount: 3 }
    ];

    const mockDevices: Device[] = [
      { id: 'b1-stand1', name: '站立架1', type: '康复设备', location: 'A区1号', status: '通过' },
      { id: 'b1-stand2', name: '站立架2', type: '康复设备', location: 'A区2号', status: '通过' },
      { id: 'b2-balance', name: '平衡板', type: '康复设备', location: 'B区1号', status: '待确认' },
      { id: 'b2-wheel1', name: '轮椅1', type: '移动设备', location: 'B区2号', status: '待确认' },
      { id: 'b2-walker', name: '助行器', type: '辅助设备', location: 'B区3号', status: '待确认' }
    ];

    const mockCoords: CoordRecord[] = [
      { id: 'c1', batchId: 'b2', deviceId: 'b2-balance', x: 100, y: 150, timestamp: Date.now() - 3600000, source: '底图坐标' },
      { id: 'c2', batchId: 'b2', deviceId: 'b2-balance', x: 120, y: 160, timestamp: Date.now() - 3590000, source: '轨迹记录' },
      { id: 'c3', batchId: 'b2', deviceId: 'b2-wheel1', x: 200, y: 300, timestamp: Date.now() - 3600000, source: '底图坐标' },
      { id: 'c4', batchId: 'b2', deviceId: 'b2-wheel1', x: 210, y: 305, timestamp: Date.now() - 3590000, source: '轨迹记录' },
      { id: 'c5', batchId: 'b2', deviceId: 'b2-walker', x: 250, y: 350, timestamp: Date.now() - 3600000, source: '底图坐标' },
      { id: 'c6', batchId: 'b2', deviceId: 'b2-walker', x: 260, y: 360, timestamp: Date.now() - 3590000, source: '轨迹记录' }
    ];

    const mockConflicts: ConflictRecord[] = [
      { id: 'cf1', deviceId: 'b2-balance', deviceName: '平衡板', coordId1: 'c1', coordId2: 'c2', reason: '底图坐标与轨迹记录位置不一致', status: '待确认', batchId: 'b2' },
      { id: 'cf2', deviceId: 'b2-wheel1', deviceName: '轮椅1', coordId1: 'c3', coordId2: 'c4', reason: '底图坐标与轨迹记录位置不一致', status: '待确认', batchId: 'b2' },
      { id: 'cf3', deviceId: 'b2-walker', deviceName: '助行器', coordId1: 'c5', coordId2: 'c6', reason: '底图坐标与轨迹记录位置不一致', status: '待确认', batchId: 'b2' }
    ];

    setBatches(mockBatches);
    setDevices(mockDevices);
    setCoordRecords(mockCoords);
    setConflicts(mockConflicts);
  }, []);

  return {
    devices,
    coordRecords,
    conflicts,
    batches,
    currentBatchData,
    currentBatchId,
    errors,
    activeTab,
    setActiveTab,
    setCurrentBatchId,
    setErrors,
    importBatch,
    parseAndImport,
    updateConflictStatus,
    exportBatch,
    downloadReport,
    getBatchData
  };
}
