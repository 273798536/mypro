const { allAsync, getAsync } = require('../config/database');
const { Parser } = require('json2csv');

class ReportService {
  async getVarianceReport(filters = {}) {
    let sql = `
      SELECT 
        w.id as wave_id,
        w.wave_no,
        w.warehouse_code,
        w.zone_code,
        w.team_code,
        w.status as wave_status,
        wi.id as wave_item_id,
        wi.sku_code,
        wi.sku_name,
        wi.location_code,
        wi.plan_qty,
        wi.picked_qty,
        wi.shortage_qty,
        wi.replenished_qty,
        wi.shortage_reason,
        wi.is_replenished,
        pr.picker_code,
        pr.diff_qty as picking_diff,
        pr.diff_type,
        rs.reviewer_code,
        rs.scan_qty,
        rt.task_no,
        rt.status as replenish_status,
        rt.replenish_qty as task_replenish_qty,
        w.created_at as wave_created_at,
        w.updated_at as wave_updated_at
      FROM waves w
      JOIN wave_items wi ON w.id = wi.wave_id
      LEFT JOIN picking_records pr ON wi.id = pr.wave_item_id
      LEFT JOIN review_scans rs ON wi.id = rs.wave_item_id
      LEFT JOIN replenishment_tasks rt ON wi.id = rt.wave_item_id
      WHERE 1=1
    `;
    
    const params = [];

    if (filters.teamCode) {
      sql += ` AND w.team_code = ?`;
      params.push(filters.teamCode);
    }
    if (filters.zoneCode) {
      sql += ` AND w.zone_code = ?`;
      params.push(filters.zoneCode);
    }
    if (filters.warehouseCode) {
      sql += ` AND w.warehouse_code = ?`;
      params.push(filters.warehouseCode);
    }
    if (filters.skuCode) {
      sql += ` AND wi.sku_code = ?`;
      params.push(filters.skuCode);
    }
    if (filters.hasShortage) {
      sql += ` AND wi.shortage_qty > 0`;
    }
    if (filters.startDate) {
      sql += ` AND DATE(w.created_at) >= DATE(?)`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ` AND DATE(w.created_at) <= DATE(?)`;
      params.push(filters.endDate);
    }

    sql += ` ORDER BY w.created_at DESC, wi.sku_code`;

    const records = await allAsync(sql, params);

    const summary = {
      totalRecords: records.length,
      totalPlanQty: 0,
      totalPickedQty: 0,
      totalShortageQty: 0,
      totalReplenishedQty: 0,
      byTeam: {},
      byZone: {},
      bySku: {},
      byStatus: {},
      shortageReasons: {}
    };

    for (const r of records) {
      summary.totalPlanQty += r.plan_qty || 0;
      summary.totalPickedQty += r.picked_qty || 0;
      summary.totalShortageQty += r.shortage_qty || 0;
      summary.totalReplenishedQty += r.replenished_qty || 0;

      summary.byTeam[r.team_code] = summary.byTeam[r.team_code] || { 
        shortageQty: 0, replenishedQty: 0, planQty: 0 
      };
      summary.byTeam[r.team_code].shortageQty += r.shortage_qty || 0;
      summary.byTeam[r.team_code].replenishedQty += r.replenished_qty || 0;
      summary.byTeam[r.team_code].planQty += r.plan_qty || 0;

      summary.byZone[r.zone_code] = summary.byZone[r.zone_code] || { 
        shortageQty: 0, replenishedQty: 0 
      };
      summary.byZone[r.zone_code].shortageQty += r.shortage_qty || 0;
      summary.byZone[r.zone_code].replenishedQty += r.replenished_qty || 0;

      summary.bySku[r.sku_code] = summary.bySku[r.sku_code] || { 
        shortageQty: 0, replenishedQty: 0, skuName: r.sku_name 
      };
      summary.bySku[r.sku_code].shortageQty += r.shortage_qty || 0;
      summary.bySku[r.sku_code].replenishedQty += r.replenished_qty || 0;

      summary.byStatus[r.wave_status] = (summary.byStatus[r.wave_status] || 0) + 1;

      if (r.shortage_reason) {
        summary.shortageReasons[r.shortage_reason] = 
          (summary.shortageReasons[r.shortage_reason] || 0) + (r.shortage_qty || 0);
      }
    }

    return { records, summary };
  }

  async exportToCSV(data, fields) {
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  async getWaveFullDetail(waveId) {
    const wave = await getAsync(`SELECT * FROM waves WHERE id = ?`, [waveId]);
    if (!wave) return null;

    const items = await allAsync(`SELECT * FROM wave_items WHERE wave_id = ?`, [waveId]);
    const pickingRecords = await allAsync(`SELECT * FROM picking_records WHERE wave_id = ?`, [waveId]);
    const reviewScans = await allAsync(`SELECT * FROM review_scans WHERE wave_id = ?`, [waveId]);
    const replenishmentTasks = await allAsync(`SELECT * FROM replenishment_tasks WHERE wave_id = ?`, [waveId]);
    const locationOccupations = await allAsync(`SELECT * FROM location_occupations WHERE wave_id = ?`, [waveId]);
    const performance = await allAsync(`SELECT * FROM performance_records WHERE wave_id = ? AND is_valid = 1`, [waveId]);
    const appeals = await allAsync(`SELECT * FROM appeals WHERE wave_id = ?`, [waveId]);
    const history = await allAsync(`SELECT * FROM operation_history WHERE wave_id = ? ORDER BY created_at DESC`, [waveId]);

    return {
      wave,
      items,
      pickingRecords,
      reviewScans,
      replenishmentTasks,
      locationOccupations,
      performance,
      appeals,
      history: history.map(h => ({
        ...h,
        change_content: h.change_content ? JSON.parse(h.change_content) : null
      }))
    };
  }
}

module.exports = new ReportService();
