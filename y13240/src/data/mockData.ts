import { StallRecord, Version, Comment, Screenshot, AppState } from '@/types';

const now = new Date();
const futureDate = new Date(now);
futureDate.setDate(futureDate.getDate() + 30);

const pastDate = new Date(now);
pastDate.setDate(pastDate.getDate() - 10);

const soonDate = new Date(now);
soonDate.setDate(soonDate.getDate() + 3);

export const mockRecords: StallRecord[] = [
  {
    id: 'record-a01',
    stallNumber: 'A01',
    status: 'pending',
    currentVersionId: 'version-a01-v2',
    createdAt: pastDate.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: 'record-b03',
    stallNumber: 'B03',
    status: 'annotated',
    currentVersionId: 'version-b03-v1',
    latestCommentId: 'comment-b03-2',
    createdAt: pastDate.toISOString(),
    updatedAt: pastDate.toISOString(),
  },
  {
    id: 'record-c02',
    stallNumber: 'C02',
    status: 'withdrawn',
    currentVersionId: 'version-c02-v1',
    createdAt: pastDate.toISOString(),
    updatedAt: pastDate.toISOString(),
  },
];

export const mockVersions: Version[] = [
  {
    id: 'version-a01-v1',
    recordId: 'record-a01',
    versionNumber: 1,
    audioFileName: '摊位A01_开场音乐_2024版.mp3',
    audioRemark: '版权方：环球音乐，授权至2025-12-31，仅限音乐节使用',
    authorizationDate: futureDate.toISOString().split('T')[0],
    importSource: '首次导入',
    importedBy: '张老师',
    importedAt: pastDate.toISOString(),
    changeDescription: '首次提交音频材料',
  },
  {
    id: 'version-a01-v2',
    recordId: 'record-a01',
    versionNumber: 2,
    audioFileName: '摊位A01_开场音乐_2024修正版.mp3',
    audioRemark: '版权方：环球音乐，授权至2025-12-31，仅限音乐节使用，已调整音量',
    authorizationDate: futureDate.toISOString().split('T')[0],
    importSource: '补充导入',
    importedBy: '李助理',
    importedAt: now.toISOString(),
    changeDescription: '修正音频音量，更新备注信息',
  },
  {
    id: 'version-b03-v1',
    recordId: 'record-b03',
    versionNumber: 1,
    audioFileName: '摊位B03_背景音乐合集.wav',
    audioRemark: '版权方：索尼音乐，授权至2025-06-18，含3首曲目',
    authorizationDate: soonDate.toISOString().split('T')[0],
    importSource: '首次导入',
    importedBy: '王老师',
    importedAt: pastDate.toISOString(),
    changeDescription: '首次提交音频材料',
  },
  {
    id: 'version-c02-v1',
    recordId: 'record-c02',
    versionNumber: 1,
    audioFileName: '摊位C02_互动音效.mp3',
    audioRemark: '版权方：华纳音乐，授权至2025-01-15，游戏互动专用',
    authorizationDate: pastDate.toISOString().split('T')[0],
    importSource: '首次导入',
    importedBy: '赵老师',
    importedAt: pastDate.toISOString(),
    changeDescription: '首次提交音频材料',
  },
];

export const mockComments: Comment[] = [
  {
    id: 'comment-b03-1',
    recordId: 'record-b03',
    versionId: 'version-b03-v1',
    content: '音频质量良好，授权期限确认无误，可以通过。',
    author: '林姐',
    createdAt: pastDate.toISOString(),
    type: 'normal',
  },
  {
    id: 'comment-b03-2',
    recordId: 'record-b03',
    versionId: 'version-b03-v1',
    content: '注意：授权期限将在3天后到期，请联系版权方续期或更换曲目。',
    author: '林姐',
    createdAt: pastDate.toISOString(),
    type: 'override',
  },
  {
    id: 'comment-c02-1',
    recordId: 'record-c02',
    versionId: 'version-c02-v1',
    content: '授权已过期，需要重新申请授权。已通知主办方处理。',
    author: '林姐',
    createdAt: pastDate.toISOString(),
    type: 'normal',
  },
];

export const mockScreenshots: Screenshot[] = [
  {
    id: 'screenshot-c02-1',
    recordId: 'record-c02',
    versionId: 'version-c02-v1',
    dataUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSIjMzc0MTUxIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj7lsI/nmoTnrb7mnJ/np5Dov5nmmK/mlofmnIc8L3RleHQ+PC9zdmc+',
    description: '版权过期邮件截图，已通知主办方',
    uploadedAt: pastDate.toISOString(),
  },
];

export const getInitialState = (): AppState => ({
  records: mockRecords,
  versions: mockVersions,
  comments: mockComments,
  screenshots: mockScreenshots,
  exportLogs: [],
  filters: {},
});
