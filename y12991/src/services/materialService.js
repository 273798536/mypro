const materialDao = require('../dao/materialDao');
const auditDao = require('../dao/auditDao');
const { ENTITY_TYPES, ACTIONS } = auditDao;

async function importMaterial(materialData, operator) {
  const material = await materialDao.createMaterial({
    ...materialData,
    imported_by: operator
  });

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MATERIAL,
    entity_id: material.id,
    action: ACTIONS.IMPORT,
    reason: `导入${getMaterialTypeLabel(material.type)}材料`,
    operator
  });

  return material;
}

async function importBatch(materialsData, import_batch, operator) {
  const results = [];
  for (const data of materialsData) {
    const material = await materialDao.createMaterial({
      ...data,
      import_batch,
      imported_by: operator
    });
    results.push(material);
  }

  return results;
}

async function updateMaterialVersion(materialId, newContent, operator, remark = '') {
  const oldMaterial = await materialDao.getMaterialById(materialId);
  if (!oldMaterial) throw new Error('材料不存在');

  const newMaterial = await materialDao.createMaterialVersion({
    parent_id: oldMaterial.parent_id || materialId,
    content: newContent,
    imported_by: operator,
    remark
  });

  await auditDao.createAuditLog({
    entity_type: ENTITY_TYPES.MATERIAL,
    entity_id: newMaterial.id,
    action: ACTIONS.UPDATE,
    field_name: 'content',
    old_value: oldMaterial.content,
    new_value: newMaterial.content,
    reason: remark || '表结构快照被修改',
    operator
  });

  return newMaterial;
}

async function getMaterial(id) {
  return materialDao.getMaterialById(id);
}

async function listMaterials(filters) {
  return materialDao.listMaterials(filters);
}

async function getMaterialVersions(parent_id) {
  return materialDao.getMaterialVersions(parent_id);
}

function getMaterialTypeLabel(type) {
  const labels = {
    table_snapshot: '表结构快照',
    slow_query_log: '慢查询日志',
    permission_list: '权限清单',
    metric_report: '指标报表'
  };
  return labels[type] || type;
}

module.exports = {
  importMaterial,
  importBatch,
  updateMaterialVersion,
  getMaterial,
  listMaterials,
  getMaterialVersions,
  getMaterialTypeLabel
};
