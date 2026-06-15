import express from 'express';
import cors from 'cors';
import * as archiveService from './services/archiveService';
import * as dataStore from './store/dataStore';
import { RejudgeRequest, AuthorizationRequest } from './types';
import path from 'path';
import { loadSeedData } from './seed';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/stage-records', (req, res) => {
  res.json(dataStore.getStageRecords());
});

app.get('/api/track-items', (req, res) => {
  res.json(dataStore.getTrackItems());
});

app.get('/api/archive-items', (req, res) => {
  res.json(dataStore.getArchiveItems());
});

app.get('/api/archive-items/:id', (req, res) => {
  const item = dataStore.getArchiveItemById(req.params.id);
  if (!item) return res.status(404).json({ error: '未找到该条目' });
  res.json(item);
});

app.get('/api/archive-items/:id/history', (req, res) => {
  const history = archiveService.getItemHistory(req.params.id);
  if (!history) return res.status(404).json({ error: '未找到该条目' });
  res.json(history);
});

app.get('/api/summary', (req, res) => {
  res.json(archiveService.getIssueSummary());
});

app.post('/api/auto-align', (req, res) => {
  const result = archiveService.runAutoAlign();
  res.json({
    success: true,
    message: `自动对齐完成，共处理 ${result.length} 条记录`,
    data: result,
  });
});

app.post('/api/rejudge', (req, res) => {
  try {
    const request = req.body as RejudgeRequest;
    if (!request.archiveItemId || !request.operator || !request.reason) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const result = archiveService.rejudgeItem(request);
    if (!result) return res.status(404).json({ error: '未找到该条目' });
    res.json({
      success: true,
      message: '改判成功',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '改判失败' });
  }
});

app.post('/api/authorize', (req, res) => {
  try {
    const request = req.body as AuthorizationRequest;
    if (!request.archiveItemId || !request.authorizer || !request.note || !request.alignmentDecision) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const result = archiveService.authorizeItem(request);
    if (!result) return res.status(404).json({ error: '未找到该条目' });
    res.json({
      success: true,
      message: '授权成功，文件-曲目-清单已重新对齐',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '授权失败' });
  }
});

app.post('/api/archive/:id', (req, res) => {
  try {
    const { operator } = req.body;
    const result = archiveService.archiveItem(req.params.id, operator || 'system');
    if (!result) return res.status(404).json({ error: '未找到该条目' });
    res.json({
      success: true,
      message: '归档成功',
      data: result,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : '归档失败' });
  }
});

loadSeedData();
console.log('');
console.log('=== 试跑数据已就绪 ===');
console.log('包含: 1条正常匹配 / 1条文件名不匹配 / 1条时码偏半拍 / 1条晚到附件 / 1条双重不匹配');
console.log('');

app.listen(PORT, () => {
  console.log(`播客片头清单归档系统已启动: http://localhost:${PORT}`);
});
