"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportCleanRecords = exportCleanRecords;
exports.exportDirtyRecords = exportDirtyRecords;
exports.exportFixedRecords = exportFixedRecords;
const csv_writer_1 = require("csv-writer");
const database_1 = require("../db/database");
async function exportCleanRecords(filePath) {
    const records = await (0, database_1.all)(`SELECT * FROM material_records 
     WHERE status IN ('fixed', 'approved', 'imported')
     ORDER BY record_date, material_id`);
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: filePath,
        header: [
            { id: 'source_line', title: '原始行号' },
            { id: 'material_id', title: '素材ID' },
            { id: 'material_name', title: '素材名称' },
            { id: 'platform', title: '平台' },
            { id: 'record_date', title: '日期' },
            { id: 'impressions', title: '曝光量' },
            { id: 'clicks', title: '点击量' },
            { id: 'cost', title: '花费' },
            { id: 'audit_status', title: '审核状态' },
            { id: 'audit_reason', title: '审核原因' },
            { id: 'status', title: '状态' },
            { id: 'source', title: '来源' }
        ]
    });
    await csvWriter.writeRecords(records.map(r => ({
        source_line: r.source_line,
        material_id: r.material_id,
        material_name: r.material_name,
        platform: r.platform,
        record_date: r.record_date,
        impressions: r.impressions,
        clicks: r.clicks,
        cost: r.cost,
        audit_status: r.audit_status,
        audit_reason: r.audit_reason,
        status: r.status,
        source: r.source
    })));
    console.log(`已导出 ${records.length} 条清洗后的记录到 ${filePath}`);
}
async function exportDirtyRecords(filePath) {
    const records = await (0, database_1.all)(`
    SELECT 
      mr.source_line,
      mr.material_id,
      mr.material_name,
      mr.platform,
      mr.record_date,
      dr.dirty_type,
      dr.field_name,
      dr.expected_value,
      dr.actual_value,
      dr.suggestion,
      mr.raw_data
    FROM material_records mr
    JOIN dirty_records dr ON mr.id = dr.record_id
    WHERE dr.fixed = 0
    ORDER BY mr.source_line, dr.created_at
  `);
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: filePath,
        header: [
            { id: 'source_line', title: '原始行号' },
            { id: 'material_id', title: '素材ID' },
            { id: 'material_name', title: '素材名称' },
            { id: 'platform', title: '平台' },
            { id: 'record_date', title: '日期' },
            { id: 'dirty_type', title: '脏数据类型' },
            { id: 'field_name', title: '字段名' },
            { id: 'expected_value', title: '期望值' },
            { id: 'actual_value', title: '实际值' },
            { id: 'suggestion', title: '处理建议' },
            { id: 'raw_data', title: '原始数据' }
        ]
    });
    await csvWriter.writeRecords(records);
    console.log(`已导出 ${records.length} 条脏数据记录到 ${filePath}`);
}
async function exportFixedRecords(filePath) {
    const records = await (0, database_1.all)(`
    SELECT 
      mr.source_line,
      mr.material_id,
      mr.material_name,
      mr.platform,
      mr.record_date,
      ch.field_name,
      ch.old_value,
      ch.new_value,
      ch.change_reason,
      ch.changed_by,
      ch.changed_at
    FROM material_records mr
    JOIN change_history ch ON mr.id = ch.record_id
    ORDER BY mr.source_line, ch.changed_at
  `);
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: filePath,
        header: [
            { id: 'source_line', title: '原始行号' },
            { id: 'material_id', title: '素材ID' },
            { id: 'material_name', title: '素材名称' },
            { id: 'platform', title: '平台' },
            { id: 'record_date', title: '日期' },
            { id: 'field_name', title: '修改字段' },
            { id: 'old_value', title: '原值' },
            { id: 'new_value', title: '新值' },
            { id: 'change_reason', title: '修改原因' },
            { id: 'changed_by', title: '修改人' },
            { id: 'changed_at', title: '修改时间' }
        ]
    });
    await csvWriter.writeRecords(records);
    console.log(`已导出 ${records.length} 条修改记录到 ${filePath}`);
}
//# sourceMappingURL=exportService.js.map