import type { ScenePreset } from '@/types'

export const scenes: ScenePreset[] = [
  {
    id: 'smooth',
    name: '顺利排练',
    difficulty: 1,
    description: '所有乐手按节拍整齐进入，音量均衡和谐。适合熟悉操作和了解基础流程。',
    bpm: 120,
    totalBeats: 32,
    musicians: [
      { id: 'melody', name: 'Melody-Bot', role: 'melody', defaultVolume: 80, color: '#00ff88', enterBeat: 1, exitBeat: 32 },
      { id: 'chord', name: 'Chord-Bot', role: 'chord', defaultVolume: 60, color: '#00bbff', enterBeat: 5, exitBeat: 32 },
      { id: 'bass', name: 'Bass-Bot', role: 'bass', defaultVolume: 65, color: '#bb00ff', enterBeat: 5, exitBeat: 32 },
      { id: 'percussion', name: 'Beat-Bot', role: 'percussion', defaultVolume: 70, color: '#ff6b35', enterBeat: 1, exitBeat: 32 },
    ],
    events: [],
  },
  {
    id: 'delay',
    name: '延迟进入',
    difficulty: 2,
    description: '和弦与低音乐手没有按预定节拍进入，导致声部缺失。需要用"进入"指令让延迟的乐手及时加入，或用"等待"指令重新同步。',
    bpm: 120,
    totalBeats: 32,
    musicians: [
      { id: 'melody', name: 'Melody-Bot', role: 'melody', defaultVolume: 80, color: '#00ff88', enterBeat: 1, exitBeat: 32 },
      { id: 'chord', name: 'Chord-Bot', role: 'chord', defaultVolume: 60, color: '#00bbff', enterBeat: 5, exitBeat: 32 },
      { id: 'bass', name: 'Bass-Bot', role: 'bass', defaultVolume: 65, color: '#bb00ff', enterBeat: 5, exitBeat: 32 },
      { id: 'percussion', name: 'Beat-Bot', role: 'percussion', defaultVolume: 70, color: '#ff6b35', enterBeat: 1, exitBeat: 32 },
    ],
    events: [
      { beat: 5, type: 'delay', targetMusicianId: 'chord', description: 'Chord-Bot 未按时进入，延迟2拍', data: { delayBeats: 2 } },
      { beat: 5, type: 'delay', targetMusicianId: 'bass', description: 'Bass-Bot 未按时进入，延迟4拍', data: { delayBeats: 4 } },
    ],
  },
  {
    id: 'overflow',
    name: '声部盖过主旋律',
    difficulty: 3,
    description: '打击乐和低音音量偏高，盖过了主旋律。需要调低伴奏声部音量或调高主旋律音量，恢复声部平衡。',
    bpm: 120,
    totalBeats: 32,
    musicians: [
      { id: 'melody', name: 'Melody-Bot', role: 'melody', defaultVolume: 80, color: '#00ff88', enterBeat: 1, exitBeat: 32 },
      { id: 'chord', name: 'Chord-Bot', role: 'chord', defaultVolume: 60, color: '#00bbff', enterBeat: 5, exitBeat: 32 },
      { id: 'bass', name: 'Bass-Bot', role: 'bass', defaultVolume: 65, color: '#bb00ff', enterBeat: 5, exitBeat: 32 },
      { id: 'percussion', name: 'Beat-Bot', role: 'percussion', defaultVolume: 70, color: '#ff6b35', enterBeat: 1, exitBeat: 32 },
    ],
    events: [
      { beat: 8, type: 'volume_surge', targetMusicianId: 'percussion', description: 'Beat-Bot 音量突增到95', data: { newVolume: 95 } },
      { beat: 8, type: 'volume_surge', targetMusicianId: 'bass', description: 'Bass-Bot 音量突增到90', data: { newVolume: 90 } },
    ],
  },
  {
    id: 'blockage',
    name: '队列堵塞',
    difficulty: 4,
    description: '大量指令同时排队，乐手来不及响应。需要合理安排指令发送时机和优先级，避免队列堵塞。',
    bpm: 120,
    totalBeats: 32,
    musicians: [
      { id: 'melody', name: 'Melody-Bot', role: 'melody', defaultVolume: 80, color: '#00ff88', enterBeat: 1, exitBeat: 32 },
      { id: 'chord', name: 'Chord-Bot', role: 'chord', defaultVolume: 60, color: '#00bbff', enterBeat: 5, exitBeat: 32 },
      { id: 'bass', name: 'Bass-Bot', role: 'bass', defaultVolume: 65, color: '#bb00ff', enterBeat: 5, exitBeat: 32 },
      { id: 'percussion', name: 'Beat-Bot', role: 'percussion', defaultVolume: 70, color: '#ff6b35', enterBeat: 1, exitBeat: 32 },
    ],
    events: [
      { beat: 9, type: 'queue_block', description: '系统自动注入6条拥堵指令', data: { commandCount: 6 } },
      { beat: 9, type: 'queue_block', targetMusicianId: 'chord', description: 'Chord-Bot 收到重复进入指令', data: { commandCount: 2 } },
      { beat: 9, type: 'queue_block', targetMusicianId: 'bass', description: 'Bass-Bot 收到重复音量调整', data: { commandCount: 2 } },
      { beat: 9, type: 'queue_block', targetMusicianId: 'percussion', description: 'Beat-Bot 收到重复退出/进入', data: { commandCount: 2 } },
    ],
  },
]
