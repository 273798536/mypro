"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCabinets = getAllCabinets;
exports.getCabinetDetail = getCabinetDetail;
exports.generateReport = generateReport;
exports.recalculateHotSkuFullStatus = recalculateHotSkuFullStatus;
exports.applyNetworkRecoveryDeduction = applyNetworkRecoveryDeduction;
exports.getDataConsistencyReport = getDataConsistencyReport;
const dayjs_1 = __importDefault(require("dayjs"));
const database_1 = require("../db/database");
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, database_1.getDb)().run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
}
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, database_1.getDb)().get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row || null);
        });
    });
}
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        (0, database_1.getDb)().all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
async function getAllCabinets() {
    const sql = `
    SELECT DISTINCT cabinet_id 
    FROM cabinet_inventory 
    WHERE status IN ('valid', 'fixed')
  `;
    const rows = await dbAll(sql);
    return rows.map((r) => r.cabinet_id);
}
async function getCabinetDetail(cabinetId) {
    const inventorySql = `
    SELECT ci.*, ib.file_name as source_file, ib.import_time
    FROM cabinet_inventory ci
    LEFT JOIN import_batches ib ON ci.batch_id = ib.id
    WHERE ci.cabinet_id = ? AND ci.status IN ('valid', 'fixed')
    ORDER BY ci.record_time DESC
  `;
    const inventoryRecords = await dbAll(inventorySql, [cabinetId]);
    const restockSql = `
    SELECT rp.*, ib.file_name as source_file, ib.import_time
    FROM restock_photos rp
    LEFT JOIN import_batches ib ON rp.batch_id = ib.id
    WHERE rp.cabinet_id = ? AND rp.status IN ('valid', 'fixed')
    ORDER BY rp.photo_time DESC
  `;
    const restockRecords = await dbAll(restockSql, [cabinetId]);
    const refundSql = `
    SELECT rr.*, ib.file_name as source_file, ib.import_time
    FROM refund_records rr
    LEFT JOIN import_batches ib ON rr.batch_id = ib.id
    WHERE rr.cabinet_id = ? AND rr.status IN ('valid', 'fixed')
    ORDER BY rr.refund_time DESC
  `;
    const refundRecords = await dbAll(refundSql, [cabinetId]);
    const exceptionSql = `
    SELECT ep.*, ib.file_name as source_file, ib.import_time
    FROM exception_photos ep
    LEFT JOIN import_batches ib ON ep.batch_id = ib.id
    WHERE ep.cabinet_id = ? AND ep.status IN ('valid', 'fixed')
    ORDER BY ep.exception_time DESC
  `;
    const exceptionRecords = await dbAll(exceptionSql, [cabinetId]);
    const smsSql = `
    SELECT ss.*, ib.file_name as source_file, ib.import_time
    FROM sms_screenshots ss
    LEFT JOIN import_batches ib ON ss.batch_id = ib.id
    WHERE ss.cabinet_id = ? AND ss.status IN ('valid', 'fixed')
    ORDER BY ss.send_time DESC
  `;
    const smsRecords = await dbAll(smsSql, [cabinetId]);
    const initialStock = inventoryRecords.length > 0
        ? Math.min(...inventoryRecords.map((r) => r.stock_quantity))
        : 0;
    const currentStock = inventoryRecords.length > 0
        ? Math.max(...inventoryRecords.map((r) => r.stock_quantity))
        : 0;
    const restockQuantity = restockRecords.reduce((sum, r) => sum + (r.restock_quantity || 0), 0);
    const refundCount = refundRecords.length;
    const exceptionCount = exceptionRecords.length;
    const hotSkuFullCount = inventoryRecords.filter((r) => r.is_hot_sku === 1 && r.is_full === 1).length;
    const cabinetName = inventoryRecords[0]?.cabinet_name || '';
    const city = inventoryRecords[0]?.city || '';
    const lastUpdateTime = inventoryRecords.length > 0
        ? inventoryRecords[0].record_time
        : (0, dayjs_1.default)().toISOString();
    const salesQuantity = Math.max(0, initialStock + restockQuantity - currentStock);
    return {
        summary: {
            cabinetId,
            cabinetName,
            city,
            initialStock,
            restockQuantity,
            salesQuantity,
            currentStock,
            refundCount,
            exceptionCount,
            hotSkuFullCount,
            lastUpdateTime
        },
        inventoryRecords: inventoryRecords.map((r) => ({
            ...r,
            originalLineNumber: r.original_line_number,
            sourceFile: r.source_file
        })),
        restockRecords: restockRecords.map((r) => ({
            ...r,
            originalLineNumber: r.original_line_number,
            sourceFile: r.source_file
        })),
        refundRecords: refundRecords.map((r) => ({
            ...r,
            originalLineNumber: r.original_line_number,
            sourceFile: r.source_file
        })),
        exceptionRecords: exceptionRecords.map((r) => ({
            ...r,
            originalLineNumber: r.original_line_number,
            sourceFile: r.source_file
        })),
        smsRecords: smsRecords.map((r) => ({
            ...r,
            originalLineNumber: r.original_line_number,
            sourceFile: r.source_file
        }))
    };
}
async function generateReport(city) {
    let sql = `
    SELECT DISTINCT ci.cabinet_id, ci.cabinet_name, ci.city
    FROM cabinet_inventory ci
    WHERE ci.status IN ('valid', 'fixed')
  `;
    const params = [];
    if (city) {
        sql += " AND ci.city = ?";
        params.push(city);
    }
    sql += " ORDER BY ci.city, ci.cabinet_id";
    const cabinets = await dbAll(sql, params);
    const results = [];
    for (const cab of cabinets) {
        const detail = await getCabinetDetail(cab.cabinet_id);
        results.push(detail.summary);
    }
    return results;
}
async function recalculateHotSkuFullStatus() {
    const hotSkusSql = `
    SELECT DISTINCT sku_id, cabinet_id, slot_id
    FROM cabinet_inventory
    WHERE is_hot_sku = 1 AND status IN ('valid', 'fixed')
  `;
    const hotSkus = await dbAll(hotSkusSql);
    let updatedCount = 0;
    for (const sku of hotSkus) {
        const recordsSql = `
      SELECT stock_quantity, max_capacity, id, is_full
      FROM cabinet_inventory
      WHERE sku_id = ? AND cabinet_id = ? AND slot_id = ?
        AND status IN ('valid', 'fixed')
      ORDER BY record_time DESC
    `;
        const records = await dbAll(recordsSql, [sku.sku_id, sku.cabinet_id, sku.slot_id]);
        if (records.length >= 2) {
            const latest = records[0];
            const previous = records[1];
            const wasFull = previous.is_full === 1 ||
                previous.stock_quantity >= previous.max_capacity * 0.9;
            const nowNotFull = latest.is_full === 0 &&
                latest.stock_quantity < latest.max_capacity * 0.5;
            if (wasFull && nowNotFull) {
                const updateSql = `
          UPDATE cabinet_inventory
          SET is_full = 0, updated_at = ?
          WHERE id = ?
        `;
                await dbRun(updateSql, [(0, dayjs_1.default)().toISOString(), latest.id]);
                updatedCount++;
            }
        }
    }
    return { updated: updatedCount, total: hotSkus.length };
}
async function applyNetworkRecoveryDeduction(cabinetId, deductionAmount) {
    const latestSql = `
    SELECT id, stock_quantity
    FROM cabinet_inventory
    WHERE cabinet_id = ? AND status IN ('valid', 'fixed')
    ORDER BY record_time DESC
    LIMIT 1
  `;
    const latestRecord = await dbGet(latestSql, [cabinetId]);
    if (!latestRecord) {
        return false;
    }
    const newStock = Math.max(0, latestRecord.stock_quantity - deductionAmount);
    const updateSql = `
    UPDATE cabinet_inventory
    SET stock_quantity = ?, updated_at = ?
    WHERE id = ?
  `;
    await dbRun(updateSql, [newStock, (0, dayjs_1.default)().toISOString(), latestRecord.id]);
    return true;
}
async function getDataConsistencyReport() {
    const issues = [];
    const invalidInvSql = `SELECT COUNT(*) as count FROM cabinet_inventory WHERE status = 'invalid'`;
    const invalidInventory = await dbGet(invalidInvSql);
    if (invalidInventory && invalidInventory.count > 0) {
        issues.push({
            type: 'invalid_inventory',
            count: invalidInventory.count,
            description: `存在 ${invalidInventory.count} 条无效的柜机库存记录`
        });
    }
    const orphanRestockSql = `
    SELECT COUNT(*) as count 
    FROM restock_photos rp
    LEFT JOIN cabinet_inventory ci ON rp.cabinet_id = ci.cabinet_id
    WHERE ci.cabinet_id IS NULL AND rp.status IN ('valid', 'fixed')
  `;
    const orphanRestock = await dbGet(orphanRestockSql);
    if (orphanRestock && orphanRestock.count > 0) {
        issues.push({
            type: 'orphan_restock',
            count: orphanRestock.count,
            description: `存在 ${orphanRestock.count} 条补货记录没有对应的柜机库存数据`
        });
    }
    const negativeStockSql = `
    SELECT COUNT(*) as count 
    FROM cabinet_inventory 
    WHERE stock_quantity < 0 AND status IN ('valid', 'fixed')
  `;
    const negativeStock = await dbGet(negativeStockSql);
    if (negativeStock && negativeStock.count > 0) {
        issues.push({
            type: 'negative_stock',
            count: negativeStock.count,
            description: `存在 ${negativeStock.count} 条库存数量为负的记录`
        });
    }
    return {
        isConsistent: issues.length === 0,
        issues
    };
}
//# sourceMappingURL=report.js.map