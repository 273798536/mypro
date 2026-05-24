"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = generateReport;
const database_1 = require("../db/database");
async function generateReport() {
    const totalRecords = await (0, database_1.get)('SELECT COUNT(*) as count FROM material_records');
    const dirtyRecords = await (0, database_1.get)("SELECT COUNT(*) as count FROM material_records WHERE status = 'dirty'");
    const fixedRecords = await (0, database_1.get)("SELECT COUNT(*) as count FROM material_records WHERE status = 'fixed'");
    const importedRecords = await (0, database_1.get)("SELECT COUNT(*) as count FROM material_records WHERE status = 'imported'");
    const byPlatform = await (0, database_1.all)('SELECT platform, COUNT(*) as count FROM material_records GROUP BY platform');
    const byDirtyType = await (0, database_1.all)('SELECT dirty_type, COUNT(*) as count FROM dirty_records WHERE fixed = 0 GROUP BY dirty_type');
    const failedList = await (0, database_1.all)(`
    SELECT 
      mr.source_line,
      mr.material_id,
      mr.material_name,
      GROUP_CONCAT(dr.dirty_type, ';') as dirty_types,
      GROUP_CONCAT(dr.suggestion, ';') as suggestions
    FROM material_records mr
    JOIN dirty_records dr ON mr.id = dr.record_id
    WHERE dr.fixed = 0
    GROUP BY mr.id
    ORDER BY mr.source_line
  `);
    const byPlatformMap = {};
    for (const item of byPlatform) {
        byPlatformMap[item.platform] = item.count;
    }
    const byDirtyTypeMap = {};
    for (const item of byDirtyType) {
        byDirtyTypeMap[item.dirty_type] = item.count;
    }
    return {
        totalRecords: totalRecords?.count ?? 0,
        dirtyRecords: dirtyRecords?.count ?? 0,
        fixedRecords: fixedRecords?.count ?? 0,
        importedRecords: importedRecords?.count ?? 0,
        byPlatform: byPlatformMap,
        byDirtyType: byDirtyTypeMap,
        failedList: failedList.map(item => ({
            source_line: item.source_line,
            material_id: item.material_id,
            material_name: item.material_name,
            dirty_types: item.dirty_types ? item.dirty_types.split(';') : [],
            suggestions: item.suggestions ? item.suggestions.split(';') : []
        }))
    };
}
//# sourceMappingURL=reportService.js.map