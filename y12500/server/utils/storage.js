const { getDB } = require('../models/database');
const { v4: uuidv4 } = require('uuid');
const { generateResultHash, ValidationErrorTypes } = require('./validation');

class WarehouseStore {
  constructor() {
    this.db = getDB();
  }

  createWarehouse(warehouse, checkVersion = true) {
    const existing = this.db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_latest = 1').get(warehouse.id);
    
    if (existing && checkVersion) {
      if ((warehouse.version || 1) <= existing.version) {
        return {
          success: false,
          conflict: true,
          existingVersion: existing.version,
          newVersion: warehouse.version || 1,
          message: `版本冲突：仓库 ${warehouse.id} 当前版本 v${existing.version}，收到 v${warehouse.version || 1}`
        };
      }
      
      this.db.prepare('UPDATE warehouses SET is_latest = 0 WHERE id = ?').run(warehouse.id);
    }
    
    const stmt = this.db.prepare(`
      INSERT INTO warehouses (id, name, width, depth, height, version, is_latest)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    
    stmt.run(
      warehouse.id,
      warehouse.name,
      warehouse.width,
      warehouse.depth,
      warehouse.height,
      warehouse.version || 1
    );
    
    return { success: true, id: warehouse.id, version: warehouse.version || 1 };
  }

  getWarehouse(id, version = null) {
    if (version) {
      return this.db.prepare('SELECT * FROM warehouses WHERE id = ? AND version = ?').get(id, version);
    }
    return this.db.prepare('SELECT * FROM warehouses WHERE id = ? AND is_latest = 1').get(id);
  }

  getWarehouseVersions(id) {
    return this.db.prepare('SELECT id, name, version, created_at, is_latest FROM warehouses WHERE id = ? ORDER BY version DESC').all(id);
  }

  listWarehouses() {
    return this.db.prepare('SELECT * FROM warehouses WHERE is_latest = 1 ORDER BY created_at DESC').all();
  }
}

class ShelfStore {
  constructor() {
    this.db = getDB();
  }

  createShelves(shelves, warehouseId, checkDuplicates = true) {
    const results = [];
    const tx = this.db.transaction((items) => {
      for (const shelf of items) {
        const existing = this.db.prepare('SELECT * FROM shelves WHERE id = ? AND is_latest = 1').get(shelf.id);
        
        if (existing && checkDuplicates) {
          if ((shelf.version || 1) <= existing.version) {
            results.push({
              id: shelf.id,
              code: shelf.code,
              success: false,
              conflict: {
                type: ValidationErrorTypes.OLD_VERSION,
                existingVersion: existing.version,
                newVersion: shelf.version || 1
              }
            });
            continue;
          }
          
          this.db.prepare('UPDATE shelves SET is_latest = 0 WHERE id = ?').run(shelf.id);
        }
        
        const duplicateCode = this.db.prepare(
          'SELECT * FROM shelves WHERE code = ? AND warehouse_id = ? AND is_latest = 1 AND id != ?'
        ).get(shelf.code, warehouseId, shelf.id);
        
        if (duplicateCode && checkDuplicates) {
          results.push({
            id: shelf.id,
            code: shelf.code,
            success: false,
            conflict: {
              type: ValidationErrorTypes.DUPLICATE_CODE,
              existingId: duplicateCode.id,
              existingCode: duplicateCode.code
            }
          });
          continue;
        }
        
        const stmt = this.db.prepare(`
          INSERT INTO shelves (id, warehouse_id, code, x, y, z, width, depth, height, level_count, version, is_latest)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `);
        
        stmt.run(
          shelf.id,
          warehouseId,
          shelf.code,
          shelf.x,
          shelf.y,
          shelf.z,
          shelf.width,
          shelf.depth,
          shelf.height,
          shelf.level_count,
          shelf.version || 1
        );
        
        results.push({
          id: shelf.id,
          code: shelf.code,
          success: true,
          version: shelf.version || 1,
          isNew: !existing
        });
      }
    });
    
    tx(shelves);
    return results;
  }

  getShelvesByWarehouse(warehouseId) {
    return this.db.prepare('SELECT * FROM shelves WHERE warehouse_id = ? AND is_latest = 1 ORDER BY code').all(warehouseId);
  }

  getShelf(id, version = null) {
    if (version) {
      return this.db.prepare('SELECT * FROM shelves WHERE id = ? AND version = ?').get(id, version);
    }
    return this.db.prepare('SELECT * FROM shelves WHERE id = ? AND is_latest = 1').get(id);
  }
}

class RouteStore {
  constructor() {
    this.db = getDB();
  }

  createRoute(route, waypoints, checkVersion = true) {
    const existing = this.db.prepare('SELECT * FROM drone_routes WHERE id = ? AND is_latest = 1').get(route.id);
    
    if (existing && checkVersion) {
      if ((route.version || 1) <= existing.version) {
        return {
          success: false,
          conflict: true,
          existingVersion: existing.version,
          newVersion: route.version || 1,
          message: `版本冲突：航线 ${route.id} 当前版本 v${existing.version}，收到 v${route.version || 1}`
        };
      }
      
      this.db.prepare('UPDATE drone_routes SET is_latest = 0 WHERE id = ?').run(route.id);
      this.db.prepare('DELETE FROM route_waypoints WHERE route_id = ?').run(route.id);
    }
    
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO drone_routes (id, warehouse_id, name, version, is_latest)
        VALUES (?, ?, ?, ?, 1)
      `).run(route.id, route.warehouse_id, route.name, route.version || 1);
      
      const wpStmt = this.db.prepare(`
        INSERT INTO route_waypoints (id, route_id, sequence, x, y, z, action)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      waypoints.forEach((wp, idx) => {
        wpStmt.run(
          wp.id || uuidv4(),
          route.id,
          idx + 1,
          wp.x,
          wp.y,
          wp.z,
          wp.action || null
        );
      });
    });
    
    tx();
    
    return {
      success: true,
      id: route.id,
      version: route.version || 1,
      waypointCount: waypoints.length
    };
  }

  getRoute(id, version = null) {
    let route;
    if (version) {
      route = this.db.prepare('SELECT * FROM drone_routes WHERE id = ? AND version = ?').get(id, version);
    } else {
      route = this.db.prepare('SELECT * FROM drone_routes WHERE id = ? AND is_latest = 1').get(id);
    }
    
    if (route) {
      route.waypoints = this.db.prepare(
        'SELECT * FROM route_waypoints WHERE route_id = ? ORDER BY sequence'
      ).all(id);
    }
    
    return route;
  }

  getRoutesByWarehouse(warehouseId) {
    return this.db.prepare(
      'SELECT * FROM drone_routes WHERE warehouse_id = ? AND is_latest = 1 ORDER BY created_at DESC'
    ).all(warehouseId);
  }
}

class ZoneStore {
  constructor() {
    this.db = getDB();
  }

  createForbiddenZones(zones, warehouseId) {
    const stmt = this.db.prepare(`
      INSERT INTO forbidden_zones (id, warehouse_id, name, type, x, y, z, width, depth, height, version, is_latest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const tx = this.db.transaction((items) => {
      items.forEach(zone => {
        this.db.prepare('UPDATE forbidden_zones SET is_latest = 0 WHERE id = ?').run(zone.id);
        stmt.run(
          zone.id,
          warehouseId,
          zone.name,
          zone.type,
          zone.x,
          zone.y,
          zone.z,
          zone.width,
          zone.depth,
          zone.height,
          zone.version || 1,
          1
        );
      });
    });
    
    tx(zones);
    return zones.map(z => ({ id: z.id, success: true }));
  }

  createBlindZones(zones, warehouseId) {
    const stmt = this.db.prepare(`
      INSERT INTO blind_zones (id, warehouse_id, name, x, y, z, width, depth, height, version, is_latest)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const tx = this.db.transaction((items) => {
      items.forEach(zone => {
        this.db.prepare('UPDATE blind_zones SET is_latest = 0 WHERE id = ?').run(zone.id);
        stmt.run(
          zone.id,
          warehouseId,
          zone.name,
          zone.x,
          zone.y,
          zone.z,
          zone.width,
          zone.depth,
          zone.height,
          zone.version || 1,
          1
        );
      });
    });
    
    tx(zones);
    return zones.map(z => ({ id: z.id, success: true }));
  }

  getForbiddenZones(warehouseId) {
    return this.db.prepare('SELECT * FROM forbidden_zones WHERE warehouse_id = ? AND is_latest = 1').all(warehouseId);
  }

  getBlindZones(warehouseId) {
    return this.db.prepare('SELECT * FROM blind_zones WHERE warehouse_id = ? AND is_latest = 1').all(warehouseId);
  }
}

class InspectionStore {
  constructor() {
    this.db = getDB();
  }

  createTask(task) {
    const stmt = this.db.prepare(`
      INSERT INTO inspection_tasks (id, warehouse_id, route_id, drone_id, status)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const id = task.id || uuidv4();
    stmt.run(id, task.warehouse_id, task.route_id, task.drone_id || null, task.status || 'pending');
    
    return this.getTask(id);
  }

  getTask(id) {
    return this.db.prepare('SELECT * FROM inspection_tasks WHERE id = ?').get(id);
  }

  updateTaskStatus(id, status, timestamp = null) {
    const updates = [];
    const params = [];
    
    updates.push('status = ?');
    params.push(status);
    
    if (status === 'in_progress' && timestamp) {
      updates.push('started_at = ?');
      params.push(timestamp);
    }
    if (status === 'completed' && timestamp) {
      updates.push('completed_at = ?');
      params.push(timestamp);
    }
    
    params.push(id);
    
    this.db.prepare(`UPDATE inspection_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return this.getTask(id);
  }

  saveResult(result, violations, checkDuplicate = true) {
    if (checkDuplicate && result.result_hash) {
      const existing = this.db.prepare(
        'SELECT * FROM inspection_results WHERE result_hash = ? ORDER BY created_at DESC LIMIT 1'
      ).get(result.result_hash);
      
      if (existing) {
        return {
          success: false,
          duplicate: true,
          existingResultId: existing.id,
          existingCreatedAt: existing.created_at,
          message: `检测到重复巡检结果，已存在记录 ID: ${existing.id}`
        };
      }
    }
    
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        INSERT INTO inspection_results (
          id, task_id, route_id, warehouse_id, result_hash,
          total_points, passed_points,
          has_forbidden_zone_violation, has_blind_zone_miss, has_height_violation
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        result.id,
        result.task_id,
        result.route_id,
        result.warehouse_id,
        result.result_hash,
        result.total_points,
        result.passed_points,
        result.has_forbidden_zone_violation ? 1 : 0,
        result.has_blind_zone_miss ? 1 : 0,
        result.has_height_violation ? 1 : 0
      );
      
      if (violations && violations.length > 0) {
        const vStmt = this.db.prepare(`
          INSERT INTO inspection_violations (
            id, result_id, violation_type, severity, description,
            location_x, location_y, location_z, suggestion,
            affected_shelf_code, waypoint_sequence
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        violations.forEach(v => {
          vStmt.run(
            v.id || uuidv4(),
            result.id,
            v.type,
            v.severity,
            v.description,
            v.location_x || null,
            v.location_y || null,
            v.location_z || null,
            JSON.stringify(v.suggestion),
            v.affected_shelf_code || null,
            v.waypoint_sequence || null
          );
        });
      }
      
      if (result.task_id) {
        this.updateTaskStatus(result.task_id, 'completed', new Date().toISOString());
      }
    });
    
    tx();
    
    return {
      success: true,
      id: result.id,
      violationsSaved: violations ? violations.length : 0
    };
  }

  getResult(id) {
    const result = this.db.prepare('SELECT * FROM inspection_results WHERE id = ?').get(id);
    if (result) {
      result.violations = this.db.prepare(
        'SELECT * FROM inspection_violations WHERE result_id = ? ORDER BY severity DESC, created_at'
      ).all(id).map(v => ({
        ...v,
        suggestion: JSON.parse(v.suggestion)
      }));
    }
    return result;
  }

  getResultsByWarehouse(warehouseId, limit = 50) {
    return this.db.prepare(`
      SELECT r.*, t.status as task_status
      FROM inspection_results r
      LEFT JOIN inspection_tasks t ON r.task_id = t.id
      WHERE r.warehouse_id = ?
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(warehouseId, limit);
  }

  getTaskHistory(routeId, warehouseId, limit = 10) {
    return this.db.prepare(`
      SELECT r.*, t.started_at, t.completed_at
      FROM inspection_results r
      JOIN inspection_tasks t ON r.task_id = t.id
      WHERE r.route_id = ? AND r.warehouse_id = ?
      ORDER BY r.created_at DESC
      LIMIT ?
    `).all(routeId, warehouseId, limit);
  }

  checkDuplicateResult(resultHash) {
    return this.db.prepare(
      'SELECT id, created_at FROM inspection_results WHERE result_hash = ? ORDER BY created_at DESC LIMIT 1'
    ).get(resultHash);
  }

  saveReport(report) {
    const existing = this.db.prepare('SELECT * FROM inspection_reports WHERE result_id = ?').get(report.result_id);
    if (existing) {
      return { success: false, existing: true, reportId: existing.id };
    }
    
    this.db.prepare(`
      INSERT INTO inspection_reports (id, result_id, content)
      VALUES (?, ?, ?)
    `).run(report.id, report.result_id, JSON.stringify(report.content));
    
    return { success: true, id: report.id };
  }

  getReport(resultId) {
    const report = this.db.prepare('SELECT * FROM inspection_reports WHERE result_id = ?').get(resultId);
    if (report) {
      report.content = JSON.parse(report.content);
    }
    return report;
  }
}

module.exports = {
  WarehouseStore,
  ShelfStore,
  RouteStore,
  ZoneStore,
  InspectionStore
};
