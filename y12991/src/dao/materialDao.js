const { run, get, all } = require('../db');
const { v4: uuidv4 } = require('uuid');

const MATERIAL_TYPES = {
  TABLE_SNAPSHOT: 'table_snapshot',
  SLOW_QUERY_LOG: 'slow_query_log',
  PERMISSION_LIST: 'permission_list',
  METRIC_REPORT: 'metric_report'
};

async function createMaterial({ type, source_env, title, content, import_batch, imported_by, remark = '' }) {
  const id = uuidv4();
  const now = new Date().toISOString();
  const content_json = JSON.stringify(content);

  await run(
    `INSERT INTO materials (id, type, source_env, title, content_json, import_batch, imported_by, imported_at, remark, version, is_latest)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
    [id, type, source_env, title, content_json, import_batch, imported_by, now, remark]
  );

  return getMaterialById(id);
}

async function createMaterialVersion({ parent_id, content, imported_by, remark = '' }) {
  const parent = await getMaterialById(parent_id);
  if (!parent) throw new Error('父材料不存在');

  const newVersion = parent.version + 1;
  const id = uuidv4();
  const now = new Date().toISOString();
  const content_json = JSON.stringify(content);

  await run(
    `UPDATE materials SET is_latest = 0 WHERE parent_id = ? OR id = ?`,
    [parent_id, parent_id]
  );

  await run(
    `INSERT INTO materials (id, type, source_env, title, content_json, import_batch, imported_by, imported_at, remark, version, parent_id, is_latest)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [id, parent.type, parent.source_env, parent.title, content_json, parent.import_batch + '-v' + newVersion, imported_by, now, remark, newVersion, parent_id]
  );

  return getMaterialById(id);
}

async function getMaterialById(id) {
  const row = await get('SELECT * FROM materials WHERE id = ?', [id]);
  if (!row) return null;
  return parseMaterialRow(row);
}

async function getMaterialsByBatch(import_batch) {
  const rows = await all('SELECT * FROM materials WHERE import_batch = ? ORDER BY type, title', [import_batch]);
  return rows.map(parseMaterialRow);
}

async function getMaterialsByType(type) {
  const rows = await all('SELECT * FROM materials WHERE type = ? AND is_latest = 1 ORDER BY title', [type]);
  return rows.map(parseMaterialRow);
}

async function getMaterialVersions(parent_id) {
  const rows = await all(
    'SELECT * FROM materials WHERE parent_id = ? OR id = ? ORDER BY version DESC',
    [parent_id, parent_id]
  );
  return rows.map(parseMaterialRow);
}

async function listMaterials({ type, source_env, is_latest } = {}) {
  let sql = 'SELECT * FROM materials WHERE 1=1';
  const params = [];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (source_env) {
    sql += ' AND source_env = ?';
    params.push(source_env);
  }
  if (is_latest !== undefined) {
    sql += ' AND is_latest = ?';
    params.push(is_latest ? 1 : 0);
  }

  sql += ' ORDER BY imported_at DESC';
  const rows = await all(sql, params);
  return rows.map(parseMaterialRow);
}

function parseMaterialRow(row) {
  return {
    id: row.id,
    type: row.type,
    source_env: row.source_env,
    title: row.title,
    content: JSON.parse(row.content_json),
    import_batch: row.import_batch,
    imported_by: row.imported_by,
    imported_at: row.imported_at,
    remark: row.remark,
    version: row.version,
    parent_id: row.parent_id,
    is_latest: row.is_latest === 1
  };
}

module.exports = {
  MATERIAL_TYPES,
  createMaterial,
  createMaterialVersion,
  getMaterialById,
  getMaterialsByBatch,
  getMaterialsByType,
  getMaterialVersions,
  listMaterials
};
