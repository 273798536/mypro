import type {
  ReviewBatch,
  Song,
  VoiceTrack,
  AudioFile,
  HistoryEntry,
  ReviewException,
  CalcCriteria,
  AliasConflict,
  VoiceType,
} from '../types';

const VOICE_TYPES: VoiceType[] = ['soprano', 'alto', 'tenor', 'bass'];

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateCurve(
  seed: number,
  length: number,
  base: number,
  amplitude: number,
  injectAnomalyAt?: number[]
): number[] {
  const rand = seededRandom(seed);
  const result: number[] = [];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const wave =
      Math.sin(t * Math.PI * 6) * 0.4 +
      Math.sin(t * Math.PI * 13 + 0.7) * 0.2 +
      Math.cos(t * Math.PI * 3 + 1.2) * 0.15;
    const noise = (rand() - 0.5) * 0.35;
    let value = base + wave * amplitude + noise * amplitude * 0.4;
    if (injectAnomalyAt) {
      for (const pos of injectAnomalyAt) {
        const dist = Math.abs(i - pos);
        if (dist < 25) {
          value = base - amplitude * (0.7 + (1 - dist / 25) * 0.6);
        }
      }
    }
    result.push(Math.max(0, Math.round(value * 100) / 100));
  }
  return result;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}分${s.toString().padStart(2, '0')}秒`;
}

const SONG_DATA = [
  { name: '夜来香', aliases: ['Ye Lai Xiang', '夜來香'], duration: 210 },
  { name: '茉莉花', aliases: ['Mo Li Hua', 'Jasmine Flower'], duration: 185 },
  { name: '半个月亮爬上来', aliases: ['半個月亮爬上來'], duration: 168 },
  { name: '牧歌', aliases: ['Mongolian Madrigal'], duration: 240 },
  { name: '远方的客人请你留下来', aliases: ['遠方的客人請你留下來'], duration: 225 },
];

function generateVoiceTracks(songId: string, songSeed: number): VoiceTrack[] {
  return VOICE_TYPES.map((vt, idx) => {
    const seed = songSeed * 10 + idx;
    const anomalies: number[] = [];
    if (songSeed % 2 === 0 && idx === 0) anomalies.push(42, 108);
    if (songSeed % 3 === 0 && idx === 1) anomalies.push(75);
    if (songSeed % 5 === 0 && idx === 2) anomalies.push(130);
    return {
      id: `vt-${songId}-${vt}`,
      songId,
      voiceType: vt,
      energyCurve: generateCurve(seed, 180, 0.65, 0.45, anomalies),
      freqCurve: generateCurve(seed + 100, 180, 0.55, 0.4, anomalies.map((a) => a + 2)),
    };
  });
}

function generateAudioFiles(songId: string, songName: string, songSeed: number): AudioFile[] {
  const versions = ['v1.0_初录', 'v1.1_重录', 'v2.0_排练版'];
  if (songSeed % 2 === 0) versions.push('v2.1_修正版');
  return versions.map((tag, idx) => ({
    id: `af-${songId}-${idx}`,
    songId,
    fileName: `${songName}_${tag}.wav`,
    filePath: `/音频文件夹/2026春季演出/${songName}/${songName}_${tag}.wav`,
    versionTag: tag,
    duration: 180 + songSeed * 3 + idx * 5,
    createdAt: `2026-05-${String(10 + idx).padStart(2, '0')} 1${4 + idx}:30:00`,
  }));
}

function generateHistory(
  audioFiles: AudioFile[],
  songName: string,
  songSeed: number
): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  audioFiles.forEach((af, idx) => {
    entries.push({
      id: `h-${af.id}-upload`,
      audioFileId: af.id,
      type: 'upload',
      operator: idx === 0 ? '阿蓝' : '阿蓝',
      timestamp: af.createdAt,
      description: `上传版本 ${af.versionTag}`,
    });
    if (idx === 1 || songSeed % 2 === 0) {
      entries.push({
        id: `h-${af.id}-note`,
        audioFileId: af.id,
        type: 'note_added',
        operator: idx === 1 ? '王老师' : '李老师',
        timestamp: af.createdAt.replace(/1\d:/, '16:'),
        description: '声乐老师补充备注',
        noteContent:
          idx === 1
            ? `${songName}这段副歌部分气息比上一版稳，女高音进拍时注意不要抢。`
            : '建议混音时稍微提亮男高音声部，目前被低音盖过。',
      });
    }
    if (idx === 2) {
      entries.push({
        id: `h-${af.id}-screen`,
        audioFileId: af.id,
        type: 'screenshot_added',
        operator: '阿蓝',
        timestamp: af.createdAt.replace(/1\d:/, '18:'),
        description: '附DAW截图对比波形',
        screenshotUrl: `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
          'digital audio workstation DAW screen showing choir multi-track waveform, professional audio editing software interface, tracks labeled soprano alto tenor bass'
        )}&image_size=landscape_16_9`,
      });
    }
    if (idx === audioFiles.length - 1) {
      entries.push({
        id: `h-${af.id}-review`,
        audioFileId: af.id,
        type: 'review_marker',
        operator: '系统',
        timestamp: `2026-06-${String(10 + songSeed).padStart(2, '0')} 09:15:00`,
        description: '本次复核标记完成',
      });
    }
  });
  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

function generateExceptions(
  batchId: string,
  songs: Song[]
): ReviewException[] {
  const exceptions: ReviewException[] = [];
  const humanReasons = [
    {
      metric: '音量能量',
      deviation: '低30%',
      cause: '队员站位偏后，麦克风距离过远',
      ref: '5月12日排练版本',
    },
    {
      metric: '频率集中度',
      deviation: '偏高15%',
      cause: '声部共鸣位置上移，可能是紧张导致',
      ref: '4月28日走台录音',
    },
    {
      metric: '进拍时间',
      deviation: '晚0.8秒',
      cause: '指挥手势过渡段被遮挡，建议回看录像',
      ref: '6月3日带妆彩排',
    },
    {
      metric: '音准偏差',
      deviation: '偏离25音分',
      cause: '换气点后回不到原调，建议单独练习这句',
      ref: '5月20日声乐小课录音',
    },
  ];
  songs.forEach((song, songIdx) => {
    if (songIdx === 0) return;
    song.voiceTracks.forEach((vt, vtIdx) => {
      const key = songIdx * 4 + vtIdx;
      if (key % 3 === 0) {
        const reasonIdx = key % humanReasons.length;
        const r = humanReasons[reasonIdx];
        const timePos = 30 + (key * 37) % 150;
        const voiceLabels: Record<VoiceType, string> = {
          soprano: '女高音',
          alto: '女低音',
          tenor: '男高音',
          bass: '男低音',
        };
        const severity =
          key % 7 === 0
            ? 'critical'
            : key % 5 === 0
            ? 'high'
            : key % 2 === 0
            ? 'medium'
            : 'low';
        exceptions.push({
          id: `ex-${batchId}-${key}`,
          reviewBatchId: batchId,
          voiceTrackId: vt.id,
          songId: song.id,
          severity,
          humanReason: `${voiceLabels[vt.voiceType]}声部第${formatTime(
            timePos
          )}处${r.metric}比基准${r.deviation}，可能是${r.cause}，参考${r.ref}。`,
          timePosition: timePos,
          metric: r.metric,
          deviation: r.deviation,
          possibleCause: r.cause,
          referenceVersion: r.ref,
          relatedFilePath: song.audioFiles[song.audioFiles.length - 1].filePath,
          calcCriteriaId: `cc-${batchId}`,
          resolved: key % 4 === 0,
        });
      }
    });
  });
  return exceptions;
}

function generateCalcCriteria(batchId: string, batchSeed: number): CalcCriteria {
  const variants = [
    '能量阈值比上次收紧5%（演出前标准提高）',
    '频率偏差检测窗口从100ms加宽到150ms，减少误报',
    '新增进拍时序对齐模块，以指挥节拍为基准',
    '基准线更新为上一场正式演出录音',
  ];
  return {
    id: `cc-${batchId}`,
    reviewBatchId: batchId,
    energyThreshold: 0.32 + batchSeed * 0.01,
    frequencyDeviation: 20 + batchSeed * 2,
    algorithmVersion: `v2.${3 + (batchSeed % 4)}.0`,
    baselineDate: '2026-05-15',
    diffFromPrevious: variants[batchSeed % variants.length],
  };
}

function generateAliasConflicts(
  batchId: string,
  songs: Song[]
): AliasConflict[] {
  return [
    {
      id: `ac-${batchId}-1`,
      duplicateNames: ['夜来香', '夜來香'],
      possibleReasons: ['same_song_alias', 'typo'],
      affectedVoiceCount: 4,
      affectedFileIds: songs[0].audioFiles.map((f) => f.id),
      affectedSongNames: ['夜来香', '夜來香（繁体）'],
      confirmed: false,
    },
    {
      id: `ac-${batchId}-2`,
      duplicateNames: ['茉莉花', '好一朵美丽的茉莉花'],
      possibleReasons: ['same_song_alias'],
      affectedVoiceCount: 4,
      affectedFileIds: songs[1].audioFiles.slice(0, 2).map((f) => f.id),
      affectedSongNames: ['茉莉花', '好一朵美丽的茉莉花'],
      confirmed: false,
    },
  ];
}

export function generateBatch(batchSeed: number): ReviewBatch {
  const batchNames = [
    '2026春季音乐会·合唱曲目复核',
    '6月毕业晚会·合唱组复审',
    '艺术节献礼曲目·终版确认',
  ];
  const statuses: ReviewBatch['status'][] = [
    'has_exceptions',
    'awaiting_confirm',
    'completed',
  ];
  const folderPaths = [
    '/音频文件夹/2026春季音乐会/',
    '/音频文件夹/毕业晚会2026/',
    '/音频文件夹/艺术节献礼/',
  ];
  const batchId = `rb-${1000 + batchSeed}`;
  const songs: Song[] = SONG_DATA.map((sd, idx) => {
    const songId = `s-${batchId}-${idx}`;
    const songSeed = batchSeed * 7 + idx * 3 + 1;
    const voiceTracks = generateVoiceTracks(songId, songSeed);
    const audioFiles = generateAudioFiles(songId, sd.name, songSeed);
    const history = generateHistory(audioFiles, sd.name, songSeed);
    return {
      id: songId,
      reviewBatchId: batchId,
      name: sd.name,
      aliases: sd.aliases,
      durationSec: sd.duration,
      voiceTracks,
      audioFiles,
      history,
    };
  });
  const calcCriteria = generateCalcCriteria(batchId, batchSeed);
  const exceptions = generateExceptions(batchId, songs);
  const aliasConflicts =
    statuses[batchSeed] === 'awaiting_confirm'
      ? generateAliasConflicts(batchId, songs)
      : [];
  return {
    id: batchId,
    name: batchNames[batchSeed % batchNames.length],
    folderPath: folderPaths[batchSeed % folderPaths.length],
    status: statuses[batchSeed % statuses.length],
    createdAt: `2026-06-${String(1 + batchSeed * 3).padStart(2, '0')} 10:00:00`,
    createdBy: '阿蓝',
    songs,
    exceptions,
    calcCriteria,
    aliasConflicts,
  };
}

export function generateAllBatches(): ReviewBatch[] {
  return [0, 1, 2].map((s) => generateBatch(s));
}

export function formatSeconds(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface ParsedSongFile {
  songName: string;
  audioFiles: File[];
  noteFiles: File[];
  screenshotFiles: File[];
  allRawNames: string[];
}

export interface ParsedFolderData {
  rootFolderName: string;
  songs: ParsedSongFile[];
  noteContents: Record<string, string>;
  screenshotUrls: Record<string, string>;
  totalFiles: number;
}

const AUDIO_EXT = new Set(['.wav', '.mp3', '.flac', '.m4a', '.aac', '.ogg', '.opus']);
const NOTE_EXT = new Set(['.txt', '.md']);
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']);

function getExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

function stripExt(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(0, i) : name;
}

function guessSongName(rawPath: string, fallback: string): string {
  const parts = rawPath.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const parent = parts[parts.length - 2];
    if (parent && !/^(soprano|alto|tenor|bass|女高|女低|男高|男低|v[0-9]|版本|mix|master)$/i.test(parent)) {
      return parent;
    }
  }
  let base = stripExt(parts[parts.length - 1] ?? fallback);
  base = base.replace(/[_\-\s]*(soprano|alto|tenor|bass|女高音?|女低音?|男高音?|男低音?|v\d+.*|final|mix|master|初录|重录|排练|修正|demo)[_\-\s]*/gi, '');
  base = base.trim();
  return base || fallback;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ''));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ''));
    fr.onerror = () => reject(fr.error);
    fr.readAsText(file, 'utf-8');
  });
}

export async function parseDroppedFiles(files: File[]): Promise<ParsedFolderData> {
  const rootFolderName =
    files[0]?.webkitRelativePath?.split('/')[0]?.trim() || '新导入批次';

  const songMap = new Map<string, ParsedSongFile>();

  for (const f of files) {
    const ext = getExt(f.name);
    if (!AUDIO_EXT.has(ext) && !NOTE_EXT.has(ext) && !IMAGE_EXT.has(ext)) continue;
    const relPath = f.webkitRelativePath || f.name;
    const songName = guessSongName(relPath, '未命名曲目');
    if (!songMap.has(songName)) {
      songMap.set(songName, {
        songName,
        audioFiles: [],
        noteFiles: [],
        screenshotFiles: [],
        allRawNames: [],
      });
    }
    const bucket = songMap.get(songName)!;
    bucket.allRawNames.push(f.name);
    if (AUDIO_EXT.has(ext)) bucket.audioFiles.push(f);
    else if (NOTE_EXT.has(ext)) bucket.noteFiles.push(f);
    else if (IMAGE_EXT.has(ext)) bucket.screenshotFiles.push(f);
  }

  const songs = Array.from(songMap.values());
  if (songs.length === 0) {
    songs.push({
      songName: rootFolderName,
      audioFiles: [],
      noteFiles: [],
      screenshotFiles: [],
      allRawNames: files.map((f) => f.name),
    });
  }

  const noteContents: Record<string, string> = {};
  const screenshotUrls: Record<string, string> = {};

  for (const song of songs) {
    for (const nf of song.noteFiles) {
      try {
        noteContents[`${song.songName}::${nf.name}`] = await readTextFile(nf);
      } catch {
        noteContents[`${song.songName}::${nf.name}`] = '';
      }
    }
    for (const sf of song.screenshotFiles.slice(0, 6)) {
      try {
        screenshotUrls[`${song.songName}::${sf.name}`] = await fileToDataUrl(sf);
      } catch {
        // ignore
      }
    }
  }

  return {
    rootFolderName,
    songs,
    noteContents,
    screenshotUrls,
    totalFiles: files.length,
  };
}

export function buildBatchFromParsed(
  batchId: string,
  name: string,
  folderPath: string,
  parsed: ParsedFolderData
): ReviewBatch {
  const createdAt = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
  const songs: Song[] = parsed.songs.map((ps, idx) => {
    const songId = `s-${batchId}-${idx}`;
    const songSeed = Date.now() + idx * 13 + 1;
    const voiceTracks = generateVoiceTracks(songId, songSeed);

    const audioFiles: AudioFile[] = ps.audioFiles.map((af, i) => ({
      id: `af-${songId}-${i}`,
      songId,
      fileName: af.name,
      filePath: `${folderPath}${ps.songName}/${af.name}`,
      versionTag: `v${i + 1}.0_导入`,
      duration: Math.round(af.size / 16000) || 180,
      createdAt,
    }));
    if (audioFiles.length === 0) {
      audioFiles.push({
        id: `af-${songId}-0`,
        songId,
        fileName: `${ps.songName}_占位.wav`,
        filePath: `${folderPath}${ps.songName}/${ps.songName}_占位.wav`,
        versionTag: 'v1.0_占位',
        duration: 180,
        createdAt,
      });
    }

    const history: HistoryEntry[] = [];
    audioFiles.forEach((af, i) => {
      history.push({
        id: `h-${af.id}-upload`,
        audioFileId: af.id,
        type: 'upload',
        operator: '阿蓝',
        timestamp: createdAt,
        description: `上传版本 ${af.versionTag}（来自拖入文件夹）`,
      });
    });

    Object.entries(parsed.noteContents).forEach(([key, content]) => {
      if (!key.startsWith(`${ps.songName}::`)) return;
      const fileName = key.slice(ps.songName.length + 2);
      const targetAf = audioFiles[audioFiles.length - 1];
      if (!content.trim()) return;
      history.push({
        id: `h-${targetAf.id}-note-${history.length}`,
        audioFileId: targetAf.id,
        type: 'note_added',
        operator: '导入备注',
        timestamp: createdAt,
        description: `从 ${fileName} 导入的备注`,
        noteContent: content.trim(),
      });
    });

    Object.entries(parsed.screenshotUrls).forEach(([key, url]) => {
      if (!key.startsWith(`${ps.songName}::`)) return;
      const fileName = key.slice(ps.songName.length + 2);
      const targetAf = audioFiles[audioFiles.length - 1];
      history.push({
        id: `h-${targetAf.id}-screen-${history.length}`,
        audioFileId: targetAf.id,
        type: 'screenshot_added',
        operator: '导入截图',
        timestamp: createdAt,
        description: `从 ${fileName} 导入的历史截图`,
        screenshotUrl: url,
      });
    });

    const aliases = Array.from(new Set([ps.songName, ...ps.allRawNames.map((n) => stripExt(n))]))
      .filter((a) => a && a !== ps.songName)
      .slice(0, 3);

    return {
      id: songId,
      reviewBatchId: batchId,
      name: ps.songName,
      aliases,
      durationSec: 180 + idx * 7,
      voiceTracks,
      audioFiles,
      history,
    };
  });

  const calcCriteria: CalcCriteria = {
    id: `cc-${batchId}`,
    reviewBatchId: batchId,
    energyThreshold: 0.32,
    frequencyDeviation: 20,
    algorithmVersion: 'v2.3.0',
    baselineDate: new Date(Date.now() - 86400000 * 14).toISOString().slice(0, 10),
    diffFromPrevious: '沿用最近一次演出前标准，新增别名自动检测模块',
  };

  const exceptions = generateExceptions(batchId, songs);

  const seenNames = new Map<string, number>();
  songs.forEach((s) => {
    const key = s.name;
    seenNames.set(key, (seenNames.get(key) ?? 0) + 1);
    s.aliases.forEach((a) => seenNames.set(a, (seenNames.get(a) ?? 0) + 1));
  });
  const aliasConflicts: AliasConflict[] = [];
  let acIdx = 0;
  seenNames.forEach((count, dupName) => {
    if (count >= 2 && acIdx < 5) {
      const relatedSongs = songs.filter(
        (s) => s.name === dupName || s.aliases.includes(dupName)
      );
      aliasConflicts.push({
        id: `ac-${batchId}-${acIdx++}`,
        duplicateNames: [dupName, ...relatedSongs.map((s) => s.name).filter((n) => n !== dupName)].slice(0, 3),
        possibleReasons: ['same_song_alias', 'typo'],
        affectedVoiceCount: relatedSongs.length * 4,
        affectedFileIds: relatedSongs.flatMap((s) => s.audioFiles.map((f) => f.id)),
        affectedSongNames: relatedSongs.map((s) => s.name),
        confirmed: false,
      });
    }
  });

  return {
    id: batchId,
    name,
    folderPath,
    status: aliasConflicts.length > 0 ? 'awaiting_confirm' : 'has_exceptions',
    createdAt,
    createdBy: '阿蓝',
    songs,
    exceptions,
    calcCriteria,
    aliasConflicts,
  };
}
