import { create } from 'zustand';
import { Playlist, Conflict, Version, Correction, PlaylistItem, ReportData, TraceNode } from '../types';
import { mockPlaylist, mockConflicts, mockVersions, mockCorrections, mockSongs } from '../data/mockData';

interface PlaylistState {
  currentPlaylist: Playlist | null;
  conflicts: Conflict[];
  versions: Version[];
  corrections: Correction[];
  selectedConflict: Conflict | null;
  activeTab: 'overview' | 'conflicts' | 'versions' | 'report';
  
  setCurrentPlaylist: (playlist: Playlist) => void;
  setSelectedConflict: (conflict: Conflict | null) => void;
  setActiveTab: (tab: 'overview' | 'conflicts' | 'versions' | 'report') => void;
  resolveConflict: (conflictId: string, resolution: string) => void;
  addCorrection: (conflictId: string, content: string, type: 'resolve' | 'note' | 'reorder') => void;
  saveVersion: (notes: string) => void;
  detectConflicts: () => void;
  generateReport: () => ReportData;
  getTraceChain: (conflict: Conflict) => TraceNode[];
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  currentPlaylist: mockPlaylist,
  conflicts: mockConflicts,
  versions: mockVersions,
  corrections: mockCorrections,
  selectedConflict: null,
  activeTab: 'overview',

  setCurrentPlaylist: (playlist) => set({ currentPlaylist: playlist }),
  
