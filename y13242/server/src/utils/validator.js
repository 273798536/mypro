const Booth = require('../models/Booth');

function detectIssues() {
  const issues = [];

  const duplicates = Booth.findDuplicateSongAliases();
  duplicates.forEach((dup) => {
    issues.push({
      type: 'duplicate_song_alias',
      severity: 'warning',
      message: `检测到曲名/别名重复：摊位[${dup.booth1}] "${dup.name1 || dup.alias1}" 与 摊位[${dup.booth2}] "${dup.name2 || dup.alias2}"`,
      booth_ids: [dup.id1, dup.id2],
      detail: dup,
    });
  });

  const allBooths = Booth.getAll();
  allBooths.forEach((booth) => {
    if (!booth.booth_number || !booth.label_name) {
      issues.push({
        type: 'missing_required_field',
        severity: 'error',
        message: `摊位记录ID=${booth.id} 缺少必填字段`,
        booth_ids: [booth.id],
      });
    }

    if (booth.status === 'approved' && !booth.final_conclusion) {
      issues.push({
        type: 'missing_conclusion',
        severity: 'warning',
        message: `摊位[${booth.booth_number}] 状态已审批但缺少最终结论`,
        booth_ids: [booth.id],
      });
    }

    if (booth.final_conclusion && (!booth.manual_annotation || !booth.delivery_checklist)) {
      issues.push({
        type: 'missing_linked_data',
        severity: 'info',
        message: `摊位[${booth.booth_number}] 已填写结论但缺少人工批注或交付清单`,
        booth_ids: [booth.id],
      });
    }
  });

  return issues;
}

function generatePageSummary() {
  const allBooths = Booth.getAll();
  const issues = detectIssues();

  const statusCount = {
    pending: 0,
    reviewing: 0,
    approved: 0,
    rejected: 0,
  };

  allBooths.forEach((b) => {
    if (statusCount[b.status] !== undefined) {
      statusCount[b.status]++;
    }
  });

  const total = allBooths.length;
  const withConclusion = allBooths.filter((b) => b.final_conclusion).length;
  const withNotes = allBooths.filter((b) => b.rehearsal_info || b.authorization_note || b.manual_annotation).length;

  return {
    total_count: total,
    status_count: statusCount,
    with_conclusion: withConclusion,
    with_linked_notes: withNotes,
    issue_count: issues.length,
    duplicate_count: issues.filter((i) => i.type === 'duplicate_song_alias').length,
    last_updated: new Date().toISOString(),
  };
}

module.exports = {
  detectIssues,
  generatePageSummary,
};
