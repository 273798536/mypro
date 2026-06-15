import { StageChannelRecord, TrackItem } from './types';
import * as dataStore from './store/dataStore';

const stageRecords: StageChannelRecord[] = [
  {
    id: 'stage_001',
    channelNo: 1,
    originalFilename: 'PODCAST_INTRO_OPENING_20240615.wav',
    recordedAt: '2024-06-15T09:00:00+08:00',
    timecodeStart: '00:00:00:00',
    timecodeEnd: '00:00:15:00',
    durationSeconds: 15,
    engineerNote: '开场音乐，电平正常',
    rawDescription: 'CH1 开场音乐 标准时码 无延迟',
    isLateArrival: false,
    receivedAt: '2024-06-15T09:05:00+08:00',
  },
  {
    id: 'stage_002',
    channelNo: 2,
    originalFilename: 'PODCAST_INTRO_HOST_GREETING_v2.wav',
    recordedAt: '2024-06-15T09:00:15:00',
    timecodeStart: '00:00:15:00',
    timecodeEnd: '00:00:35:00',
    durationSeconds: 20,
    engineerNote: '主持人开场白，第二版',
    rawDescription: 'CH2 主持人开场白 第二版录音',
    isLateArrival: false,
    receivedAt: '2024-06-15T09:05:02+08:00',
  },
  {
    id: 'stage_003',
    channelNo: 3,
    originalFilename: 'PODCAST_INTRO_THEME_MUSIC.wav',
    recordedAt: '2024-06-15T09:00:35:00',
    timecodeStart: '00:00:35:00',
    timecodeEnd: '00:00:55:12',
    durationSeconds: 20.48,
    engineerNote: '老许备注：设备重启后第一帧略有偏移，约半帧，时码器已同步，实际录制时码：00:00:35:00 但录机内部延迟20ms起录',
    rawDescription: 'CH3 主题音乐 设备重启后第一轨 时码偏半拍 约20ms 已在录音日志标注 时码器显示00:00:35:00 实际音频起始点偏晚20ms',
    isLateArrival: false,
    receivedAt: '2024-06-15T09:05:05+08:00',
    timecodeDeviationMs: 20,
  },
  {
    id: 'stage_004',
    channelNo: 4,
    originalFilename: 'PODCAST_INTRO_SPONSOR_AD.wav',
    recordedAt: '2024-06-15T09:00:55:00',
    timecodeStart: '00:00:55:00',
    timecodeEnd: '00:01:25:00',
    durationSeconds: 30,
    engineerNote: '赞助商广告',
    rawDescription: 'CH4 赞助商口播 30秒版本',
    isLateArrival: false,
    receivedAt: '2024-06-15T09:05:10+08:00',
  },
  {
    id: 'stage_005',
    channelNo: 5,
    originalFilename: 'PODCAST_INTRO_OUTRO_CLOSING.wav',
    recordedAt: '2024-06-15T09:01:25:00',
    timecodeStart: '00:01:25:10',
    timecodeEnd: '00:01:40:00',
    durationSeconds: 14.6,
    engineerNote: '晚到！导播临时改的版本，彩排后才交过来',
    rawDescription: 'CH5 片尾音乐 彩排后重新录制 延迟送达 时码整体后移10帧',
    isLateArrival: true,
    receivedAt: '2024-06-15T10:30:00+08:00',
  },
];

const trackItems: TrackItem[] = [
  {
    id: 'track_001',
    trackNo: 1,
    expectedTitle: '片头开场音乐',
    expectedFilename: 'PODCAST_INTRO_OPENING_20240615.wav',
    expectedTimecodeStart: '00:00:00:00',
    expectedDuration: 15,
    segment: 'opening',
  },
  {
    id: 'track_002',
    trackNo: 2,
    expectedTitle: '主持人开场白',
    expectedFilename: 'PODCAST_INTRO_HOST_GREETING.wav',
    expectedTimecodeStart: '00:00:15:00',
    expectedDuration: 20,
    segment: 'intro',
  },
  {
    id: 'track_003',
    trackNo: 3,
    expectedTitle: '主题音乐',
    expectedFilename: 'PODCAST_INTRO_THEME_MUSIC.wav',
    expectedTimecodeStart: '00:00:35:00',
    expectedDuration: 20,
    segment: 'theme',
  },
  {
    id: 'track_004',
    trackNo: 4,
    expectedTitle: '赞助商广告',
    expectedFilename: 'PODCAST_INTRO_SPONSOR_AD.wav',
    expectedTimecodeStart: '00:00:55:00',
    expectedDuration: 30,
    segment: 'intro',
  },
  {
    id: 'track_005',
    trackNo: 5,
    expectedTitle: '片尾音乐',
    expectedFilename: 'PODCAST_INTRO_OUTRO_CLOSING.wav',
    expectedTimecodeStart: '00:01:25:00',
    expectedDuration: 15,
    segment: 'outro',
  },
];

export function loadSeedData(): void {
  dataStore.clearAll();
  stageRecords.forEach(r => dataStore.addStageRecord(r));
  trackItems.forEach(t => dataStore.addTrackItem(t));
  console.log(`已加载 ${stageRecords.length} 条舞台通道记录和 ${trackItems.length} 条曲目表记录`);
  console.log('');
  console.log('=== 舞台通道记录 ===');
  stageRecords.forEach(r => {
    console.log(`CH${r.channelNo}: ${r.originalFilename}`);
    console.log(`  时码: ${r.timecodeStart} -> ${r.timecodeEnd}`);
    if (r.isLateArrival) console.log(`  ⚠️  晚到附件！接收时间: ${r.receivedAt}`);
    if (r.rawDescription.includes('半拍')) console.log(`  ⚠️  原始描述: ${r.rawDescription}`);
  });
  console.log('');
  console.log('=== 曲目表 ===');
  trackItems.forEach(t => {
    console.log(`TRK${t.trackNo}: ${t.expectedTitle} [${t.segment}]`);
    console.log(`  预期文件: ${t.expectedFilename}`);
    console.log(`  预期时码: ${t.expectedTimecodeStart} (${t.expectedDuration}s)`);
  });
}

if (require.main === module) {
  loadSeedData();
}
