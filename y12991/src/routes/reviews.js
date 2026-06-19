const express = require('express');
const router = express.Router();
const reviewService = require('../services/reviewService');

router.post('/items', async (req, res) => {
  try {
    const { review_round_id, material_id, item_type, initial_conclusion, operator } = req.body;

    if (!review_round_id || !material_id || !item_type || !operator) {
      return res.status(400).json({ error: '缺少必要参数: review_round_id, material_id, item_type, operator' });
    }

    const item = await reviewService.addReviewItem(
      review_round_id,
      material_id,
      item_type,
      initial_conclusion || '',
      operator
    );

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('添加复核项失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/rounds/:roundId', async (req, res) => {
  try {
    const round = await reviewService.getReviewRound(req.params.roundId);
    if (!round) {
      return res.status(404).json({ error: '复核轮次不存在' });
    }
    res.json({ success: true, data: round });
  } catch (err) {
    console.error('查询复核轮次失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/items/:itemId', async (req, res) => {
  try {
    const item = await reviewService.getReviewItem(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: '复核项不存在' });
    }
    res.json({ success: true, data: item });
  } catch (err) {
    console.error('查询复核项失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/items/:itemId/review', async (req, res) => {
  try {
    const { conclusion, status, operator, reason } = req.body;

    if (!conclusion || !status || !operator) {
      return res.status(400).json({ error: '缺少必要参数: conclusion, status, operator' });
    }

    const item = await reviewService.reviewItem(
      req.params.itemId,
      conclusion,
      status,
      operator,
      reason || ''
    );

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('复核项目失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/items/:itemId/reevaluate', async (req, res) => {
  try {
    const { new_conclusion, operator, reason } = req.body;

    if (!new_conclusion || !operator) {
      return res.status(400).json({ error: '缺少必要参数: new_conclusion, operator' });
    }

    const item = await reviewService.reevaluateItem(
      req.params.itemId,
      new_conclusion,
      operator,
      reason || ''
    );

    res.json({ success: true, data: item });
  } catch (err) {
    console.error('重新评估复核项失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/items/:itemId/comparison', async (req, res) => {
  try {
    const comparison = await reviewService.getConclusionComparison(req.params.itemId);
    res.json({ success: true, data: comparison });
  } catch (err) {
    console.error('获取结论对比失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/rounds/:roundId/complete', async (req, res) => {
  try {
    const { conclusion_summary, operator } = req.body;

    if (!operator) {
      return res.status(400).json({ error: '缺少 operator' });
    }

    const round = await reviewService.completeReviewRound(
      req.params.roundId,
      conclusion_summary || '',
      operator
    );

    res.json({ success: true, data: round });
  } catch (err) {
    console.error('完成复核轮次失败:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/migrations/:migrationId/rounds', async (req, res) => {
  try {
    const rounds = await reviewService.getReviewRoundsByMigration(req.params.migrationId);
    res.json({ success: true, data: rounds });
  } catch (err) {
    console.error('查询复核轮次失败:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
