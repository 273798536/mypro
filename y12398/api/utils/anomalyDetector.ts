import type { Device, BorrowRecord, Anomaly, Evidence } from '../../shared/types';
import { generateId } from '../data/mockData';

export function detectOverdueReturns(devices: Device[], records: BorrowRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const now = new Date('2026-06-02T10:00:00Z');

  records.forEach(record => {
    if (record.status === 'borrowed' || record.status === 'overdue') {
      const expectedReturn = new Date(record.expectedReturnDate);
      if (now > expectedReturn) {
        const daysOverdue = Math.floor((now.getTime() - expectedReturn.getTime()) / (1000 * 60 * 60 * 24));

        const evidenceChain: Evidence[] = [
          {
            id: generateId('EVID'),
            type: 'borrow_record',
            title: '借出登记',
            content: `${record.borrower}于 ${formatDate(record.borrowDate)} 借出 ${record.deviceName}，原定归还日期 ${formatDate(record.expectedReturnDate)}`,
            timestamp: record.borrowDate,
            photoUrl: null
          }
        ];

        if (record.versions.length > 0) {
          record.versions.forEach(version => {
            if (version.field === 'expectedReturnDate') {
              evidenceChain.push({
                id: generateId('EVID'),
                type: 'return_record',
                title: '版本变更记录',
                content: `预期归还日期从 ${formatDate(version.oldValue)} 修改为 ${formatDate(version.newValue)}，原因：${version.reason}。原始超时记录已保留。`,
                timestamp: version.timestamp,
                photoUrl: null
              });
            }
          });
        }

        const device = devices.find(d => d.id === record.deviceId);
        if (device && device.notes.length > 0) {
          const latestNote = device.notes[device.notes.length - 1];
          if (latestNote.version > 1) {
            evidenceChain.push({
              id: generateId('EVID'),
              type: 'device_note',
              title: `设备备注（版本${latestNote.version}）`,
              content: latestNote.content,
              timestamp: latestNote.timestamp,
              photoUrl: null
            });
          }
        }

        const anomaly: Anomaly = {
          id: generateId('ANOM'),
          type: 'overdue_return',
          severity: daysOverdue >= 7 ? 'high' : 'medium',
          title: '设备归还超时',
          description: `${record.deviceName}已超过预定归还日期 ${daysOverdue} 天，原计划 ${formatDate(record.expectedReturnDate)} 归还。${record.versions.length > 0 ? '虽然预期归还日期已更新，但原始超时记录已保留作为证据。' : ''}`,
          deviceId: record.deviceId,
          recordIds: [record.id],
          evidenceChain,
          status: 'open',
          resolvedAt: null,
          resolutionNote: null,
          createdAt: now.toISOString()
        };

        anomalies.push(anomaly);
      }
    }
  });

  return anomalies;
}

export function detectDamageUnrecorded(devices: Device[], records: BorrowRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  records.forEach(record => {
    if (record.damageNote && !record.damageNote.includes('借出前已存在')) {
      const device = devices.find(d => d.id === record.deviceId);
      if (!device) return;

      const damageNoteInDevice = device.notes.some(note =>
        note.content.includes('损坏') && note.timestamp < record.borrowDate
      );

      if (!damageNoteInDevice) {
        const evidenceChain: Evidence[] = [
          {
            id: generateId('EVID'),
            type: 'device_note',
            title: '设备清单备注（借出前）',
            content: device.notes[0]?.content || '无初始备注',
            timestamp: device.notes[0]?.timestamp || device.createdAt,
            photoUrl: null
          },
          {
            id: generateId('EVID'),
            type: 'borrow_record',
            title: '借出登记',
            content: `${record.borrower}于 ${formatDate(record.borrowDate)} 借出 ${record.deviceName}`,
            timestamp: record.borrowDate,
            photoUrl: null
          }
        ];

        if (record.damagePhotoUrl) {
          evidenceChain.push({
            id: generateId('EVID'),
            type: 'damage_photo',
            title: '损坏照片',
            content: record.damageNote,
            timestamp: record.actualReturnDate || record.updatedAt,
            photoUrl: record.damagePhotoUrl
          });
        }

        const latestNote = device.notes[device.notes.length - 1];
        if (latestNote.content.includes('损坏')) {
          evidenceChain.push({
            id: generateId('EVID'),
            type: 'device_note',
            title: `设备备注（版本${latestNote.version}）- 损坏补充`,
            content: latestNote.content,
            timestamp: latestNote.timestamp,
            photoUrl: null
          });
        }

        if (record.actualReturnDate) {
          evidenceChain.push({
            id: generateId('EVID'),
            type: 'return_record',
            title: '归还记录',
            content: `${formatDate(record.actualReturnDate)}归还，报告损坏：${record.damageNote}`,
            timestamp: record.actualReturnDate,
            photoUrl: null
          });
        }

        const anomaly: Anomaly = {
          id: generateId('ANOM'),
          type: 'damage_unrecorded',
          severity: 'high',
          title: record.status === 'returned' ? '历史损坏未记' : '损坏未登记',
          description: `${record.deviceName}${record.status === 'returned' ? '在 ' + formatDate(record.actualReturnDate!) + ' 归还时' : ''}报告损坏（${record.damageNote}），但在借出前的设备清单中无此损坏记录。存在损坏未及时登记的风险。`,
          deviceId: record.deviceId,
          recordIds: [record.id],
          evidenceChain,
          status: 'open',
          resolvedAt: null,
          resolutionNote: null,
          createdAt: new Date().toISOString()
        };

        anomalies.push(anomaly);
      }
    }
  });

  return anomalies;
}

