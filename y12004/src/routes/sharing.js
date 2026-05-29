const express = require('express');
const router = express.Router();
const Joi = require('joi');
const sharingService = require('../services/revenue-sharing-service');
const exportService = require('../services/export-service');

router.get('/records/:id', async (req, res) => {
  try {
    const { project_id } = req.query;
    const records = sharingService.getSharingRecords(project_id);
    const record = records.find(r => r.id === parseInt(req.params.id));
    if (!record) {
      return res.status(404).json({ success: false, error: '分账记录不存在' });
    }
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/records/:id/distributions', async (req, res) => {
  try {
    const distributions = sharingService.getInvestorDistributions(req.params.id);
    res.json({ success: true, data: distributions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/records/:id/statement', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const validFormats = ['json', 'text', 'html'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({ success: false, error: '无效的格式，可选值: json, text, html' });
    }
    const statement = exportService.generateSharingStatement(req.params.id, { format });

    if (format === 'text') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sharing-statement-${req.params.id}.txt"`);
      res.send(statement);
    } else if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(statement);
    } else {
      res.json({ success: true, data: JSON.parse(statement) });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/waterfall/calculate', async (req, res) => {
  try {
    const { total_revenue, special_fund_rate, business_tax_rate, cinema_share_rate, distribution_fee_rate } = req.query;

    if (!total_revenue) {
      return res.status(400).json({ success: false, error: '缺少总金额参数 total_revenue' });
    }

    const config = {};
    if (special_fund_rate) config.specialFundRate = parseFloat(special_fund_rate);
    if (business_tax_rate) config.businessTaxRate = parseFloat(business_tax_rate);
    if (cinema_share_rate) config.cinemaShareRate = parseFloat(cinema_share_rate);
    if (distribution_fee_rate) config.distributionFeeRate = parseFloat(distribution_fee_rate);

    const result = sharingService.calculateRevenueWaterfall(parseFloat(total_revenue), config);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        default_config: sharingService.SHARING_CONFIG,
        revenue_types: [
          { value: 'box_office', label: '院线票房' },
          { value: 'online_copyright', label: '网络版权' },
          { value: 'advertising', label: '广告收入' },
          { value: 'other', label: '其他收入' }
        ],
        cost_types: [
          { value: 'production', label: '制作成本' },
          { value: 'marketing', label: '宣发成本' },
          { value: 'distribution', label: '发行成本' },
          { value: 'other', label: '其他成本' }
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
