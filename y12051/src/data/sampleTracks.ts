import { Track } from '../types';

export const sampleTracks: Track[] = [
  {
    id: 'basic-4-4',
    name: '基础4/4拍练习',
    bpm: 90,
    difficulty: 1,
    hasDirtyData: false,
    description: '简单的四分音符练习，适合初学者熟悉游戏操作',
    notes: [
      { id: 'n1', time: 1000, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n2', time: 1667, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n3', time: 2333, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n4', time: 3000, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n5', time: 3667, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n6', time: 4333, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n7', time: 5000, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n8', time: 5667, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n9', time: 6333, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n10', time: 7000, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n11', time: 7667, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n12', time: 8333, type: 'normal', track: 4, isSyncopated: false },
    ]
  },
  {
    id: 'syncopation-intro',
    name: '切分音入门',
    bpm: 85,
    difficulty: 2,
    hasDirtyData: false,
    description: '包含基本切分音的练习曲目，注意第2、4、6小节的切分节奏',
    notes: [
      { id: 'n1', time: 1000, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n2', time: 1706, type: 'syncopated', track: 2, isSyncopated: true },
      { id: 'n3', time: 2412, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n4', time: 3118, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n5', time: 3824, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n6', time: 4530, type: 'syncopated', track: 3, isSyncopated: true },
      { id: 'n7', time: 5235, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n8', time: 5941, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n9', time: 6647, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n10', time: 7353, type: 'syncopated', track: 2, isSyncopated: true },
      { id: 'n11', time: 8059, type: 'syncopated', track: 3, isSyncopated: true },
      { id: 'n12', time: 8765, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n13', time: 9471, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n14', time: 10176, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n15', time: 10882, type: 'syncopated', track: 4, isSyncopated: true },
      { id: 'n16', time: 11588, type: 'normal', track: 3, isSyncopated: false },
    ]
  },
  {
    id: 'syncopation-challenge',
    name: '切分音挑战',
    bpm: 100,
    difficulty: 4,
    hasDirtyData: false,
    description: '高密度切分音练习，专门用于训练切分节奏感',
    notes: [
      { id: 'n1', time: 800, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n2', time: 1400, type: 'syncopated', track: 2, isSyncopated: true },
      { id: 'n3', time: 1700, type: 'syncopated', track: 1, isSyncopated: true },
      { id: 'n4', time: 2300, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n5', time: 2900, type: 'syncopated', track: 4, isSyncopated: true },
      { id: 'n6', time: 3200, type: 'syncopated', track: 2, isSyncopated: true },
      { id: 'n7', time: 3800, type: 'normal', track: 1, isSyncopated: false },
      { id: 'n8', time: 4400, type: 'syncopated', track: 3, isSyncopated: true },
      { id: 'n9', time: 4700, type: 'syncopated', track: 4, isSyncopated: true },
      { id: 'n10', time: 5300, type: 'syncopated', track: 1, isSyncopated: true },
      { id: 'n11', time: 5600, type: 'syncopated', track: 2, isSyncopated: true },
      { id: 'n12', time: 6200, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n13', time: 6800, type: 'syncopated', track: 4, isSyncopated: true },
      { id: 'n14', time: 7100, type: 'syncopated', track: 1, isSyncopated: true },
      { id: 'n15', time: 7700, type: 'syncopated', track: 2, isSyncopated: true },
      { id: 'n16', time: 8000, type: 'syncopated', track: 3, isSyncopated: true },
      { id: 'n17', time: 8600, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n18', time: 9200, type: 'normal', track: 1, isSyncopated: false },
    ]
  },
  {
    id: 'dirty-data-demo',
    name: '脏数据演示',
    bpm: 95,
    difficulty: 3,
    hasDirtyData: true,
    description: '包含备注、缺失字段和延迟音符的真实教学数据演示',
    notes: [
      { id: 'n1', time: 1000, type: 'normal', track: 1, isSyncopated: false, remark: '注意这里是开头' },
      { id: 'n2', time: 1632, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n3', time: 2263, type: 'normal', track: 3, isSyncopated: false, missingField: true, remark: '这个音符时长不确定' },
      { id: 'n4', time: 2895, type: 'normal', track: 4, isSyncopated: false },
      { id: 'n5', time: 3526, type: 'syncopated', track: 1, isSyncopated: true, delayed: true, delayAmount: 150, remark: '学生经常在这里抢拍' },
      { id: 'n6', time: 4158, type: 'normal', track: 2, isSyncopated: false },
      { id: 'n7', time: 4790, type: 'syncopated', track: 3, isSyncopated: true },
      { id: 'n8', time: 5421, type: 'normal', track: 4, isSyncopated: false, missingField: true },
      { id: 'n9', time: 6053, type: 'normal', track: 1, isSyncopated: false, remark: '回到主旋律' },
      { id: 'n10', time: 6684, type: 'syncopated', track: 2, isSyncopated: true, delayed: true, delayAmount: 200 },
      { id: 'n11', time: 7316, type: 'normal', track: 3, isSyncopated: false },
      { id: 'n12', time: 7947, type: 'normal', track: 4, isSyncopated: false, remark: '结尾稍慢' },
    ]
  },
  {
    id: 'advanced-combo',
    name: '连击训练',
    bpm: 110,
    difficulty: 4,
    hasDirtyData: false,
    description: '快速连击练习，训练持续注意力和手眼协调',
    notes: Array.from({ length: 24 }, (_, i) => ({
      id: `n${i + 1}`,
      time: 800 + i * 273,
      type: i % 5 === 2 ? 'syncopated' as const : 'normal' as const,
      track: (i % 4) + 1,
      isSyncopated: i % 5 === 2
    }))
  }
];

export function getTrackById(id: string): Track | undefined {
  return sampleTracks.find(track => track.id === id);
}

export function getTracksByDifficulty(difficulty: number): Track[] {
  return sampleTracks.filter(track => track.difficulty === difficulty);
}

export function getTracksWithSyncopation(): Track[] {
  return sampleTracks.filter(track => 
    track.notes.some(note => note.isSyncopated)
  );
}

export function getTracksWithDirtyData(): Track[] {
  return sampleTracks.filter(track => track.hasDirtyData);
}