  setSelectedConflict: (conflict) => set({ selectedConflict: conflict }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  resolveConflict: (conflictId, resolution) => {
    set((state) => ({
      conflicts: state.conflicts.map((c) =>
        c.id === conflictId ? { ...c, resolved: true, resolution } : c
      ),
    }));
  },
  
  addCorrection: (conflictId, content, type) => {
    const newCorrection: Correction = {
      id: `corr_${Date.now()}`,
      conflictId,
      type,
      content,
      createdAt: new Date().toISOString(),
      createdBy: '当前用户',
    };
    set((state) => ({
      corrections: [...state.corrections, newCorrection],
    }));
  },
  
  saveVersion: (notes) => {
    const state = get();
    const lastVersion = state.versions[state.versions.length - 1];
    const newVersionNumber = `v${parseFloat(lastVersion.versionNumber.slice(1)) + 0.1}`.slice(0, 4);
    
    const newVersion: Version = {
      id: `v_${Date.now()}`,
      playlistId: state.currentPlaylist?.id || '',
      versionNumber: newVersionNumber,
      parentVersionId: lastVersion.id,
      createdAt: new Date().toISOString(),
      modifiedBy: '当前用户',
      changes: [{ type: 'modify', description: '保存新版本' }],
      notes,
    };
    
    set((state) => ({
      versions: [...state.versions, newVersion],
    }));
  },
  
  detectConflicts: () => {
    const state = get();
    const items = state.currentPlaylist?.items || [];
    const newConflicts: Conflict[] = [];
    
    let artistRepeatGroup: PlaylistItem[] = [];
    items.forEach((item, index) => {
      const song = mockSongs.find(s => s.id === item.songId);
      if (!song) return;
      
      if (artistRepeatGroup.length === 0 || 
          mockSongs.find(s => s.id === artistRepeatGroup[artistRepeatGroup.length - 1].songId)?.artist === song.artist) {
        artistRepeatGroup.push(item);
      } else {
        if (artistRepeatGroup.length >= 3) {
          newConflicts.push({
            id: `c_artist_${Date.now()}_${index}`,
            playlistId: state.currentPlaylist?.id || '',
            type: 'artist_repeat',
            severity: 'high',
            position: artistRepeatGroup[0].position,
            relatedItemIds: artistRepeatGroup.map(i => i.id),
            triggeredBy: { source: '自动检测', material: '歌单分析', timestamp: new Date().toISOString() },
            constraintRule: { id: 'cr1', name: '同艺人连播限制', description: '同一艺人不能连续播放超过2首', threshold: 2 },
            detectionAlgorithm: { name: '连续艺人检测', version: 'v1.0', parameters: {} },
            resolved: false,
          });
        }
        artistRepeatGroup = [item];
      }
    });
    
    const windowSize = 5;
    for (let i = 0; i <= items.length - windowSize; i++) {
      const window = items.slice(i, i + windowSize);
      const newSongCount = window.filter(item => {
        const song = mockSongs.find(s => s.id === item.songId);
        return song?.isNew;
      }).length;
      
      if (newSongCount > 2) {
        newConflicts.push({
          id: `c_new_${Date.now()}_${i}`,
          playlistId: state.currentPlaylist?.id || '',
          type: 'new_song_dense',
          severity: 'medium',
          position: i,
          relatedItemIds: window.map(item => item.id),
          triggeredBy: { source: '自动检测', material: '新歌密度分析', timestamp: new Date().toISOString() },
          constraintRule: { id: 'cr2', name: '新歌密度控制', description: '每5首歌中新歌不超过2首', threshold: 2 },
          detectionAlgorithm: { name: '滑动窗口新歌检测', version: 'v1.0', parameters: { windowSize } },
          resolved: false,
        });
      }
    }
    
    set({ conflicts: newConflicts });
  },
  
  generateReport: () => {
    const state = get();
    const conflicts = state.conflicts;
    
    const artistRepeatCount = conflicts.filter(c => c.type === 'artist_repeat').length;
    const adClashCount = conflicts.filter(c => c.type === 'ad_clash').length;
    const newSongDenseCount = conflicts.filter(c => c.type === 'new_song_dense').length;
    const resolvedCount = conflicts.filter(c => c.resolved).length;
    const totalConstraints = 3;
    const metConstraints = totalConstraints - (artistRepeatCount > 0 ? 1 : 0) - (newSongDenseCount > 0 ? 1 : 0) - (adClashCount > 0 && !conflicts.find(c => c.type === 'ad_clash')?.resolved ? 1 : 0);
    
    return {
      summary: {
        totalSongs: state.currentPlaylist?.items.length || 0,
        totalConflicts: conflicts.length,
        resolvedConflicts: resolvedCount,
        artistRepeatCount,
        adClashCount,
        newSongDenseCount,
        constraintSatisfactionRate: Math.round((metConstraints / totalConstraints) * 100),
      },
      constraints: [
        {
          id: 'cr1',
          name: '同艺人连播限制',
          description: '同一艺人的歌曲在15分钟内不能连续播放超过2首',
          triggeredCount: artistRepeatCount,
          threshold: 2,
          met: artistRepeatCount === 0,
        },
        {
          id: 'cr2',
          name: '新歌密度控制',
          description: '每5首歌中新歌数量不能超过2首',
          triggeredCount: newSongDenseCount,
          threshold: 2,
          met: newSongDenseCount === 0,
        },
        {
          id: 'cr3',
          name: '广告前后歌曲主题匹配',
          description: '广告前后歌曲主题应与广告内容相关',
          triggeredCount: adClashCount,
          threshold: 0.6,
          met: adClashCount === 0 || conflicts.find(c => c.type === 'ad_clash')?.resolved === true,
        },
      ],
      conflicts: conflicts.map(c => ({
        id: c.id,
        type: c.type,
        severity: c.severity,
        position: c.position,
        description: c.constraintRule.description,
        triggeredBy: c.triggeredBy.material,
        resolution: c.resolution,
      })),
      recommendations: [
        artistRepeatCount > 0 ? '建议将周杰伦的三首经典歌曲分散到不同时段播放，可考虑在每首之间插入其他艺人的歌曲' : '同艺人连播控制良好',
        newSongDenseCount > 0 ? '新歌推广时段过于集中，建议将5首新歌分散到整个节目时段，保持每5首歌中不超过2首新歌' : '新歌密度控制良好',
        '建议建立歌单编排预审流程，在发布前自动检测潜在冲突',
        '可考虑引入AI辅助排歌功能，根据历史数据自动优化歌单顺序',
      ],
    };
  },
  
  getTraceChain: (conflict: Conflict): TraceNode[] => {
    return [
      {
        id: 'node1',
        type: 'material',
        title: '触发材料',
        description: conflict.triggeredBy.source,
        details: {
          文件名: conflict.triggeredBy.material,
          导入时间: conflict.triggeredBy.timestamp,
        },
        expanded: true,
      },
      {
        id: 'node2',
        type: 'constraint',
        title: '约束规则',
        description: conflict.constraintRule.name,
        details: {
          规则描述: conflict.constraintRule.description,
          阈值设置: conflict.constraintRule.threshold,
          规则ID: conflict.constraintRule.id,
        },
        expanded: true,
      },
      {
        id: 'node3',
        type: 'algorithm',
        title: '检测算法',
        description: conflict.detectionAlgorithm.name,
        details: {
          算法版本: conflict.detectionAlgorithm.version,
          参数设置: JSON.stringify(conflict.detectionAlgorithm.parameters, null, 2),
        },
        expanded: true,
      },
      {
        id: 'node4',
        type: 'result',
        title: '冲突提示',
        description: `检测到 ${conflict.type === 'artist_repeat' ? '同艺人连播' : conflict.type === 'new_song_dense' ? '新歌过密' : '广告撞歌'}`,
        details: {
          冲突类型: conflict.type,
          严重程度: conflict.severity,
          涉及歌单数: conflict.relatedItemIds.length,
          位置: `第 ${conflict.position + 1} 首歌附近`,
        },
        expanded: true,
      },
    ];
  },
}));
