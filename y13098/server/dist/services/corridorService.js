"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCorridors = getAllCorridors;
exports.getCorridorById = getCorridorById;
exports.createCorridor = createCorridor;
exports.updateCorridor = updateCorridor;
exports.deleteCorridor = deleteCorridor;
const database_1 = require("../database");
const utils_1 = require("@shared/utils");
const toCorridor = (row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    startPoint: row.start_point,
    endPoint: row.end_point,
    length: row.length,
    altitudeMin: row.altitude_min,
    altitudeMax: row.altitude_max,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});
async function getAllCorridors() {
    const rows = await (0, database_1.runQuery)('SELECT * FROM route_corridors ORDER BY created_at DESC');
    return rows.map(toCorridor);
}
async function getCorridorById(id) {
    const row = await (0, database_1.runQueryOne)('SELECT * FROM route_corridors WHERE id = ?', [id]);
    return row ? toCorridor(row) : undefined;
}
async function createCorridor(data) {
    const id = (0, utils_1.generateId)();
    const now = new Date().toISOString();
    await (0, database_1.runExecute)(`INSERT INTO route_corridors 
     (id, name, code, start_point, end_point, length, altitude_min, altitude_max, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, data.name, data.code, data.startPoint, data.endPoint, data.length, data.altitudeMin, data.altitudeMax, now, now]);
    const corridor = await getCorridorById(id);
    if (!corridor)
        throw new Error('Failed to create corridor');
    return corridor;
}
async function updateCorridor(id, data) {
    const existing = await getCorridorById(id);
    if (!existing)
        return undefined;
    const updates = [];
    const params = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }
    if (data.code !== undefined) {
        updates.push('code = ?');
        params.push(data.code);
    }
    if (data.startPoint !== undefined) {
        updates.push('start_point = ?');
        params.push(data.startPoint);
    }
    if (data.endPoint !== undefined) {
        updates.push('end_point = ?');
        params.push(data.endPoint);
    }
    if (data.length !== undefined) {
        updates.push('length = ?');
        params.push(data.length);
    }
    if (data.altitudeMin !== undefined) {
        updates.push('altitude_min = ?');
        params.push(data.altitudeMin);
    }
    if (data.altitudeMax !== undefined) {
        updates.push('altitude_max = ?');
        params.push(data.altitudeMax);
    }
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);
    await (0, database_1.runExecute)(`UPDATE route_corridors SET ${updates.join(', ')} WHERE id = ?`, params);
    return getCorridorById(id);
}
async function deleteCorridor(id) {
    const result = await (0, database_1.runExecute)('DELETE FROM route_corridors WHERE id = ?', [id]);
    return result.changes > 0;
}
