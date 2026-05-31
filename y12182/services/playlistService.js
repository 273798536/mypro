const db = require('../data/database');
const { Playlist, ValidationResult, ModificationLog } = require('../data/models');

class PlaylistService {
  generatePlaylistId() {
    const count = db.playlists.length + 1;
    return `PL${String(count).padStart(3, '0')}`;
  }

  generatePlaylist(patientId, name, therapistId, preferredMoods = []) {
    const patient = db.getPatient(patientId);
    if (!patient) {
      throw new Error(`患者 ${patientId} 不存在`);
    }

    const forbiddenTracks = db.getForbiddenTracksByPatient(patientId);
    const forbiddenNames = forbiddenTracks.map(f => f.trackName);

    let candidateTracks = db.musicLibrary.filter(track => {
      if (forbiddenNames.includes(track.name)) {
        return false;
      }
      if (preferredMoods.length > 0) {
        return preferredMoods.includes(track.mood);
      }
      return true;
    });

    candidateTracks = candidateTracks.slice(0, 5);

    if (candidateTracks.length === 0) {
      candidateTracks = db.musicLibrary
        .filter(track => !forbiddenNames.includes(track.name))
        .slice(0, 5);
    }

    const tracks = candidateTracks.map((track, index) => ({
      id: track.id,
      name: track.name,
      artist: track.artist,
      duration: track.duration,
      mood: track.mood,
      order: index + 1,
      playCount: 0
    }));

    const playlist = new Playlist(
      this.generatePlaylistId(),
      patientId,
      name,
      tracks,
      therapistId,
      'draft'
    );

    db.addPlaylist(playlist);
    console.log(`播放计划 ${playlist.id} 已创建，包含 ${tracks.length} 首曲目`);

    return playlist;
  }

