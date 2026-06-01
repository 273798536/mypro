import { Song, PlaylistItem, Playlist, Conflict, Version, Correction } from '../types';

export const mockSongs: Song[] = [
  { id: 's1', title: '晴天', artist: '周杰伦', album: '叶惠美', isNew: false, weight: 85, genre: '流行', duration: 269 },
  { id: 's2', title: '七里香', artist: '周杰伦', album: '七里香', isNew: false, weight: 82, genre: '流行', duration: 299 },
  { id: 's3', title: '稻香', artist: '周杰伦', album: '魔杰座', isNew: false, weight: 78, genre: '流行', duration: 223 },
  { id: 's4', title: '最伟大的作品', artist: '周杰伦', album: '最伟大的作品', isNew: true, weight: 92, genre: '流行', duration: 248 },
  { id: 's5', title: '孤勇者', artist: '陈奕迅', album: '孤勇者', isNew: false, weight: 88, genre: '流行', duration: 262 },
  { id: 's6', title: '富士山下', artist: '陈奕迅', album: 'What\'s Going On...?', isNew: false, weight: 80, genre: '流行', duration: 280 },
  { id: 's7', title: '人啊_', artist: '陈奕迅', album: 'L.O.V.E.', isNew: true, weight: 86, genre: '流行', duration: 245 },
  { id: 's8', title: '光年之外', artist: '邓紫棋', album: '光年之外', isNew: false, weight: 84, genre: '流行', duration: 235 },
  { id: 's9', title: '倒数', artist: '邓紫棋', album: '另一个童话', isNew: false, weight: 79, genre: '流行', duration: 239 },
  { id: 's10', title: '摩天动物园', artist: '邓紫棋', album: '摩天动物园', isNew: true, weight: 90, genre: '流行', duration: 285 },
  { id: 's11', title: '起风了', artist: '买辣椒也用券', album: '起风了', isNew: false, weight: 83, genre: '流行', duration: 325 },
  { id: 's12', title: '漠河舞厅', artist: '柳爽', album: '漠河舞厅', isNew: true, weight: 87, genre: '民谣', duration: 288 },
  { id: 's13', title: '如愿', artist: '王菲', album: '如愿', isNew: false, weight: 81, genre: '流行', duration: 310 },
  { id: 's14', title: '红豆', artist: '王菲', album: '唱游', isNew: false, weight: 86, genre: '流行', duration: 276 },
  { id: 's15', title: '这世界那么多人', artist: '莫文蔚', album: '这世界那么多人', isNew: false, weight: 77, genre: '流行', duration: 295 },
  { id: 's16', title: '慢慢喜欢你', artist: '莫文蔚', album: '我们在中场相遇', isNew: false, weight: 75, genre: '流行', duration: 258 },
  { id: 's17', title: '少年', artist: '梦然', album: '少年', isNew: true, weight: 89, genre: '流行', duration: 233 },
  { id: 's18', title: '飞鸟和蝉', artist: '任然', album: '飞鸟和蝉', isNew: false, weight: 76, genre: '流行', duration: 287 },
  { id: 's19', title: '成都', artist: '赵雷', album: '无法长大', isNew: false, weight: 82, genre: '民谣', duration: 330 },
  { id: 's20', title: '南方姑娘', artist: '赵雷', album: '赵小雷', isNew: false, weight: 78, genre: '民谣', duration: 295 },
];

const startTime = new Date('2024-01-15T08:00:00');

export const mockPlaylistItems: PlaylistItem[] = [
  { id: 'p1', songId: 's1', position: 0, scheduledTime: '08:00', source: 'library', song: mockSongs[0] },
  { id: 'p2', songId: 's2', position: 1, scheduledTime: '08:05', source: 'library', song: mockSongs[1] },
  { id: 'p3', songId: 's3', position: 2, scheduledTime: '08:10', source: 'library', song: mockSongs[2] },
  { id: 'p4', songId: 's5', position: 3, scheduledTime: '08:15', source: 'library', song: mockSongs[4] },
  { id: 'p5', songId: 's4', position: 4, scheduledTime: '08:20', source: 'promotion', song: mockSongs[3] },
  { id: 'p6', songId: 's7', position: 5, scheduledTime: '08:25', source: 'promotion', song: mockSongs[6] },
  { id: 'p7', songId: 's10', position: 6, scheduledTime: '08:30', source: 'promotion', song: mockSongs[9] },
  { id: 'p8', songId: 's12', position: 7, scheduledTime: '08:35', source: 'promotion', song: mockSongs[11] },
  { id: 'p9', songId: 's17', position: 8, scheduledTime: '08:40', source: 'promotion', song: mockSongs[16] },
  { id: 'p10', songId: 's8', position: 9, scheduledTime: '08:45', source: 'library', song: mockSongs[7] },
  { id: 'p11', songId: 's9', position: 10, scheduledTime: '08:50', source: 'library', song: mockSongs[8] },
  { id: 'p12', songId: 's6', position: 11, scheduledTime: '08:55', source: 'library', song: mockSongs[5] },
  { id: 'p13', songId: 's11', position: 12, scheduledTime: '09:00', source: 'library', song: mockSongs[10] },
  { id: 'p14', songId: 's13', position: 13, scheduledTime: '09:05', source: 'library', song: mockSongs[12] },
  { id: 'p15', songId: 's14', position: 14, scheduledTime: '09:10', source: 'library', song: mockSongs[13] },
  { id: 'p16', songId: 's15', position: 15, scheduledTime: '09:15', source: 'library', song: mockSongs[14] },
  { id: 'p17', songId: 's16', position: 16, scheduledTime: '09:20', source: 'library', song: mockSongs[15] },
  { id: 'p18', songId: 's18', position: 17, scheduledTime: '09:25', source: 'library', song: mockSongs[17] },
  { id: 'p19', songId: 's19', position: 18, scheduledTime: '09:30', source: 'library', song: mockSongs[18] },
  { id: 'p20', songId: 's20', position: 19, scheduledTime: '09:35', source: 'library', song: mockSongs[19] },
];

