const {
  Patient,
  SleepScore,
  ForbiddenTrack,
  Playlist,
  ModificationLog,
  EmotionRecord,
  PlaySession,
  ValidationResult,
  Report
} = require('./models');

class Database {
  constructor() {
    this.patients = [];
    this.sleepScores = [];
    this.forbiddenTracks = [];
    this.playlists = [];
    this.modificationLogs = [];
    this.emotionRecords = [];
    this.playSessions = [];
    this.validationResults = [];
    this.reports = [];
    this.musicLibrary = [];
  }

  loadSampleData() {
    this.musicLibrary = [
      { id: 'M001', name: '月光奏鸣曲', artist: '贝多芬', genre: '古典', duration: 360, mood: '平静' },
      { id: 'M002', name: '致爱丽丝', artist: '贝多芬', genre: '古典', duration: 180, mood: '温柔' },
      { id: 'M003', name: '蓝色多瑙河', artist: '施特劳斯', genre: '古典', duration: 480, mood: '欢快' },
      { id: 'M004', name: '命运交响曲', artist: '贝多芬', genre: '古典', duration: 600, mood: '激昂' },
      { id: 'M005', name: '小夜曲', artist: '莫扎特', genre: '古典', duration: 240, mood: '平静' },
      { id: 'M006', name: '安魂曲', artist: '莫扎特', genre: '古典', duration: 540, mood: '悲伤' },
      { id: 'M007', name: '春之歌', artist: '门德尔松', genre: '古典', duration: 300, mood: '愉悦' },
      { id: 'M008', name: '天鹅湖', artist: '柴可夫斯基', genre: '古典', duration: 420, mood: '忧郁' },
      { id: 'M009', name: '欢乐颂', artist: '贝多芬', genre: '古典', duration: 360, mood: '欢快' },
      { id: 'M010', name: '梦幻曲', artist: '舒曼', genre: '古典', duration: 210, mood: '梦幻' }
    ];

    this.patients = [
      new Patient('P001', '张明', 45, '男', '抑郁症伴随睡眠障碍', '患者因工作压力导致抑郁，伴有严重失眠，对激昂音乐敏感'),
      new Patient('P002', '李华', 32, '女', '焦虑症', '患者有创伤后应激，需避免特定节奏的音乐'),
      new Patient('P003', '王芳', 58, '女', '老年痴呆早期', '患者对年轻时熟悉的音乐反应较好')
    ];

    this.sleepScores = [
      new SleepScore('S001', 'P001', '2024-01-15', 45, 15, 30, 10, 45, '入睡困难，夜间觉醒3次'),
      new SleepScore('S002', 'P001', '2024-01-16', 52, 18, 34, 12, 36, '较前一日略有改善'),
      new SleepScore('S003', 'P001', '2024-01-17', 48, 16, 32, 11, 41, '情绪波动影响睡眠'),
      new SleepScore('S004', 'P002', '2024-01-15', 62, 28, 34, 8, 30, '睡眠质量一般'),
      new SleepScore('S005', 'P002', '2024-01-16', 58, 25, 33, 9, 33, '焦虑导致入睡延迟'),
      new SleepScore('S006', 'P003', '2024-01-15', 72, 35, 37, 10, 18, '睡眠质量较好')
    ];

    this.forbiddenTracks = [
      new ForbiddenTrack('F001', 'P001', '命运交响曲', '贝多芬', '节奏过于激昂，会引发患者焦虑和情绪波动', 'high'),
      new ForbiddenTrack('F002', 'P001', '安魂曲', '莫扎特', '旋律过于悲伤，可能加重抑郁情绪', 'medium'),
      new ForbiddenTrack('F003', 'P002', '蓝色多瑙河', '施特劳斯', '3/4拍节奏与创伤经历相关联', 'high'),
      new ForbiddenTrack('F004', 'P002', '天鹅湖', '柴可夫斯基', '旋律会唤起负面记忆', 'medium')
    ];

    console.log('样例数据加载完成');
    console.log(`- 患者档案: ${this.patients.length} 条`);
    console.log(`- 睡眠评分记录: ${this.sleepScores.length} 条`);
    console.log(`- 禁忌曲目: ${this.forbiddenTracks.length} 条`);
    console.log(`- 音乐库: ${this.musicLibrary.length} 首`);
  }

  addPatient(patient) {
    this.patients.push(patient);
    return patient;
  }

  addSleepScore(score) {
    this.sleepScores.push(score);
    return score;
  }

  addForbiddenTrack(track) {
    this.forbiddenTracks.push(track);
    return track;
  }

  addPlaylist(playlist) {
    this.playlists.push(playlist);
    return playlist;
  }

  addModificationLog(log) {
    this.modificationLogs.push(log);
    return log;
  }

  addEmotionRecord(record) {
    this.emotionRecords.push(record);
    return record;
  }

  addPlaySession(session) {
    this.playSessions.push(session);
    return session;
  }

  addValidationResult(result) {
    this.validationResults.push(result);
    return result;
  }

  addReport(report) {
    this.reports.push(report);
    return report;
  }

  getPatient(id) {
    return this.patients.find(p => p.id === id);
  }

  getSleepScoresByPatient(patientId) {
    return this.sleepScores.filter(s => s.patientId === patientId);
  }

  getForbiddenTracksByPatient(patientId) {
    return this.forbiddenTracks.filter(f => f.patientId === patientId);
  }

  getPlaylistsByPatient(patientId) {
    return this.playlists.filter(p => p.patientId === patientId);
  }

  getPlaylist(id) {
    return this.playlists.find(p => p.id === id);
  }

  getModificationLogsByPlaylist(playlistId) {
    return this.modificationLogs.filter(m => m.playlistId === playlistId);
  }

  getPlaySessionsByPlaylist(playlistId) {
    return this.playSessions.filter(s => s.playlistId === playlistId);
  }

  getValidationResultByPlaylist(playlistId) {
    return this.validationResults.find(r => r.playlistId === playlistId);
  }

  getReport(id) {
    return this.reports.find(r => r.id === id);
  }

  getReportsByPatient(patientId) {
    return this.reports.filter(r => r.patientId === patientId);
  }

  getMusicTrack(id) {
    return this.musicLibrary.find(m => m.id === id);
  }
}

const db = new Database();
module.exports = db;
