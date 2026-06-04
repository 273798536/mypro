const { Parser } = require('json2csv');
const db = require('./db');
const services = require('./services');

async function exportReviewData(batchNo = null) {
  const annotations = await services.getAnnotationList(batchNo ? { batch_no: batchNo } : {});
  const summary = await services.getReviewSummary();
  
  const exportData = [];
  
  for (const ann of annotations) {
    const trace = await services.getAnnotationWithTrace(ann.id);
    
    exportData.push({
      '标注ID': ann.id,
      '批次号': ann.batch_no,
      '图片ID': ann.image_id,
      '异常类型': ann.anomaly_type,
      '异常描述': ann.anomaly_desc,
      '坐标X': ann.coordinate_x,
      '坐标Y': ann.coordinate_y,
      '缩放级别': ann.zoom_level,
      '平移X偏移': ann.pan_offset_x,
      '平移Y偏移': ann.pan_offset_y,
      '标注人员': ann.operator,
      '标注时间': ann.operate_time,
      '来源文件': ann.source_file,
      '状态': translateStatus(ann.status),
      '复核结果': translateStatus(ann.review_result),
      '复核评分': ann.score || '-',
      '缩放验证': ann.zoom_verify_passed ? '通过' : '未验证',
      '平移验证': ann.pan_verify_passed ? '通过' : '未验证',
      '复核时间': ann.review_time || '-',
      '复核备注': trace?.latestReview?.review_comment || '',
      '追溯链路完整': trace ? '是' : '否'
    });
  }

  const fields = Object.keys(exportData[0] || {});
  const opts = { fields };
  
  try {
    const parser = new Parser(opts);
    const csv = parser.parse(exportData);
    
    const summaryText = buildSummaryText(summary, batchNo);
    
    return {
      csv,
      summaryText,
      recordCount: exportData.length,
      summary: summary,
      exportTime: new Date().toISOString()
    };
  } catch (err) {
    throw err;
  }
}

function translateStatus(status) {
  const map = {
    'pending': '待复核',
    'pass': '通过',
    'fail': '不通过',
    '待确认': '待确认'
  };
  return map[status] || status || '-';
}

function buildSummaryText(summary, batchNo) {
  const targetSummary = batchNo 
    ? summary.find(s => s.batch_no === batchNo)
    : null;
  
  if (targetSummary) {
    return `无人机航片拼接复核报告
批次号: ${targetSummary.batch_no}
导出时间: ${new Date().toLocaleString()}
总记录数: ${targetSummary.total_count}
通过: ${targetSummary.pass_count}
不通过: ${targetSummary.fail_count}
待复核: ${targetSummary.pending_count}
平均评分: ${targetSummary.avg_score ? targetSummary.avg_score.toFixed(1) : '-'}
复核结论: ${getFinalConclusion(targetSummary)}`;
  }
  
  const totalRecords = summary.reduce((sum, s) => sum + s.total_count, 0);
  const totalPass = summary.reduce((sum, s) => sum + s.pass_count, 0);
  const totalFail = summary.reduce((sum, s) => sum + s.fail_count, 0);
  const totalPending = summary.reduce((sum, s) => sum + s.pending_count, 0);
  const avgScores = summary.filter(s => s.avg_score !== null);
  const overallAvg = avgScores.length > 0 
    ? (avgScores.reduce((sum, s) => sum + s.avg_score, 0) / avgScores.length).toFixed(1)
    : '-';
  
  return `无人机航片拼接复核汇总报告
导出时间: ${new Date().toLocaleString()}
批次数: ${summary.length}
总记录数: ${totalRecords}
通过: ${totalPass}
不通过: ${totalFail}
待复核: ${totalPending}
综合平均评分: ${overallAvg}
总体结论: ${totalPending > 0 ? '待确认' : (totalFail > 0 ? '存在问题需整改' : '全部通过')}`;
}

function getFinalConclusion(summary) {
  if (summary.pending_count > 0) return '待确认';
  if (summary.fail_count > 0) return '不通过（存在问题需整改）';
  return '通过';
}

function getExportSummary(batchNo = null) {
  return new Promise(async (resolve, reject) => {
    try {
      const summary = await services.getReviewSummary();
      const annotations = await services.getAnnotationList(batchNo ? { batch_no: batchNo } : {});
      
      const result = {
        exportReady: true,
        recordCount: annotations.length,
        batchCount: summary.length,
        passCount: annotations.filter(a => a.status === 'pass').length,
        failCount: annotations.filter(a => a.status === 'fail').length,
        pendingCount: annotations.filter(a => a.status === 'pending').length,
        conclusion: annotations.some(a => a.status === 'pending') 
          ? '待确认' 
          : (annotations.some(a => a.status === 'fail') ? '不通过' : '通过'),
        uiSummary: summary,
        exportTime: new Date().toISOString()
      };
      
      resolve(result);
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  exportReviewData,
  getExportSummary,
  buildSummaryText,
  translateStatus
};
