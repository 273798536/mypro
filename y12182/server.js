const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./data/database');
const playlistService = require('./services/playlistService');
const playbackService = require('./services/playbackService');
const reportService = require('./services/reportService');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

db.loadSampleData();

app.get('/api/patients', (req, res) => {
  res.json(db.patients);
});

app.get('/api/patients/:id', (req, res) => {
  const patient = db.getPatient(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: '患者不存在' });
  }
  res.json({
    patient,
    sleepScores: db.getSleepScoresByPatient(req.params.id),
    forbiddenTracks: db.getForbiddenTracksByPatient(req.params.id),
    playlists: db.getPlaylistsByPatient(req.params.id)
  });
});

app.get('/api/sleep-scores/:patientId', (req, res) => {
  res.json(db.getSleepScoresByPatient(req.params.patientId));
});

app.get('/api/forbidden-tracks/:patientId', (req, res) => {
  res.json(db.getForbiddenTracksByPatient(req.params.patientId));
});

app.get('/api/music-library', (req, res) => {
  res.json(db.musicLibrary);
});

app.post('/api/playlists', (req, res) => {
  try {
    const { patientId, name, therapistId, preferredMoods } = req.body;
    const playlist = playlistService.generatePlaylist(patientId, name, therapistId, preferredMoods);
    res.json(playlist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/playlists/:id', (req, res) => {
  const details = playlistService.getPlaylistWithDetails(req.params.id);
  if (!details) {
    return res.status(404).json({ error: '播放计划不存在' });
  }
  res.json(details);
});

app.get('/api/playlists', (req, res) => {
  res.json(db.playlists);
});

app.post('/api/playlists/:id/validate', (req, res) => {
  try {
    const result = playlistService.validatePlaylist(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playlists/:id/modify', (req, res) => {
  try {
    const { modifications, operator, reason } = req.body;
    const result = playlistService.modifyPlaylist(req.params.id, modifications, operator, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playlists/:id/add-track', (req, res) => {
  try {
    const { trackId, operator, reason } = req.body;
    const result = playlistService.addTrackToPlaylist(req.params.id, trackId, operator, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playlists/:id/remove-track', (req, res) => {
  try {
    const { trackIndex, operator, reason } = req.body;
    const result = playlistService.removeTrackFromPlaylist(req.params.id, trackIndex, operator, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playback/start', (req, res) => {
  try {
    const { playlistId } = req.body;
    const session = playbackService.startSession(playlistId);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playback/emotion', (req, res) => {
  try {
    const { sessionId, trackId, emotion, intensity, notes } = req.body;
    const record = playbackService.recordEmotion(sessionId, trackId, emotion, intensity, notes);
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playback/end', (req, res) => {
  try {
    const { sessionId, status } = req.body;
    const session = playbackService.endSession(sessionId, status);
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/playback/simulate', (req, res) => {
  try {
    const { playlistId, scenario } = req.body;
    const result = playbackService.simulatePlayback(playlistId, scenario);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/sessions/:id', (req, res) => {
  const details = playbackService.getSessionWithDetails(req.params.id);
  if (!details) {
    return res.status(404).json({ error: '会话不存在' });
  }
  res.json(details);
});

app.post('/api/reports', (req, res) => {
  try {
    const { sessionId } = req.body;
    const report = reportService.generateReport(sessionId);
    res.json(report);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reports/:id', (req, res) => {
  const report = db.getReport(req.params.id);
  if (!report) {
    return res.status(404).json({ error: '报告不存在' });
  }
  res.json(report);
});

app.get('/api/reports', (req, res) => {
  res.json(db.reports);
});

app.get('/api/reports/:id/download', (req, res) => {
  try {
    const result = reportService.downloadReport(req.params.id);
    res.download(result.filePath, result.fileName);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reports/:id/text', (req, res) => {
  try {
    const content = reportService.exportReportToText(req.params.id);
    res.json({ content });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/trace/:type/:id', (req, res) => {
  try {
    const info = reportService.getTraceabilityInfo(req.params.id, req.params.type);
    if (!info) {
      return res.status(404).json({ error: '未找到相关信息' });
    }
    res.json(info);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/modifications/:playlistId', (req, res) => {
  res.json(db.getModificationLogsByPlaylist(req.params.playlistId));
});

app.get('/api/validation/:playlistId', (req, res) => {
  const result = db.getValidationResultByPlaylist(req.params.playlistId);
  res.json(result || null);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🚀 音乐疗愈播放计划系统已启动`);
  console.log(`📍 服务器地址: http://localhost:${PORT}`);
  console.log(`📊 前端界面: http://localhost:${PORT}/index.html\n`);
});

module.exports = app;
