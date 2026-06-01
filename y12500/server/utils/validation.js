const { v4: uuidv4 } = require('uuid');

const ValidationErrorTypes = {
  DUPLICATE_ID: 'DUPLICATE_ID',
  DUPLICATE_CODE: 'DUPLICATE_CODE',
  OLD_VERSION: 'OLD_VERSION',
  BOUNDARY_WARNING: 'BOUNDARY_WARNING',
  INVALID_VALUE: 'INVALID_VALUE'
};

const ViolationTypes = {
  FORBIDDEN_ZONE: 'FORBIDDEN_ZONE_VIOLATION',
  BLIND_ZONE_MISS: 'BLIND_ZONE_MISS',
  HEIGHT_LIMIT: 'HEIGHT_LIMIT_VIOLATION'
};

const SeverityLevels = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

function checkDuplicateIds(existingItems, newItems, idField = 'id') {
  const duplicates = [];
  const existingIds = new Set(existingItems.map(item => item[idField]));
  
  newItems.forEach(item => {
    if (existingIds.has(item[idField])) {
      duplicates.push({
        type: ValidationErrorTypes.DUPLICATE_ID,
        field: idField,
        value: item[idField],
        item: item,
        message: `检测到重复${idField}: ${item[idField]}，已标记而非覆盖`
      });
    }
  });
  
  return duplicates;
}

function checkDuplicateCodes(existingItems, newItems, codeField = 'code') {
  const duplicates = [];
  const existingCodes = new Map();
  
  existingItems.forEach(item => {
    if (item[codeField]) {
      existingCodes.set(item[codeField], item);
    }
  });
  
  newItems.forEach(item => {
    if (item[codeField] && existingCodes.has(item[codeField])) {
      const existing = existingCodes.get(item[codeField]);
      duplicates.push({
        type: ValidationErrorTypes.DUPLICATE_CODE,
        field: codeField,
        value: item[codeField],
        newItem: item,
        existingItem: existing,
        message: `检测到重复编号 ${codeField}: ${item[codeField]}，请确认是否为同一实体的新版本`
      });
    }
  });
  
  return duplicates;
}

function checkVersionConflict(existingItems, newItems, idField = 'id', versionField = 'version') {
  const conflicts = [];
  
  newItems.forEach(newItem => {
    const existing = existingItems.find(e => e[idField] === newItem[idField]);
    if (existing) {
      const existingVersion = existing[versionField] || 1;
      const newVersion = newItem[versionField] || 1;
      
      if (newVersion < existingVersion) {
        conflicts.push({
          type: ValidationErrorTypes.OLD_VERSION,
          id: newItem[idField],
          existingVersion,
          newVersion,
          item: newItem,
          message: `检测到晚到版本: ID ${newItem[idField]} 当前版本 v${existingVersion}，收到 v${newVersion}，已标记不覆盖`
        });
      } else if (newVersion === existingVersion) {
        conflicts.push({
          type: ValidationErrorTypes.OLD_VERSION,
          id: newItem[idField],
          existingVersion,
          newVersion,
          item: newItem,
          message: `检测到同版本提交: ID ${newItem[idField]} 版本 v${existingVersion}，已标记不覆盖`
        });
      }
    }
  });
  
  return conflicts;
}

function checkBoundaryWarnings(value, min, max, fieldName, context = {}) {
  const warnings = [];
  
  if (value < min || value > max) {
    warnings.push({
      type: ValidationErrorTypes.BOUNDARY_WARNING,
      field: fieldName,
      value,
      min,
      max,
      context,
      message: `${fieldName} = ${value} 超出边界 [${min}, ${max}]，3D渲染将显示警告标记`
    });
  } else if (value === min || value === max) {
    warnings.push({
      type: ValidationErrorTypes.BOUNDARY_WARNING,
      field: fieldName,
      value,
      min,
      max,
      context,
      message: `${fieldName} = ${value} 处于边界值，请注意实际作业风险`
    });
  }
  
  return warnings;
}

