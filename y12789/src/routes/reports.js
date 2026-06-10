const express = require('express');
const router = express.Router();
const reportService = require('../services/reportService');

router.get('/conversion/:id', (req, res) => {
  try {
    const report = reportService.generateReport(req.params.id);
    const format = req.query.format || 'json';

    if (format === 'json') {
      res.json({ code: 0, data: report });
    } else if (format === 'text') {
      const text = formatTextReport(report);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${report.report_id}.txt"`);
      res.send(text);
    } else {
      res.status(400).json({ code: 1, message: '不支持的导出格式' });
    }
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

router.get('/monthly', (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const report = reportService.generateMonthlyHandoverReport(year, month);
    res.json({ code: 0, data: report });
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message });
  }
});

function formatTextReport(report) {
  const lines = [];
  lines.push('========================================');
  lines.push(report.report_title);
  lines.push('========================================');
  lines.push(`报告编号: ${report.report_id}`);
  lines.push(`生成时间: ${report.generated_at}`);
  lines.push(`状态: ${report.status}`);
  lines.push(`是否可用: ${report.is_usable ? '是' : '否'}`);
  lines.push('');

  lines.push('--- 样品信息 ---');
  lines.push(`样品编号: ${report.sample_info.sample_no}`);
  lines.push(`采样点: ${report.sample_info.sampling_point || '-'}`);
  lines.push(`采样时间: ${report.sample_info.sampling_time || '-'}`);
  lines.push(`温度: ${report.sample_info.temperature !== null ? report.sample_info.temperature + ' °C' : '-'}`);
  lines.push(`pH: ${report.sample_info.ph !== null ? report.sample_info.ph : '-'}`);
  lines.push(`电导率: ${report.sample_info.conductivity !== null ? report.sample_info.conductivity + ' mS/cm' : '-'}`);
  if (report.sample_info.manual_remark) {
    lines.push(`人工备注: ${report.sample_info.manual_remark}`);
  }
  lines.push('');

  lines.push('--- 换算结果 ---');
  lines.push(`盐度: ${report.conversion_result.salinity !== null ? report.conversion_result.salinity + ' ‰' : '-'}`);
  lines.push(`计算方法: ${report.conversion_result.calculation_method || '-'}`);
  lines.push(`称量精度: ${report.conversion_result.weighing_precision !== null ? report.conversion_result.weighing_precision + ' g' : '-'}`);
  lines.push(`称量精度是否达标: ${report.conversion_result.weighing_precision_pass ? '是' : '否'}`);
  lines.push('');

  if (report.block_reasons && report.block_reasons.length > 0) {
    lines.push('========================================');
    lines.push('【重要】不可用原因说明');
    lines.push('========================================');
    for (const reason of report.block_reasons) {
      lines.push('');
      lines.push(`■ ${reason.title}`);
      lines.push(`   ${reason.detail}`);
      lines.push('');
      if (reason.explanation) {
        if (reason.explanation.what_is_weighing_precision) {
          lines.push(`   什么是称量精度: ${reason.explanation.what_is_weighing_precision}`);
        }
        if (reason.explanation.current_value) {
          lines.push(`   当前值: ${reason.explanation.current_value}`);
        }
        if (reason.explanation.required_value) {
          lines.push(`   要求值: ${reason.explanation.required_value}`);
        }
        if (reason.explanation.why_it_matters) {
          lines.push('   为什么重要:');
          reason.explanation.why_it_matters.forEach((item, i) => {
            lines.push(`     ${i + 1}. ${item}`);
          });
        }
        if (reason.explanation.what_happens_when_insufficient) {
          lines.push('   精度不足的后果:');
          reason.explanation.what_happens_when_insufficient.forEach((item, i) => {
            lines.push(`     ${i + 1}. ${item}`);
          });
        }
        if (reason.explanation.how_to_fix) {
          lines.push('   如何解决:');
          reason.explanation.how_to_fix.forEach((item, i) => {
            lines.push(`     ${i + 1}. ${item}`);
          });
        }
      }
    }
    lines.push('');
  }

  if (report.review_history && report.review_history.length > 0) {
    lines.push('--- 复核历史 ---');
    for (const r of report.review_history) {
      lines.push(`复核人: ${r.reviewer || '-'} | 结果: ${r.result} | 时间: ${r.time}`);
      if (r.opinion) {
        lines.push(`意见: ${r.opinion}`);
      }
    }
    lines.push('');
  }

  if (report.operation_trace && report.operation_trace.length > 0) {
    lines.push('--- 操作痕迹 ---');
    for (const log of report.operation_trace) {
      lines.push(`[${log.time}] ${log.operation} - ${log.operator || 'system'}: ${log.detail || ''}`);
    }
    lines.push('');
  }

  lines.push('========================================');
  lines.push('报告结束');
  lines.push('========================================');

  return lines.join('\n');
}

module.exports = router;
