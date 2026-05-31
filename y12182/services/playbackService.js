const db = require('../data/database');
const { PlaySession, EmotionRecord } = require('../data/models');

class PlaybackService {
  generateSessionId() {
    const count = db.playSessions.length + 1;
    return `SE${String(count).padStart(3, '0')}`;
  }

  generateEmotionId() {
    const count = db.emotionRecords.length + 1;
    return `EM${String(count).padStart(3, '0')}`;
  }

  startSession(playlistId) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`播放计划 ${playlistId} 不存在`);
    }

    const session = new PlaySession(
      this.generateSessionId(),
      playlistId,
      new Date().toISOString(),
      null,
      'playing',
      [],
      []
    );

    db.addPlaySession(session);
    console.log(`播放会话 ${session.id} 已开始，播放计划: ${playlistId}`);

    return session;
  }

  recordEmotion(sessionId, trackId, emotion, intensity, notes = '') {
    const session = db.playSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`播放会话 ${sessionId} 不存在`);
    }

    const emotionRecord = new EmotionRecord(
      this.generateEmotionId(),
      session.playlistId,
      trackId,
      emotion,
      intensity,
      new Date().toISOString(),
      notes
    );

    db.addEmotionRecord(emotionRecord);
    session.emotionRecords.push(emotionRecord.id);

    const intensityNum = parseInt(intensity);
    if (emotion === '烦躁' && intensityNum >= 8) {
      session.issues.push({
        type: 'emotion_sudden_change',
        severity: 'high',
        message: `曲目 ${trackId} 播放时患者情绪突变: ${emotion} (强度: ${intensity})`,
        emotionRecordId: emotionRecord.id,
        timestamp: emotionRecord.timestamp
      });
      console.log(`⚠️  情绪突变警报: 曲目 ${trackId} 引发高强度${emotion}`);
    } else if (['焦虑', '悲伤', '恐惧'].includes(emotion) && intensityNum >= 7) {
      session.issues.push({
        type: 'negative_emotion',
        severity: 'medium',
        message: `曲目 ${trackId} 播放时患者出现负面情绪: ${emotion} (强度: ${intensity})`,
        emotionRecordId: emotionRecord.id,
        timestamp: emotionRecord.timestamp
      });
      console.log(`⚠️  负面情绪记录: 曲目 ${trackId} - ${emotion} (强度: ${intensity})`);
    }

    return emotionRecord;
  }

  recordRepeatPlay(sessionId, trackId, repeatCount) {
    const session = db.playSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`播放会话 ${sessionId} 不存在`);
    }

    const playlist = db.getPlaylist(session.playlistId);
    const track = playlist.tracks.find(t => t.id === trackId);
    
    if (track) {
      track.playCount += repeatCount;
    }

    if (repeatCount >= 3) {
      session.issues.push({
        type: 'excessive_repeat',
        severity: 'low',
        message: `曲目 ${trackId} 重复播放 ${repeatCount} 次，可能需要关注`,
        trackId: trackId,
        repeatCount: repeatCount,
        timestamp: new Date().toISOString()
      });
      console.log(`⚠️  重复播放提醒: 曲目 ${trackId} 已重复 ${repeatCount} 次`);
    }

    return track;
  }

  checkForbiddenDuringPlayback(playlistId, trackId) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`播放计划 ${playlistId} 不存在`);
    }

    const forbiddenTracks = db.getForbiddenTracksByPatient(playlist.patientId);
    const track = playlist.tracks.find(t => t.id === trackId);
    
    if (!track) {
      return { isForbidden: false };
    }

    const forbidden = forbiddenTracks.find(f => f.trackName === track.name);
    if (forbidden) {
      console.log(`🚨 禁忌曲目触发: ${track.name} - ${forbidden.reason}`);
      return {
        isForbidden: true,
        forbidden: forbidden,
        track: track
      };
    }

    return { isForbidden: false };
  }

  endSession(sessionId, status = 'completed') {
    const session = db.playSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`播放会话 ${sessionId} 不存在`);
    }

    session.endTime = new Date().toISOString();
    session.status = status;

    console.log(`播放会话 ${session.id} 已结束，状态: ${status}`);
    console.log(`  - 情绪记录: ${session.emotionRecords.length} 条`);
    console.log(`  - 发现问题: ${session.issues.length} 个`);

    return session;
  }

  getSessionWithDetails(sessionId) {
    const session = db.playSessions.find(s => s.id === sessionId);
    if (!session) {
      return null;
    }

    const emotionRecords = session.emotionRecords.map(id => 
      db.emotionRecords.find(e => e.id === id)
    ).filter(Boolean);

    return {
      session,
      playlist: db.getPlaylist(session.playlistId),
      emotionRecords,
      issues: session.issues
    };
  }

  simulatePlayback(playlistId, scenario = 'normal') {
    console.log(`\n========== 模拟播放开始 [${scenario}] ==========`);
    
    const session = this.startSession(playlistId);
    const playlist = db.getPlaylist(playlistId);

    const scenarios = {
      normal: {
        emotions: [
          { track: 0, emotion: '平静', intensity: 6 },
          { track: 1, emotion: '放松', intensity: 7 },
          { track: 2, emotion: '愉悦', intensity: 5 },
          { track: 3, emotion: '平静', intensity: 6 },
          { track: 4, emotion: '放松', intensity: 8 }
        ],
        repeats: {}
      },
      forbidden: {
        emotions: [
          { track: 0, emotion: '平静', intensity: 5 },
          { track: 1, emotion: '焦虑', intensity: 9, notes: '听到禁忌曲目后明显不安' }
        ],
        repeats: { 1: 1 }
      },
      emotional_sudden: {
        emotions: [
          { track: 0, emotion: '平静', intensity: 5 },
          { track: 1, emotion: '放松', intensity: 6 },
          { track: 2, emotion: '烦躁', intensity: 9, notes: '突然情绪失控，需要暂停' }
        ],
        repeats: {}
      },
      repeat_issue: {
        emotions: [
          { track: 0, emotion: '平静', intensity: 6 },
          { track: 0, emotion: '平静', intensity: 5 },
          { track: 0, emotion: '平静', intensity: 5 },
          { track: 0, emotion: '平静', intensity: 4 }
        ],
        repeats: { 0: 4 }
      }
    };

    const scenarioConfig = scenarios[scenario] || scenarios.normal;

    scenarioConfig.emotions.forEach((emotionConfig, index) => {
      const trackIndex = emotionConfig.track;
      if (trackIndex < playlist.tracks.length) {
        const track = playlist.tracks[trackIndex];
        
        const forbiddenCheck = this.checkForbiddenDuringPlayback(playlistId, track.id);
        if (forbiddenCheck.isForbidden) {
          session.issues.push({
            type: 'forbidden_during_playback',
            severity: forbiddenCheck.forbidden.severity,
            message: `播放时发现禁忌曲目: ${track.name} - ${forbiddenCheck.forbidden.reason}`,
            track: track,
            forbidden: forbiddenCheck.forbidden,
            timestamp: new Date().toISOString()
          });
        }

        this.recordEmotion(
          session.id,
          track.id,
          emotionConfig.emotion,
          emotionConfig.intensity,
          emotionConfig.notes
        );
      }
    });

    Object.entries(scenarioConfig.repeats).forEach(([trackIndex, count]) => {
      if (parseInt(trackIndex) < playlist.tracks.length) {
        this.recordRepeatPlay(session.id, playlist.tracks[parseInt(trackIndex)].id, count);
      }
    });

    const finalStatus = scenario === 'forbidden' || scenario === 'emotional_sudden' 
      ? 'interrupted' 
      : 'completed';
    
    this.endSession(session.id, finalStatus);

    console.log(`========== 模拟播放结束 ==========\n`);

    return this.getSessionWithDetails(session.id);
  }
}

module.exports = new PlaybackService();
