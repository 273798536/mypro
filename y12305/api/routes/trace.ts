import express from 'express';
import { TraceService } from '../services/TraceService.js';

const router = express.Router();
const traceService = new TraceService();

router.get('/:versionId', (req, res) => {
  try {
    const result = traceService.getTraceTree(req.params.versionId);
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json({ traceTree: result });
  } catch (error) {
    res.status(500).json({ error: '获取溯源树失败' });
  }
});

router.get('/:versionId/sources', (req, res) => {
  try {
    const result = traceService.getVersionWithSources(req.params.versionId);
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取来源数据失败' });
  }
});

router.get('/:versionId/warnings', (req, res) => {
  try {
    const result = traceService.getWarningsByVersion(req.params.versionId);
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取警告信息失败' });
  }
});

router.get('/:versionId/warnings/:traceId/source', (req, res) => {
  try {
    const result = traceService.getSourceDataForWarning(
      req.params.versionId,
      req.params.traceId
    );
    if ('error' in result) {
      res.status(404).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '获取警告来源失败' });
  }
});

router.post('/:versionId/find-node', (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) {
      res.status(400).json({ error: '请提供 nodeId' });
      return;
    }

    const treeResult = traceService.getTraceTree(req.params.versionId);
    if ('error' in treeResult) {
      res.status(404).json({ error: treeResult.error });
      return;
    }

    const node = traceService.findTraceNode(treeResult, nodeId);
    if (!node) {
      res.status(404).json({ error: '未找到节点' });
      return;
    }

    const path = traceService.getTracePath(treeResult, nodeId);

    res.json({
      node,
      path,
    });
  } catch (error) {
    res.status(500).json({ error: '查找节点失败' });
  }
});

export default router;