function validateWarehouse(warehouse, config) {
  const errors = [];
  const warnings = [];
  
  if (!warehouse.id) {
    errors.push({ type: ValidationErrorTypes.INVALID_VALUE, field: 'id', message: '仓库ID不能为空' });
  }
  if (!warehouse.name) {
    errors.push({ type: ValidationErrorTypes.INVALID_VALUE, field: 'name', message: '仓库名称不能为空' });
  }
  
  if (warehouse.width) {
    warnings.push(...checkBoundaryWarnings(warehouse.width, 10, 200, '仓库宽度', { warehouseId: warehouse.id }));
  }
  if (warehouse.height) {
    warnings.push(...checkBoundaryWarnings(warehouse.height, 3, 20, '仓库高度', { warehouseId: warehouse.id }));
  }
  
  return { errors, warnings };
}

function validateShelves(shelves, existingShelves, warehouse, config) {
  const errors = [];
  const warnings = [];
  
  const idDuplicates = checkDuplicateIds(existingShelves, shelves, 'id');
  errors.push(...idDuplicates);
  
  const codeDuplicates = checkDuplicateCodes(existingShelves, shelves, 'code');
  errors.push(...codeDuplicates);
  
  const versionConflicts = checkVersionConflict(existingShelves, shelves, 'id', 'version');
  errors.push(...versionConflicts);
  
  shelves.forEach(shelf => {
    if (shelf.height) {
      warnings.push(...checkBoundaryWarnings(
        shelf.height,
        config.warehouse.shelfMinHeight,
        config.warehouse.shelfMaxHeight,
        `货架 ${shelf.code || shelf.id} 高度`,
        { shelfId: shelf.id, warehouseId: warehouse.id }
      ));
    }
    
    if (warehouse && shelf.height > warehouse.height) {
      errors.push({
        type: ValidationErrorTypes.INVALID_VALUE,
        field: 'height',
        value: shelf.height,
        max: warehouse.height,
        message: `货架 ${shelf.code || shelf.id} 高度 ${shelf.height}m 超过仓库高度 ${warehouse.height}m`
      });
    }
    
    if (warehouse) {
      const shelfTopX = shelf.x + shelf.width;
      const shelfTopZ = shelf.z + shelf.depth;
      if (shelf.x < 0 || shelf.y < 0 || shelf.z < 0 || 
          shelfTopX > warehouse.width || shelfTopZ > warehouse.depth) {
        errors.push({
          type: ValidationErrorTypes.INVALID_VALUE,
          field: 'position',
          message: `货架 ${shelf.code || shelf.id} 位置超出仓库边界`
        });
      }
    }
  });
  
  return { errors, warnings };
}

function validateRoute(route, waypoints, existingRoutes, warehouse, config) {
  const errors = [];
  const warnings = [];
  
  if (existingRoutes) {
    const idDuplicates = checkDuplicateIds(existingRoutes, [route], 'id');
    errors.push(...idDuplicates);
    
    const versionConflicts = checkVersionConflict(existingRoutes, [route], 'id', 'version');
    errors.push(...versionConflicts);
  }
  
  waypoints.forEach((wp, idx) => {
    warnings.push(...checkBoundaryWarnings(
      wp.z,
      config.warehouse.droneMinAltitude,
      config.warehouse.droneMaxAltitude,
      `航点 ${idx + 1} 高度`,
      { routeId: route.id, waypointIndex: idx }
    ));
    
    if (warehouse) {
      if (wp.x < 0 || wp.x > warehouse.width || 
          wp.y < 0 || wp.y > warehouse.depth ||
          wp.z < 0 || wp.z > warehouse.height) {
        errors.push({
          type: ValidationErrorTypes.INVALID_VALUE,
          field: 'waypoint_position',
          waypointIndex: idx,
          message: `航点 ${idx + 1} (${wp.x}, ${wp.y}, ${wp.z}) 超出仓库边界`
        });
      }
    }
  });
  
  return { errors, warnings };
}

function generateResultHash(routeId, warehouseVersion, timestamp) {
  const crypto = require('crypto');
  const data = `${routeId}-${warehouseVersion}-${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

module.exports = {
  ValidationErrorTypes,
  ViolationTypes,
  SeverityLevels,
  checkDuplicateIds,
  checkDuplicateCodes,
  checkVersionConflict,
  checkBoundaryWarnings,
  validateWarehouse,
  validateShelves,
  validateRoute,
  generateResultHash
};