  validatePlaylist(playlistId) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`播放计划 ${playlistId} 不存在`);
    }

    const forbiddenTracks = db.getForbiddenTracksByPatient(playlist.patientId);
    const warnings = [];
    const errors = [];
    const forbiddenMatches = [];

    const trackNames = playlist.tracks.map(t => t.name);
    const duplicateTracks = trackNames.filter((name, index) => 
      trackNames.indexOf(name) !== index
    );
    const uniqueDuplicates = [...new Set(duplicateTracks)];
    
    if (uniqueDuplicates.length > 0) {
      warnings.push({
        type: 'duplicate',
        message: `播放列表中存在重复曲目: ${uniqueDuplicates.join(', ')}`,
        tracks: uniqueDuplicates
      });
    }

    playlist.tracks.forEach(track => {
      const forbidden = forbiddenTracks.find(f => f.trackName === track.name);
      if (forbidden) {
        forbiddenMatches.push({
          track: track,
          forbidden: forbidden
        });
        
        if (forbidden.severity === 'high') {
          errors.push({
            type: 'forbidden_high',
            message: `严重禁忌曲目: ${track.name} - ${forbidden.reason}`,
            track: track,
            forbidden: forbidden
          });
        } else {
          warnings.push({
            type: 'forbidden_medium',
            message: `中度禁忌曲目: ${track.name} - ${forbidden.reason}`,
            track: track,
            forbidden: forbidden
          });
        }
      }
    });

    const totalDuration = playlist.tracks.reduce((sum, t) => sum + t.duration, 0);
    if (totalDuration > 1800) {
      warnings.push({
        type: 'duration',
        message: `播放总时长过长: ${Math.floor(totalDuration / 60)} 分钟，建议控制在30分钟内`
      });
    }

    const validationResult = new ValidationResult(
      playlistId,
      errors.length === 0,
      warnings,
      errors,
      forbiddenMatches
    );

    db.addValidationResult(validationResult);

    console.log(`播放计划 ${playlistId} 校验结果:`);
    console.log(`  - 是否有效: ${validationResult.isValid ? '是' : '否'}`);
    console.log(`  - 警告: ${warnings.length} 条`);
    console.log(`  - 错误: ${errors.length} 条`);
    console.log(`  - 禁忌匹配: ${forbiddenMatches.length} 首`);

    return validationResult;
  }

  modifyPlaylist(playlistId, modifications, operator, reason) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`播放计划 ${playlistId} 不存在`);
    }

    const logs = [];

    modifications.forEach(mod => {
      const oldValue = JSON.stringify(playlist[mod.field] || playlist.tracks);
      
      if (mod.field === 'tracks') {
        playlist.tracks = mod.value;
      } else if (mod.field === 'name') {
        playlist.name = mod.value;
      } else if (mod.field === 'status') {
        playlist.status = mod.value;
      }

      const log = new ModificationLog(
        `LOG${db.modificationLogs.length + 1}`,
        playlistId,
        mod.field,
        oldValue,
        JSON.stringify(mod.value),
        operator,
        reason
      );

      db.addModificationLog(log);
      logs.push(log);
    });

    playlist.modifiedAt = new Date().toISOString();

    console.log(`播放计划 ${playlistId} 已修改，记录 ${logs.length} 条修改日志`);

    return { playlist, logs };
  }

  addTrackToPlaylist(playlistId, trackId, operator, reason) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`播放计划 ${playlistId} 不存在`);
    }

    const track = db.getMusicTrack(trackId);
    if (!track) {
      throw new Error(`曲目 ${trackId} 不存在`);
    }

    const newTrack = {
      id: track.id,
      name: track.name,
      artist: track.artist,
      duration: track.duration,
      mood: track.mood,
      order: playlist.tracks.length + 1,
      playCount: 0
    };

    const oldTracks = [...playlist.tracks];
    playlist.tracks.push(newTrack);

    const log = new ModificationLog(
      `LOG${db.modificationLogs.length + 1}`,
      playlistId,
      'tracks',
      JSON.stringify(oldTracks),
      JSON.stringify(playlist.tracks),
      operator,
      reason
    );

    db.addModificationLog(log);
    playlist.modifiedAt = new Date().toISOString();

    console.log(`曲目 ${track.name} 已添加到播放计划 ${playlistId}`);

    return { playlist, log };
  }

  removeTrackFromPlaylist(playlistId, trackIndex, operator, reason) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      throw new Error(`播放计划 ${playlistId} 不存在`);
    }

    if (trackIndex < 0 || trackIndex >= playlist.tracks.length) {
      throw new Error(`曲目索引 ${trackIndex} 无效`);
    }

    const oldTracks = [...playlist.tracks];
    const removedTrack = playlist.tracks.splice(trackIndex, 1)[0];

    playlist.tracks.forEach((t, i) => {
      t.order = i + 1;
    });

    const log = new ModificationLog(
      `LOG${db.modificationLogs.length + 1}`,
      playlistId,
      'tracks',
      JSON.stringify(oldTracks),
      JSON.stringify(playlist.tracks),
      operator,
      `${reason} - 移除曲目: ${removedTrack.name}`
    );

    db.addModificationLog(log);
    playlist.modifiedAt = new Date().toISOString();

    console.log(`曲目 ${removedTrack.name} 已从播放计划 ${playlistId} 移除`);

    return { playlist, log, removedTrack };
  }

  getPlaylistWithDetails(playlistId) {
    const playlist = db.getPlaylist(playlistId);
    if (!playlist) {
      return null;
    }

    return {
      playlist,
      patient: db.getPatient(playlist.patientId),
      forbiddenTracks: db.getForbiddenTracksByPatient(playlist.patientId),
      modificationLogs: db.getModificationLogsByPlaylist(playlistId),
      validationResult: db.getValidationResultByPlaylist(playlistId),
      playSessions: db.getPlaySessionsByPlaylist(playlistId)
    };
  }
}

module.exports = new PlaylistService();
