import { v4 as uuidv4 } from 'uuid';
import type { ChorusAlertRecord, HistoryAction } from '../types';
import {
  VoicePart,
  AlertLevel,
  RecordStatus,
  VersionSource,
} from '../types';

function makePlaceholderSvg(text: string, bg: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280">
      <rect width="400" height="280" fill="${bg}"/>
      <rect x="10" y="10" width="380" height="260" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6"/>
      <text x="200" y="130" text-anchor="middle" fill="#fff" font-family="Arial" font-size="20" font-weight="bold">排练群截图</text>
      <text x="200" y="170" text-anchor="middle" fill="#fff" font-family="Arial" font-size="16">${text}</text>
      <text x="200" y="210" text-anchor="middle" fill="#fff" font-family="Arial" font-size="12">[模拟数据占位图]</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const mockRecords: ChorusAlertRecord[] = [
  {
    id: uuidv4(),
    title: '女高声部音准偏差-林小雨',
    studentName: '林小雨',
    voicePart: VoicePart.SOPRANO,
    alertLevel: AlertLevel.WARNING,
    status: RecordStatus.REVIEWED,
    rehearsalDate: '2026-06-10',
    detectedIssue: '高音区C5-D5段落音准偏低约15音分，合唱团整体融合度受影响。',
    improvementNote: '本周加强气息支撑练习，已与家长沟通每日在家练声15分钟。',
    screenshots: [
      {
        id: uuidv4(),
        fileName: 'rehearsal_0610_soprano_1.png',
        dataUrl: makePlaceholderSvg('林小雨 - 06/10 排练', '#3B82F6'),
        uploadedAt: '2026-06-10T20:15:00Z',
        isLate: false,
      },
    ],
    manualNotes: [
      {
        id: uuidv4(),
        content: '阿蓝备注：对比上周同曲目，高音稳定性有进步，下周继续观察。',
        author: '阿蓝',
        createdAt: '2026-06-11T09:30:00Z',
        updatedAt: '2026-06-11T09:30:00Z',
      },
    ],
    operatorOverride: {
      overrideLevel: AlertLevel.WARNING,
      overrideNote: '阿蓝临时调整：原系统判定为critical，结合近期进步改判warning。',
      operator: '阿蓝',
      timestamp: '2026-06-11T09:35:00Z',
    },
    createdAt: '2026-06-10T19:00:00Z',
    updatedAt: '2026-06-11T09:35:00Z',
  },
  {
    id: uuidv4(),
    title: '男低声部进拍延迟-周大海',
    studentName: '周大海',
    voicePart: VoicePart.BASS,
    alertLevel: AlertLevel.CRITICAL,
    status: RecordStatus.PENDING,
    rehearsalDate: '2026-06-12',
    detectedIssue: '副歌开头进拍 consistently 延迟0.3秒，影响整体节奏感。',
    improvementNote: '建议单独录制节拍训练音频，每日跟拍练习。',
    screenshots: [
      {
        id: uuidv4(),
        fileName: 'rehearsal_0612_bass_main.png',
        dataUrl: makePlaceholderSvg('周大海 - 06/12 主截图', '#EF4444'),
        uploadedAt: '2026-06-12T21:00:00Z',
        isLate: false,
      },
      {
        id: uuidv4(),
        fileName: 'rehearsal_0612_bass_extra_late.png',
        dataUrl: makePlaceholderSvg('周大海 - 06/12 补传截图', '#F59E0B'),
        uploadedAt: '2026-06-13T08:45:00Z',
        isLate: true,
        note: '家长晚到补传，包含学生在家练习的补充视频截图。',
      },
    ],
    manualNotes: [],
    createdAt: '2026-06-12T20:30:00Z',
    updatedAt: '2026-06-13T08:45:00Z',
  },
  {
    id: uuidv4(),
    title: '女低音声部音量不足-陈美琪',
    studentName: '陈美琪',
    voicePart: VoicePart.ALTO,
    alertLevel: AlertLevel.WARNING,
    status: RecordStatus.PENDING,
    rehearsalDate: '2026-06-11',
    detectedIssue: '中声区音量偏弱，与女高声部平衡比例约为1:2.8，建议提升到1:1.8。',
    screenshots: [
      {
        id: uuidv4(),
        fileName: 'alto_0611_old_master.wav_screenshot.png',
        dataUrl: makePlaceholderSvg('陈美琪 - [旧版母带]', '#7C3AED'),
        uploadedAt: '2026-06-11T18:00:00Z',
        isLate: false,
      },
    ],
    versionInfo: {
      versionId: uuidv4(),
      source: VersionSource.OLD_MASTER,
      detectedAt: '2026-06-11T18:05:00Z',
      fileHash: 'a1b2c3d4e5f6_old_master_v2',
      originalFileName: 'alto_0611_old_master.wav_screenshot.png',
      suggestion: '检测到该文件为2026-05-20版本母带混入，建议使用06-11最新排练录音替换。当前仅展示，不覆盖新版本记录。',
      shouldOverride: false,
    },
    manualNotes: [
      {
        id: uuidv4(),
        content: '阿蓝备注：已通知家长重新上传今日录音，旧版仅供参考。',
        author: '阿蓝',
        createdAt: '2026-06-11T18:10:00Z',
        updatedAt: '2026-06-11T18:10:00Z',
      },
    ],
    createdAt: '2026-06-11T17:55:00Z',
    updatedAt: '2026-06-11T18:10:00Z',
  },
  {
    id: uuidv4(),
    title: '男高声部表现稳定-王浩然',
    studentName: '王浩然',
    voicePart: VoicePart.TENOR,
    alertLevel: AlertLevel.NORMAL,
    status: RecordStatus.RESOLVED,
    rehearsalDate: '2026-06-09',
    detectedIssue: '本周表现正常，音准、节奏、音量均在合理范围。',
    improvementNote: '可尝试挑战更高难度曲目片段。',
    screenshots: [
      {
        id: uuidv4(),
        fileName: 'tenor_0609_normal.png',
        dataUrl: makePlaceholderSvg('王浩然 - 06/09 正常', '#10B981'),
        uploadedAt: '2026-06-09T19:30:00Z',
        isLate: false,
      },
    ],
    manualNotes: [
      {
        id: uuidv4(),
        content: '进步明显，上周还存在进拍抢拍问题，本周已完全纠正。',
        author: '阿蓝',
        createdAt: '2026-06-10T10:00:00Z',
        updatedAt: '2026-06-10T10:00:00Z',
      },
    ],
    createdAt: '2026-06-09T19:00:00Z',
    updatedAt: '2026-06-10T10:00:00Z',
  },
  {
    id: uuidv4(),
    title: '女高声部换声区过渡-张晓云',
    studentName: '张晓云',
    voicePart: VoicePart.SOPRANO,
    alertLevel: AlertLevel.WARNING,
    status: RecordStatus.REVIEWED,
    rehearsalDate: '2026-06-12',
    detectedIssue: '换声区（B4-C5）过渡不够平滑，出现轻微破音迹象。',
    improvementNote: '建议增加轻声练习，逐步扩展换声区。',
    screenshots: [
      {
        id: uuidv4(),
        fileName: 'soprano_0612_zhang.png',
        dataUrl: makePlaceholderSvg('张晓云 - 06/12 换声区', '#06B6D4'),
        uploadedAt: '2026-06-12T20:00:00Z',
        isLate: false,
      },
    ],
    manualNotes: [],
    createdAt: '2026-06-12T19:45:00Z',
    updatedAt: '2026-06-12T19:45:00Z',
  },
];

export function generateMockHistory(records: ChorusAlertRecord[]): HistoryAction[] {
  const actions: HistoryAction[] = [];
  for (const record of records) {
    actions.push({
      id: uuidv4(),
      recordId: record.id,
      actionType: 'create',
      operator: '系统',
      timestamp: record.createdAt,
      description: `创建异常记录：${record.title}`,
    });
    if (record.operatorOverride) {
      actions.push({
        id: uuidv4(),
        recordId: record.id,
        actionType: 'update_judgment',
        fieldName: 'alertLevel',
        oldValue: AlertLevel.CRITICAL,
        newValue: record.operatorOverride.overrideLevel,
        operator: record.operatorOverride.operator,
        timestamp: record.operatorOverride.timestamp,
        description: record.operatorOverride.overrideNote || '人工调整异常等级',
      });
    }
    if (record.versionInfo) {
      actions.push({
        id: uuidv4(),
        recordId: record.id,
        actionType: 'detect_version',
        fieldName: 'versionSource',
        newValue: record.versionInfo.source,
        operator: '系统',
        timestamp: record.versionInfo.detectedAt,
        description: `检测到${record.versionInfo.source === VersionSource.OLD_MASTER ? '旧版母带混入' : '版本来源异常'}，已保留标记并给出处理建议。`,
      });
    }
    for (const screenshot of record.screenshots) {
      if (screenshot.isLate) {
        actions.push({
          id: uuidv4(),
          recordId: record.id,
          actionType: 'add_attachment',
          operator: '家长补传',
          timestamp: screenshot.uploadedAt,
          description: `晚到附件：${screenshot.fileName}${screenshot.note ? ' - ' + screenshot.note : ''}`,
        });
      }
    }
    for (const note of record.manualNotes) {
      actions.push({
        id: uuidv4(),
        recordId: record.id,
        actionType: 'add_note',
        operator: note.author,
        timestamp: note.createdAt,
        description: `添加人工备注：${note.content.slice(0, 30)}${note.content.length > 30 ? '...' : ''}`,
      });
    }
  }
  return actions.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
