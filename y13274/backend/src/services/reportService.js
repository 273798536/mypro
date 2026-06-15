const { BAY_STATUS, BAY_STATUS_LABEL, MATERIAL_SOURCE_LABEL, HISTORY_ACTION_LABEL } = require('../models/constants');

function formatDate(isoString) {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getStatusBadge(status) {
  const label = BAY_STATUS_LABEL[status] || status;
  const typeMap = {
    draft: '⚪',
    pending: '🟡',
    approved: '🟢',
    rejected: '🔴',
    needs_review: '🟠',
    coordinate_mismatch: '🔴',
    name_mismatch: '🔴',
    photo_supplemented: '🔵'
  };
  return `${typeMap[status] || '⚪'} ${label}`;
}

function isAbnormalStatus(status) {
  return [
    BAY_STATUS.COORDINATE_MISMATCH,
    BAY_STATUS.NAME_MISMATCH,
    BAY_STATUS.REJECTED,
    BAY_STATUS.NEEDS_REVIEW
  ].includes(status);
}

function generateSummary(bays) {
  const total = bays.length;
  const statusCounts = {};
  for (const bay of bays) {
    statusCounts[bay.status] = (statusCounts[bay.status] || 0) + 1;
  }
  const abnormalCount = bays.filter(b => isAbnormalStatus(b.status)).length;

  let md = '## 汇总统计\n\n';
  md += `| 指标 | 数量 | 占比 |\n`;
  md += `|------|------|------|\n`;
  md += `| 总计 | ${total} | 100% |\n`;

  for (const [status, count] of Object.entries(statusCounts)) {
    const label = BAY_STATUS_LABEL[status] || status;
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0%';
    md += `| ${getStatusBadge(status)} | ${count} | ${pct} |\n`;
  }

  md += `| ⚠️ 需关注（异常项） | ${abnormalCount} | ${total > 0 ? ((abnormalCount / total) * 100).toFixed(1) + '%' : '0%'} |\n`;
  md += '\n';

  return md;
}

function generateKeyIssues(bays) {
  const abnormal = bays.filter(b => isAbnormalStatus(b.status));
  if (abnormal.length === 0) {
    return '## 重点关注事项\n\n✅ 所有点位状态正常，无异常项。\n\n';
  }

  let md = '## ⚠️ 重点关注事项\n\n';
  md += `共 ${abnormal.length} 个点位存在问题，需优先处理：\n\n`;

  const coordMismatch = abnormal.filter(b => b.status === BAY_STATUS.COORDINATE_MISMATCH);
  const nameMismatch = abnormal.filter(b => b.status === BAY_STATUS.NAME_MISMATCH);
  const rejected = abnormal.filter(b => b.status === BAY_STATUS.REJECTED);
  const needsReview = abnormal.filter(b => b.status === BAY_STATUS.NEEDS_REVIEW);

  if (coordMismatch.length > 0) {
    md += `### 🔴 坐标偏移（${coordMismatch.length}项）\n\n`;
    md += '以下点位GIS坐标与实际位置偏差较大，可能影响施工落位：\n\n';
    for (const bay of coordMismatch) {
      md += `- **${bay.name}**（${bay.road}）：${bay.remark || '坐标偏至相邻街道'}\n`;
    }
    md += '\n';
  }

  if (nameMismatch.length > 0) {
    md += `### 🔴 名称不一致（${nameMismatch.length}项）\n\n`;
    md += '以下点位材料名称与GIS点位名称不一致，需核实：\n\n';
    for (const bay of nameMismatch) {
      md += `- **${bay.name}**（${bay.road}）\n`;
      const inconsistentMaterials = bay.materials.filter(m => !m.isNameConsistent);
      for (const mat of inconsistentMaterials) {
        md += `  - 材料「${mat.name}」：${mat.nameRemark || '名称与GIS点位不符'}\n`;
      }
    }
    md += '\n';
  }

  if (rejected.length > 0) {
    md += `### 🔴 未通过（${rejected.length}项）\n\n`;
    for (const bay of rejected) {
      md += `- **${bay.name}**：${bay.remark || '审核未通过'}\n`;
    }
    md += '\n';
  }

  if (needsReview.length > 0) {
    md += `### 🟠 需复核（${needsReview.length}项）\n\n`;
    for (const bay of needsReview) {
      md += `- **${bay.name}**：${bay.remark || '待复核确认'}\n`;
    }
    md += '\n';
  }

  return md;
}

function generateBayDetail(bay) {
  let md = `### ${getStatusBadge(bay.status)} ${bay.name}\n\n`;

  md += '- **所在道路**：' + (bay.road || '—') + '\n';
  md += '- **位置方向**：' + (bay.direction || '—') + '\n';
  md += '- **位置描述**：' + (bay.location || '—') + '\n';
  md += `- **GIS坐标**：${bay.coordinates.lat.toFixed(6)}, ${bay.coordinates.lng.toFixed(6)}\n`;
  md += '- **当前备注**：' + (bay.remark || '无') + '\n';
  md += '- **更新时间**：' + formatDate(bay.updatedAt) + '\n\n';

  if (bay.materials && bay.materials.length > 0) {
    md += '**关联材料**：\n\n';
    for (const mat of bay.materials) {
      const sourceLabel = MATERIAL_SOURCE_LABEL[mat.source] || mat.source;
      const consistentMark = mat.isNameConsistent ? '✅' : '⚠️ 名称不一致';
      md += `- ${consistentMark} **${mat.name}**（${sourceLabel}）`;
      if (!mat.isNameConsistent && mat.nameRemark) {
        md += `：${mat.nameRemark}`;
      }
      if (mat.description) {
        md += `\n  - ${mat.description}`;
      }
      md += '\n';
    }
    md += '\n';

    const inconsistent = bay.materials.filter(m => !m.isNameConsistent);
    if (inconsistent.length > 0) {
      md += '> **材料名称不一致说明**：以上 ' + inconsistent.length + ' 份材料名称与GIS点位记录的名称存在差异，已关联至本条结论，需进一步核实确认。\n\n';
    }
  }

  if (bay.photos && bay.photos.length > 0) {
    md += `**现场照片**（${bay.photos.length}张）：\n\n`;
    for (const photo of bay.photos) {
      md += `- 📷 ${photo.description || '现场照片'}（${formatDate(photo.createdAt)}，上传人：${photo.uploader || '未知'}）\n`;
      if (photo.changes) {
        md += `  - 本次补录变更：${photo.changes}\n`;
      }
    }
    md += '\n';

    const photoHistory = bay.history.filter(h => h.action === 'photo_add');
    if (photoHistory.length > 0) {
      md += '> **照片补录说明**：本点位已进行 ' + photoHistory.length + ' 次现场照片补录。补录后地图点位信息和材料清单已同步更新。\n\n';
    }
  }

  if (bay.history && bay.history.length > 0) {
    md += '**历史记录**：\n\n';
    const recentHistory = [...bay.history].reverse().slice(0, 5);
    for (const h of recentHistory) {
      const actionLabel = HISTORY_ACTION_LABEL[h.action] || h.action;
      md += `- ${formatDate(h.timestamp)} | ${actionLabel} | ${h.operator || 'system'}`;
      if (h.remark) {
        md += `：${h.remark}`;
      }
      md += '\n';
    }
    if (bay.history.length > 5) {
      md += `- （共 ${bay.history.length} 条记录，显示最近 5 条）\n`;
    }
    md += '\n';
  }

  return md;
}

function generateBaysList(bays, title, statusFilter) {
  const filtered = statusFilter ? bays.filter(b => b.status === statusFilter) : bays;
  if (filtered.length === 0) return '';

  let md = `## ${title}（${filtered.length}项）\n\n`;

  for (const bay of filtered) {
    md += generateBayDetail(bay);
    md += '---\n\n';
  }

  return md;
}

function generateConclusion(bays) {
  const abnormal = bays.filter(b => isAbnormalStatus(b.status));
  const approved = bays.filter(b => b.status === BAY_STATUS.APPROVED);

  let md = '## 结论与建议\n\n';

  if (abnormal.length === 0) {
    md += '✅ 全部点位审核通过，可进入下一阶段。\n\n';
  } else {
    md += `### 需处理事项\n\n`;
    md += `当前共 ${abnormal.length} 个点位存在问题，建议按以下优先级处理：\n\n`;

    const coordMismatch = abnormal.filter(b => b.status === BAY_STATUS.COORDINATE_MISMATCH);
    const nameMismatch = abnormal.filter(b => b.status === BAY_STATUS.NAME_MISMATCH);

    if (coordMismatch.length > 0) {
      md += `1. **坐标偏移问题**（${coordMismatch.length}项）：建议联系现场人员重新测量坐标，或与GIS数据提供方核对点位位置，避免施工时落位错误。\n`;
    }
    if (nameMismatch.length > 0) {
      md += `2. **名称不一致问题**（${nameMismatch.length}项）：建议核对材料与GIS点位的对应关系，确认是否为同一地点的不同命名，或是否存在材料关联错误。\n`;
    }
    md += '\n';
  }

  if (approved.length > 0) {
    md += `### 已确认通过\n\n`;
    md += `${approved.length} 个点位已通过审核，可作为方案依据。\n\n`;
  }

  return md;
}

function generateReport(bays, options = {}) {
  const title = options.title || '公交港湾公示清单';
  const generatedAt = new Date().toISOString();
  const generator = options.generator || 'system';

  let md = `# ${title}\n\n`;
  md += `> 生成时间：${formatDate(generatedAt)}\n`;
  md += `> 生成人：${generator}\n`;
  md += `> 点位总数：${bays.length}\n\n`;

  md += '---\n\n';

  md += generateSummary(bays);

  md += '---\n\n';

  md += generateKeyIssues(bays);

  md += '---\n\n';

  const abnormalBays = bays.filter(b => isAbnormalStatus(b.status));
  const normalBays = bays.filter(b => !isAbnormalStatus(b.status));

  if (abnormalBays.length > 0) {
    md += generateBaysList(abnormalBays, '🔴 异常点位明细');
  }

  if (normalBays.length > 0) {
    md += generateBaysList(normalBays, '✅ 正常点位明细');
  }

  md += '---\n\n';

  md += generateConclusion(bays);

  md += '---\n\n';
  md += `*本报告由系统自动生成，数据与接口查询结果一致。如有疑问请联系管理员。*\n`;

  return {
    content: md,
    generatedAt,
    bayCount: bays.length,
    abnormalCount: abnormalBays.length
  };
}

function generateSingleBayReport(bay) {
  let md = `# 公交港湾明细 - ${bay.name}\n\n`;
  md += `> 当前状态：${getStatusBadge(bay.status)}\n`;
  md += `> 更新时间：${formatDate(bay.updatedAt)}\n\n`;

  md += '---\n\n';
  md += generateBayDetail(bay);

  if (bay.history && bay.history.length > 0) {
    md += '## 完整历史记录\n\n';
    for (const h of [...bay.history].reverse()) {
      const actionLabel = HISTORY_ACTION_LABEL[h.action] || h.action;
      md += `- **${formatDate(h.timestamp)}** | ${actionLabel} | ${h.operator || 'system'}\n`;
      if (h.remark) {
        md += `  - 备注：${h.remark}\n`;
      }
      if (h.beforeStatus || h.afterStatus) {
        const before = BAY_STATUS_LABEL[h.beforeStatus] || h.beforeStatus || '—';
        const after = BAY_STATUS_LABEL[h.afterStatus] || h.afterStatus || '—';
        md += `  - 状态变化：${before} → ${after}\n`;
      }
      md += '\n';
    }
  }

  return {
    content: md,
    generatedAt: new Date().toISOString(),
    bayId: bay.id,
    bayName: bay.name,
    status: bay.status
  };
}

module.exports = {
  generateReport,
  generateSingleBayReport,
  getStatusBadge,
  isAbnormalStatus,
  formatDate
};