export const mockPlaylist: Playlist = {
  id: 'pl1',
  name: '早高峰热门金曲',
  version: 'v1.2',
  createdAt: startTime.toISOString(),
  createdBy: '音乐总监 - 李明',
  items: mockPlaylistItems,
};

export const mockConflicts: Conflict[] = [
  {
    id: 'c1',
    playlistId: 'pl1',
    type: 'artist_repeat',
    severity: 'high',
    position: 0,
    relatedItemIds: ['p1', 'p2', 'p3'],
    triggeredBy: {
      source: '歌曲库导入',
      material: '周杰伦经典歌曲合集.xlsx',
      timestamp: '2024-01-15T07:30:00',
    },
    constraintRule: {
      id: 'cr1',
      name: '同艺人连播限制',
      description: '同一艺人的歌曲在15分钟内不能连续播放超过2首',
      threshold: 2,
    },
    detectionAlgorithm: {
      name: '连续艺人检测算法',
      version: 'v2.1.0',
      parameters: { threshold: 2, windowMinutes: 15 },
    },
    resolved: false,
  },
  {
    id: 'c2',
    playlistId: 'pl1',
    type: 'new_song_dense',
    severity: 'medium',
    position: 4,
    relatedItemIds: ['p5', 'p6', 'p7', 'p8', 'p9'],
    triggeredBy: {
      source: '新歌推广任务',
      material: '2024年第3周新歌推广清单.docx',
      timestamp: '2024-01-15T07:45:00',
    },
    constraintRule: {
      id: 'cr2',
      name: '新歌密度控制',
      description: '每5首歌中新歌数量不能超过2首',
      threshold: 2,
    },
    detectionAlgorithm: {
      name: '滑动窗口新歌检测',
      version: 'v1.5.0',
      parameters: { windowSize: 5, maxNewSongs: 2 },
    },
    resolved: false,
  },
  {
    id: 'c3',
    playlistId: 'pl1',
    type: 'ad_clash',
    severity: 'low',
    position: 9,
    relatedItemIds: ['p10', 'p11'],
    triggeredBy: {
      source: '广告时段配置',
      material: '早高峰广告排期表.pdf',
      timestamp: '2024-01-15T07:20:00',
    },
    constraintRule: {
      id: 'cr3',
      name: '广告前后歌曲主题匹配',
      description: '广告前后歌曲主题应与广告内容相关',
      threshold: 0.6,
    },
    detectionAlgorithm: {
      name: '广告歌曲匹配度检测',
      version: 'v1.2.0',
      parameters: { matchThreshold: 0.6 },
    },
    resolved: true,
    resolution: '已确认歌曲与广告主题匹配度达标，为特殊安排',
  },
];

export const mockVersions: Version[] = [
  {
    id: 'v1',
    playlistId: 'pl1',
    versionNumber: 'v1.0',
    createdAt: '2024-01-14T10:00:00',
    modifiedBy: '编排员 - 王芳',
    changes: [
      { type: 'add', itemId: 'p1', description: '添加歌曲《晴天》' },
      { type: 'add', itemId: 'p2', description: '添加歌曲《七里香》' },
      { type: 'add', itemId: 'p3', description: '添加歌曲《稻香》' },
    ],
    notes: '初始版本，导入基础歌单',
  },
  {
    id: 'v2',
    playlistId: 'pl1',
    versionNumber: 'v1.1',
    parentVersionId: 'v1',
    createdAt: '2024-01-15T07:30:00',
    modifiedBy: '音乐总监 - 李明',
    changes: [
      { type: 'add', itemId: 'p5', description: '添加新歌《最伟大的作品》' },
      { type: 'add', itemId: 'p6', description: '添加新歌《人啊_》' },
      { type: 'add', itemId: 'p7', description: '添加新歌《摩天动物园》' },
    ],
    notes: '加入本周新歌推广任务',
  },
  {
    id: 'v3',
    playlistId: 'pl1',
    versionNumber: 'v1.2',
    parentVersionId: 'v2',
    createdAt: '2024-01-15T07:50:00',
    modifiedBy: '编排员 - 王芳',
    changes: [
      { type: 'resolve', conflictId: 'c3', description: '标记广告冲突已处理' },
    ],
    notes: '处理广告撞歌警告，确认无误',
  },
];

export const mockCorrections: Correction[] = [
  {
    id: 'corr1',
    conflictId: 'c3',
    type: 'resolve',
    content: '经确认，该时段为品牌定制节目，歌曲《光年之外》与某品牌广告有合作关系，属于特殊安排。已在编排报告中注明。',
    createdAt: '2024-01-15T07:50:00',
    createdBy: '编排员 - 王芳',
  },
];

export const generateHeatmapData = () => {
  const hours = ['08:00', '08:30', '09:00', '09:30', '10:00'];
  const days = ['周一', '周二', '周三', '周四', '周五'];
  
  return days.map((day, dayIndex) => 
    hours.map((hour, hourIndex) => ({
      day,
      hour,
      value: Math.floor(Math.random() * 5) + (dayIndex === 0 && hourIndex === 0 ? 3 : 0),
    }))
  ).flat();
};