export function detectDuplicateBorrows(devices: Device[], records: BorrowRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const activeRecords = records.filter(r => r.status === 'borrowed' || r.status === 'overdue');

  const deviceRecordMap = new Map<string, BorrowRecord[]>();
  activeRecords.forEach(record => {
    const existing = deviceRecordMap.get(record.deviceId) || [];
    deviceRecordMap.set(record.deviceId, [...existing, record]);
  });

  deviceRecordMap.forEach((deviceRecords, deviceId) => {
    if (deviceRecords.length > 1) {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      const evidenceChain: Evidence[] = [];
      deviceRecords.forEach((record, index) => {
        evidenceChain.push({
          id: generateId('EVID'),
          type: 'borrow_record',
          title: `借出记录 ${index + 1}`,
          content: `${record.borrower}于 ${formatDate(record.borrowDate)} 借出，原定 ${formatDate(record.expectedReturnDate)} 归还`,
          timestamp: record.borrowDate,
          photoUrl: null
        });
      });

      const anomaly: Anomaly = {
        id: generateId('ANOM'),
        type: 'duplicate_borrow',
        severity: 'high',
        title: '重复借出',
        description: `${device.name}同时被 ${deviceRecords.map(r => r.borrower).join('、')} 借出，存在重复借出异常。`,
        deviceId,
        recordIds: deviceRecords.map(r => r.id),
        evidenceChain,
        status: 'open',
        resolvedAt: null,
        resolutionNote: null,
        createdAt: new Date().toISOString()
      };

      anomalies.push(anomaly);
    }
  });

  return anomalies;
}

export function detectAllAnomalies(devices: Device[], records: BorrowRecord[]): Anomaly[] {
  const overdue = detectOverdueReturns(devices, records);
  const damageUnrecorded = detectDamageUnrecorded(devices, records);
  const duplicates = detectDuplicateBorrows(devices, records);

  return [...overdue, ...damageUnrecorded, ...duplicates];
}

export function generateConclusions(devices: Device[], records: BorrowRecord[], anomalies: Anomaly[]): string[] {
  const conclusions: string[] = [];
  const now = new Date('2026-06-02');

  const totalDevices = devices.length;
  const inStock = devices.filter(d => d.status === 'in_stock').length;
  const borrowed = devices.filter(d => d.status === 'borrowed').length;
  const damaged = devices.filter(d => d.status === 'damaged').length;
  const anomalyDevices = devices.filter(d => d.status === 'anomaly').length;
  const openAnomalies = anomalies.filter(a => a.status === 'open').length;
  const overdueCount = anomalies.filter(a => a.type === 'overdue_return' && a.status === 'open').length;
  const damageUnrecordedCount = anomalies.filter(a => a.type === 'damage_unrecorded' && a.status === 'open').length;

  conclusions.push(`【借还状态汇总】截至 ${formatDate(now.toISOString())}，设备总数 ${totalDevices} 台：在库 ${inStock} 台、借出中 ${borrowed} 台、损坏待修 ${damaged} 台、异常状态 ${anomalyDevices} 台。`);

  if (overdueCount > 0) {
    conclusions.push(`【归还超时提醒】共有 ${overdueCount} 台设备已超过预定归还日期，请及时联系借用人催还。被新版本覆盖的超时记录已完整保留，可在异常详情中查看。`);
  }

  if (damageUnrecordedCount > 0) {
    conclusions.push(`【损坏未记风险】检测到 ${damageUnrecordedCount} 项损坏未登记异常。设备清单与借还记录结论不一致时，损坏备注已作为补充证据保留在详情中。`);
  }

  if (openAnomalies > 0) {
    conclusions.push(`【待处理异常】当前共有 ${openAnomalies} 项未处理异常，请前往异常检测中心查看证据链并处理。`);
  }

  const borrowedRecords = records.filter(r => r.status === 'borrowed' || r.status === 'overdue');
  const hasVersionOverrides = borrowedRecords.some(r => r.versions.length > 0);
  if (hasVersionOverrides) {
    conclusions.push(`【版本追溯提示】检测到 ${borrowedRecords.filter(r => r.versions.length > 0).length} 条借还记录存在版本变更。排练日程更新导致的归还时间修改已完整保留历史记录，不会覆盖原始超时证据。`);
  }

  if (openAnomalies === 0) {
    conclusions.push(`【状态良好】当前无待处理异常，所有设备借还状态正常。`);
  }

  return conclusions;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
