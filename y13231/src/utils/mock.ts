import type { ConflictRecord, ContractScan, NoteChange, HistoryVersion } from '@/types';
import { generateId } from './history';

function createMockContractScan(conflictId: string, version: number, daysAgo: number): ContractScan {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  return {
    id: generateId(),
    conflictId,
    fileName: `合同_${conflictId}_v${version}.pdf`,
    fileData: `data:application/pdf;base64,JVBERi0xLjMKJcfsj6IKNSAwIG9iago8PC9MZW5ndGggNiAwIFIvRmlsdGVyIC9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nGNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkYBEgAABAAB`,
    remark: version === 1 ? '初始版本合同扫描件' : `合同修订版 v${version} - 补充备注：需要确认时码偏移`,
    version,
    createdAt: date.toISOString(),
  };
}

function createMockNoteChange(conflictId: string, oldNote: string, newNote: string, daysAgo: number): NoteChange {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  return {
    id: generateId(),
    conflictId,
    oldNote,
    newNote,
    operator: daysAgo > 3 ? '阿蓝' : '排班同事',
    createdAt: date.toISOString(),
  };
}

function createMockHistoryVersion(
  conflictId: string,
  version: number,
  changeType: HistoryVersion['changeType'],
  snapshot: Partial<ConflictRecord>,
  daysAgo: number
): HistoryVersion {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  
  const descriptions: Record<HistoryVersion['changeType'], string> = {
    create: '创建记录',
    update: '更新信息',
    status_change: `状态变更: ${snapshot.status === 'pending' ? '待处理' : snapshot.status === 'processing' ? '处理中' : snapshot.status === 'resolved' ? '已解决' : '已关闭'}`,
    note_change: `备注修改: "${snapshot.currentNote?.substring(0, 20)}..."`,
    scan_add: `添加合同扫描件: 合同_${conflictId}_v${version}.pdf`,
    timecode_toggle: `时码标记变更: ${snapshot.isTimecodeOffset ? '标记为' : '取消'}时码偏半拍`,
  };
  
  return {
    id: generateId(),
    conflictId,
    version,
    snapshot,
    changeType,
    operator: daysAgo > 3 ? '阿蓝' : '排班同事',
    changeDescription: descriptions[changeType],
    createdAt: date.toISOString(),
  };
}

export function generateMockData(): ConflictRecord[] {
  const mockTracks = [
    { trackName: '序曲《星空》', fileName: 'sampling_pkg_opening_starfield.zip', status: 'pending' as const, isTimecodeOffset: true, note: '时码偏半拍，需要与编曲确认偏移量', scanCount: 2, noteChanges: 2 },
    { trackName: '第一章《潮汐》', fileName: 'sampling_pkg_ch1_tide.zip', status: 'processing' as const, isTimecodeOffset: false, note: '合同扫描件已收到，正在核对曲目表', scanCount: 1, noteChanges: 1 },
    { trackName: '第二章《燃烧》', fileName: 'sampling_pkg_ch2_burn.zip', status: 'pending' as const, isTimecodeOffset: true, note: '时码偏半拍，彩排前需要重新对齐', scanCount: 3, noteChanges: 3 },
    { trackName: '第三章《回响》', fileName: 'sampling_pkg_ch3_echo.zip', status: 'resolved' as const, isTimecodeOffset: false, note: '已解决，重新导出采样包', scanCount: 2, noteChanges: 2 },
    { trackName: '第四章《重生》', fileName: 'sampling_pkg_ch4_rebirth.zip', status: 'pending' as const, isTimecodeOffset: true, note: '时码偏半拍，合同备注有手写修改', scanCount: 1, noteChanges: 1 },
    { trackName: '终章《永恒》', fileName: 'sampling_pkg_finale_eternal.zip', status: 'closed' as const, isTimecodeOffset: false, note: '已确认无误，无需修改', scanCount: 2, noteChanges: 1 },
    { trackName: '安可曲《光年》', fileName: 'sampling_pkg_encore_lightyear.zip', status: 'processing' as const, isTimecodeOffset: true, note: '时码偏半拍，待导演确认', scanCount: 1, noteChanges: 2 },
    { trackName: '过渡曲1', fileName: 'sampling_pkg_transition_01.zip', status: 'pending' as const, isTimecodeOffset: false, note: '文件名与曲目表不符，需要确认', scanCount: 0, noteChanges: 0 },
  ];

  const records: ConflictRecord[] = [];
  
  mockTracks.forEach((track, index) => {
    const id = `REC${String(index + 1).padStart(4, '0')}`;
    const now = new Date();
    const createdAt = new Date(now.getTime() - (index + 5) * 24 * 60 * 60 * 1000);
    const updatedAt = new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000);
    
    const contractScans: ContractScan[] = [];
    for (let v = 1; v <= track.scanCount; v++) {
      contractScans.push(createMockContractScan(id, v, (index + v) * 2));
    }
    
    const noteChanges: NoteChange[] = [];
    let oldNote = '';
    for (let n = 1; n <= track.noteChanges; n++) {
      const newNote = n === 1 ? '初始记录：发现文件名与曲目表不一致' : 
                      n === 2 ? '更新：已核对合同扫描件，发现备注补充说明' :
                      '最新：等待彩排确认';
      noteChanges.push(createMockNoteChange(id, oldNote, newNote, (index + n) * 3));
      oldNote = newNote;
    }
    
    const historyVersions: HistoryVersion[] = [];
    let version = 1;
    
    historyVersions.push(createMockHistoryVersion(
      id, version++, 'create',
      { trackName: track.trackName, fileName: track.fileName },
      index + 10
    ));
    
    if (track.isTimecodeOffset) {
      historyVersions.push(createMockHistoryVersion(
        id, version++, 'timecode_toggle',
        { isTimecodeOffset: true },
        index + 8
      ));
    }
    
    for (let v = 1; v <= track.scanCount; v++) {
      historyVersions.push(createMockHistoryVersion(
        id, version++, 'scan_add',
        { contractScans: contractScans.slice(0, v) },
        (index + v) * 2
      ));
    }
    
    if (track.noteChanges > 0) {
      historyVersions.push(createMockHistoryVersion(
        id, version++, 'note_change',
        { currentNote: track.note },
        index + 2
      ));
    }
    
    if (track.status !== 'pending') {
      historyVersions.push(createMockHistoryVersion(
        id, version++, 'status_change',
        { status: track.status },
        index + 1
      ));
    }
    
    records.push({
      id,
      trackName: track.trackName,
      fileName: track.fileName,
      status: track.status,
      isTimecodeOffset: track.isTimecodeOffset,
      currentNote: track.note,
      contractScans,
      historyVersions,
      noteChanges,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
  });
  
  return records;
}
