const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const db = require('../db');
const trackService = require('./trackService');
const anomalyService = require('./anomalyService');

const FIELD_ALIASES = {
  track_name: ['曲目名称', '曲目', '曲名', '歌曲名', '名称', 'track_name', 'name', 'title'],
  track_no: ['曲目编号', '编号', '序号', '曲目号', 'track_no', 'no', 'number'],
  track_aliases: ['别名', '别名列表', '曾用名', '其他名称', 'track_aliases', 'aliases'],
  file_name: ['文件名', '文件', '音频文件', '文件名全称', 'file_name', 'file', 'filename'],
  source: ['来源', '数据来源', '截图来源', '来源说明', 'source'],
  source_type: ['来源类型', '数据类型', 'source_type', 'type'],
  program_order: ['演出顺序', '顺序', '排序', '出场顺序', 'program_order', 'order', 'sort'],
  is_encore: ['是否返场', '返场曲', '返场', 'encore', 'is_encore'],
  status: ['状态', '处理状态', 'status'],
  remark: ['备注', '说明', '备注信息', 'remark', 'note'],
  auth_remark: ['授权备注', '授权说明', '授权信息', 'auth_remark', 'auth'],
};

function detectField(headerRow) {
  const sortedFields = Object.entries(FIELD_ALIASES).sort((a, b) => {
    const aMax = Math.max(...a[1].map(s => s.length));
    const bMax = Math.max(...b[1].map(s => s.length));
    return bMax - aMax;
  });
  const mapping = {};
  headerRow.forEach((header, idx) => {
    const h = String(header || '').trim().toLowerCase();
    for (const [canonical, aliases] of sortedFields) {
      if (aliases.some(a => {
        const al = a.toLowerCase();
        return al === h || h.indexOf(al) !== -1;
      })) {
        mapping[idx] = canonical;
        break;
      }
    }
    if (!mapping[idx]) {
      mapping[idx] = `_extra_${idx}`;
    }
  });
  return mapping;
}

function importFromCsv(filePath, options = {}) {
  const { source = 'CSV导入', operator = 'system', sourceType = 'csv' } = options;
  const content = fs.readFileSync(filePath, 'utf-8');
  const records = parse(content, { columns: false, skip_empty_lines: true, bom: true });
  if (records.length === 0) return { imported: 0, updated: 0, mapping: {}, errors: ['空文件'] };
  const header = records[0];
  const mapping = detectField(header);
  const imported = [];
  const errors = [];
  for (let i = 1; i < records.length; i++) {
    const row = records[i];
    if (row.every(c => !c || String(c).trim() === '')) continue;
    try {
      const data = { source, source_type: sourceType };
      Object.entries(mapping).forEach(([idx, field]) => {
        if (!field.startsWith('_extra_')) {
          let val = row[Number(idx)];
          if (val !== undefined && val !== null) val = String(val).trim();
          if (val !== undefined && val !== '' && val !== null) data[field] = val;
        }
      });
      if (data.is_encore) {
        data.is_encore = ['1', 'true', '是', '返场', 'y', 'yes'].includes(String(data.is_encore).toLowerCase()) ? 1 : 0;
      }
      if (data.program_order) {
        const n = parseInt(data.program_order, 10);
        if (!isNaN(n)) data.program_order = n; else delete data.program_order;
      }
      if (!data.track_name) { errors.push(`第${i + 1}行缺少曲目名称`); continue; }
      const existing = db.prepare(`SELECT id FROM tracks WHERE track_name = ? LIMIT 1`).get(data.track_name);
      if (existing) {
        trackService.updateTrack(existing.id, data, operator, `CSV导入同步更新(${source})`);
        imported.push({ id: existing.id, action: 'update', ...data });
      } else {
        const created = trackService.createTrack(data, operator);
        imported.push({ id: created.id, action: 'create', ...data });
      }
    } catch (e) {
      errors.push(`第${i + 1}行导入失败: ${e.message}`);
    }
  }
  db.prepare(`INSERT INTO import_sources (source_name, source_type, field_mapping, file_name, operator, remark) VALUES (?, ?, ?, ?, ?, ?)`).run(
    source, sourceType, JSON.stringify(mapping), path.basename(filePath), operator, `导入${imported.length}条，错误${errors.length}条`
  );
  return { imported: imported.filter(x => x.action === 'create').length, updated: imported.filter(x => x.action === 'update').length, mapping, errors, rows: imported };
}

function exportTracksToCsv(options = {}) {
  const { anomaly_only = false, status = null, is_encore = null } = options;
  const tracks = trackService.listTracks({ status, is_encore, anomaly_only, limit: 99999 });
  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'program_order', header: '演出顺序' },
    { key: 'track_no', header: '曲目编号' },
    { key: 'track_name', header: '曲目名称' },
    { key: 'track_aliases', header: '别名' },
    { key: 'file_name', header: '文件名' },
    { key: 'is_encore', header: '是否返场' },
    { key: 'source', header: '来源' },
    { key: 'status', header: '处理状态' },
    { key: 'anomaly_type', header: '异常类型' },
    { key: 'anomaly_detail', header: '异常详情' },
    { key: 'remark', header: '运营备注' },
    { key: 'auth_remark', header: '授权备注' },
    { key: 'operator', header: '最后操作人' },
    { key: 'updated_at', header: '更新时间' },
  ];
  const rows = tracks.map(t => ({
    ...t,
    is_encore: t.is_encore ? '是' : '否',
  }));
  return stringify(rows, {
    header: true,
    columns: columns.map(c => ({ key: c.key, header: c.header })),
    bom: true,
    quoted: true,
  });
}

function exportConflictsToCsv() {
  const conflicts = anomalyService.listConflicts({});
  const rows = conflicts.map(c => ({
    id: c.id,
    alias_name: c.alias_name,
    conflict_type: c.conflict_type === 'duplicate_alias' ? '别名重复' : c.conflict_type,
    related_tracks: c.tracks.map(t => `${t.track_name}(#${t.id})`).join(' | '),
    related_filenames: c.tracks.map(t => t.file_name || '-').join(' | '),
    resolved: c.resolved ? '已解决' : '未解决',
    resolved_remark: c.resolved_remark || '',
    created_at: c.created_at,
  }));
  return stringify(rows, {
    header: true,
    columns: [
      { key: 'id', header: '冲突ID' },
      { key: 'alias_name', header: '冲突别名' },
      { key: 'conflict_type', header: '冲突类型' },
      { key: 'related_tracks', header: '关联曲目' },
      { key: 'related_filenames', header: '关联文件名' },
      { key: 'resolved', header: '解决状态' },
      { key: 'resolved_remark', header: '解决说明' },
      { key: 'created_at', header: '发现时间' },
    ],
    bom: true,
    quoted: true,
  });
}

function exportHistoryToCsv(trackId) {
  const history = trackService.getTrackHistory(trackId);
  return stringify(history, {
    header: true,
    columns: [
      { key: 'id', header: '记录ID' },
      { key: 'track_id', header: '曲目ID' },
      { key: 'field_name', header: '修改字段' },
      { key: 'old_value', header: '原值' },
      { key: 'new_value', header: '新值' },
      { key: 'change_reason', header: '修改原因' },
      { key: 'operator', header: '操作人' },
      { key: 'created_at', header: '修改时间' },
    ],
    bom: true,
    quoted: true,
  });
}

module.exports = {
  importFromCsv,
  exportTracksToCsv,
  exportConflictsToCsv,
  exportHistoryToCsv,
  detectField,
  FIELD_ALIASES,
};
