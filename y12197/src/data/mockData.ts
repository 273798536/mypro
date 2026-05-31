import type { Song, Playlist, ValidationRule, OperationLog } from '@/types';

const batchId = 'batch-demo-001';

export const mockSongs: Song[] = [
  { id: 's1', title: '光辉岁月', artist: 'Beyond', year: 1991, tags: ['华语', '摇滚'], genre: '摇滚', language: '粤语', region: '港台', source: { filename: '经典粤语.csv', rowNumber: 2, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's2', title: '海阔天空', artist: 'Beyond', year: 1993, tags: ['华语', '摇滚'], genre: '摇滚', language: '粤语', region: '港台', source: { filename: '经典粤语.csv', rowNumber: 3, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's3', title: '真的爱你', artist: 'Beyond', year: 1989, tags: ['华语', '摇滚'], genre: '摇滚', language: '粤语', region: '港台', source: { filename: '经典粤语.csv', rowNumber: 4, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's4', title: '晴天', artist: '周杰伦', year: 2003, tags: ['华语', '流行'], genre: '流行', language: '国语', region: '港台', source: { filename: '华语流行.xlsx', rowNumber: 2, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's5', title: '七里香', artist: '周杰伦', year: 2004, tags: ['华语', '流行'], genre: '流行', language: '国语', region: '港台', source: { filename: '华语流行.xlsx', rowNumber: 3, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's6', title: '稻香', artist: '周杰伦', year: 2008, tags: ['华语', '流行'], genre: '流行', language: '国语', region: '港台', source: { filename: '华语流行.xlsx', rowNumber: 4, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's7', title: 'Hotel California', artist: 'Eagles', year: 1977, tags: ['欧美', '摇滚'], genre: '摇滚', language: '英语', region: '欧美', source: { filename: '欧美经典.csv', rowNumber: 2, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's8', title: 'Bohemian Rhapsody', artist: 'Queen', year: 1975, tags: ['欧美', '摇滚'], genre: '摇滚', language: '英语', region: '欧美', source: { filename: '欧美经典.csv', rowNumber: 3, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's9', title: 'Shape of You', artist: 'Ed Sheeran', year: 2017, tags: ['欧美', '流行'], genre: '流行', language: '英语', region: '欧美', source: { filename: '欧美新歌.xlsx', rowNumber: 2, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's10', title: 'Lemon', artist: '米津玄師', year: 2018, tags: ['日韩', '流行'], genre: '流行', language: '日语', region: '日韩', source: { filename: '日韩精选.csv', rowNumber: 2, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's11', title: '平凡之路', artist: '朴树', year: 2014, tags: ['华语', '民谣'], genre: '民谣', language: '国语', region: '内地', source: { filename: '华语流行.xlsx', rowNumber: 5, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's12', title: '成都', artist: '赵雷', year: 2016, tags: ['华语', '民谣'], genre: '民谣', language: '国语', region: '内地', source: { filename: '华语流行.xlsx', rowNumber: 6, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's13', title: 'Bad Guy', artist: 'Billie Eilish', year: 2019, tags: ['欧美', '流行'], genre: '流行', language: '英语', region: '欧美', source: { filename: '欧美新歌.xlsx', rowNumber: 3, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's14', title: '起风了', artist: '买辣椒也用券', year: 2017, tags: ['华语', '流行'], genre: '流行', language: '国语', region: '内地', source: { filename: '华语流行.xlsx', rowNumber: 7, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
  { id: 's15', title: 'Blinding Lights', artist: 'The Weeknd', year: 2020, tags: ['欧美', '流行'], genre: '流行', language: '英语', region: '欧美', source: { filename: '欧美新歌.xlsx', rowNumber: 4, importBatchId: batchId }, createdAt: '2025-05-01T10:00:00Z', updatedAt: '2025-05-01T10:00:00Z' },
];

export const mockPlaylist: Playlist = {
  id: 'pl-1',
  name: '晚间音乐电台-5月试播',
  description: '5月试播期间综合歌单',
  songs: mockSongs,
  version: 1,
  versionName: '初稿',
  isLocked: false,
  createdAt: '2025-05-01T10:00:00Z',
  updatedAt: '2025-05-01T10:00:00Z',
  createdBy: '编导张三',
};

export const defaultValidationRules: ValidationRule[] = [
  {
    id: 'rule-1',
    name: '歌手重复限制',
    type: 'artist_max_count',
    params: { maxCount: 2 },
    enabled: true,
    weight: 40,
  },
  {
    id: 'rule-2',
    name: '年代分布均衡',
    type: 'decade_range',
    params: {
      ranges: [
        { min: 1970, max: 1979, minRatio: 0.05, maxRatio: 0.15 },
        { min: 1980, max: 1989, minRatio: 0.1, maxRatio: 0.25 },
        { min: 1990, max: 1999, minRatio: 0.1, maxRatio: 0.25 },
        { min: 2000, max: 2009, minRatio: 0.15, maxRatio: 0.35 },
        { min: 2010, max: 2019, minRatio: 0.15, maxRatio: 0.3 },
        { min: 2020, max: 2029, minRatio: 0.05, maxRatio: 0.2 },
      ],
    },
    enabled: true,
    weight: 35,
  },
  {
    id: 'rule-3',
    name: '标签配比',
    type: 'tag_ratio',
    params: {
      requiredTags: ['华语', '欧美', '日韩'],
      minRatio: 0.2,
      maxRatio: 0.55,
    },
    enabled: true,
    weight: 15,
  },
  {
    id: 'rule-4',
    name: '流派均衡',
    type: 'genre_balance',
    params: { maxGenreRatio: 0.4 },
    enabled: true,
    weight: 10,
  },
];

export const mockOperationLogs: OperationLog[] = [
  {
    id: 'log-1',
    playlistId: 'pl-1',
    operationType: 'import',
    operator: '编导张三',
    timestamp: '2025-05-01T10:00:00Z',
    remark: '从「经典粤语.csv」导入 3 首歌曲',
  },
  {
    id: 'log-2',
    playlistId: 'pl-1',
    operationType: 'import',
    operator: '编导张三',
    timestamp: '2025-05-01T10:05:00Z',
    remark: '从「华语流行.xlsx」导入 7 首歌曲',
  },
  {
    id: 'log-3',
    playlistId: 'pl-1',
    operationType: 'import',
    operator: '编导张三',
    timestamp: '2025-05-01T10:10:00Z',
    remark: '从「欧美经典.csv」导入 2 首歌曲',
  },
  {
    id: 'log-4',
    playlistId: 'pl-1',
    operationType: 'update',
    songId: 's6',
    field: 'year',
    oldValue: '2007',
    newValue: '2008',
    operator: '编导张三',
    timestamp: '2025-05-02T14:30:00Z',
    remark: '确认《稻香》发行年份为2008',
  },
];
