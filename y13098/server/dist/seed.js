"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const utils_1 = require("@shared/utils");
const corridors = [
    { id: 'COR-001', name: '东区主航线', code: 'E-MAIN', start: 'A点', end: 'B点', length: 15.5, minAlt: 100, maxAlt: 300 },
    { id: 'COR-002', name: '西区备用航线', code: 'W-BACKUP', start: 'C点', end: 'D点', length: 22.3, minAlt: 80, maxAlt: 250 },
    { id: 'COR-003', name: '南区临时航线', code: 'S-TEMP', start: 'E点', end: 'F点', length: 18.0, minAlt: 120, maxAlt: 350 }
];
const records = [
    { corridor: 'COR-001', date: '2026-06-10', type: 'normal', title: '东区主航线日常巡检', desc: '航线巡检正常，无异常情况', status: 'confirmed', overlap: false, confirmedBy: '小赵' },
    { corridor: 'COR-001', date: '2026-06-10', type: 'temporary', title: '东区主航线临时说明', desc: '因天气原因调整飞行高度，口头通知已确认', status: 'pending', overlap: true, confirmedBy: null },
    { corridor: 'COR-001', date: '2026-06-09', type: 'abnormal', title: '东区主航线异常记录', desc: '发现障碍物，需要重新评估航线剖面', status: 'modified', overlap: false, confirmedBy: '小赵' },
    { corridor: 'COR-002', date: '2026-06-10', type: 'normal', title: '西区备用航线巡检', desc: '备用航线状态良好，可随时启用', status: 'confirmed', overlap: false, confirmedBy: '小赵' },
    { corridor: 'COR-003', date: '2026-06-08', type: 'normal', title: '南区临时航线巡检', desc: '临时航线首次试飞，数据已采集', status: 'pending', overlap: false, confirmedBy: null },
    { corridor: 'COR-002', date: '2026-06-07', type: 'temporary', title: '西区备用航线口头说明', desc: '临时调整航线宽度，已口头报备', status: 'confirmed', overlap: false, confirmedBy: '小赵' },
    { corridor: 'COR-001', date: '2026-06-06', type: 'normal', title: '东区主航线日常巡检', desc: '正常巡检，各项指标符合要求', status: 'confirmed', overlap: false, confirmedBy: '小赵' },
    { corridor: 'COR-003', date: '2026-06-05', type: 'abnormal', title: '南区临时航线异常', desc: '发现信号干扰，需要排查原因', status: 'pending', overlap: false, confirmedBy: null }
];
const materials = [
    { record: 0, type: 'photo', name: '东区主航线全景照.jpg', url: '/uploads/sample1.jpg', modified: false, desc: '' },
    { record: 0, type: 'photo', name: '东区主航线剖面图.jpg', url: '/uploads/sample2.jpg', modified: true, desc: '更新了高度标注' },
    { record: 1, type: 'note', name: '口头说明记录.doc', url: '/uploads/note1.doc', modified: false, desc: '' },
    { record: 1, type: 'photo', name: '天气云图.jpg', url: '/uploads/weather.jpg', modified: true, desc: '补充了天气情况说明' },
    { record: 2, type: 'photo', name: '障碍物现场照.jpg', url: '/uploads/obstacle.jpg', modified: false, desc: '' },
    { record: 2, type: 'document', name: '航线重评估报告.pdf', url: '/uploads/report.pdf', modified: true, desc: '修改了推荐高度' },
    { record: 3, type: 'photo', name: '西区备用航线航拍.jpg', url: '/uploads/west.jpg', modified: false, desc: '' }
];
const notes = [
    { record: 0, content: '该段航线本周已完成3次巡检，数据稳定' },
    { record: 1, content: '需确认天气调整是否有正式书面通知' },
    { record: 2, content: '障碍物已标记，下周安排清除' }
];
const history = [
    { record: 0, field: 'status', old: 'pending', new: 'confirmed', type: 'confirm', by: '小赵', remark: '审核通过，数据完整' },
    { record: 2, field: 'status', old: 'pending', new: 'modified', type: 'status_change', by: '小赵', remark: '需要补充重新评估方案' },
    { record: 2, field: 'description', old: '发现障碍物', new: '发现障碍物，需要重新评估航线剖面', type: 'update', by: '小赵', remark: '补充说明' },
    { record: 3, field: 'record', type: 'create', by: '小赵', remark: '创建巡检记录' },
    { record: 5, field: 'status', old: 'pending', new: 'confirmed', type: 'confirm', by: '小赵', remark: '口头报备已核实' }
];
async function seed() {
    console.log('Starting database seed...');
    await (0, database_1.initDatabase)();
    const db = (0, database_1.getDatabase)();
    const now = new Date().toISOString();
    for (const c of corridors) {
        await (0, database_1.runExecute)(`INSERT OR REPLACE INTO route_corridors 
       (id, name, code, start_point, end_point, length, altitude_min, altitude_max, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [c.id, c.name, c.code, c.start, c.end, c.length, c.minAlt, c.maxAlt, now, now]);
        console.log(`Seeded corridor: ${c.name}`);
    }
    const recordIds = [];
    for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const id = (0, utils_1.generateId)();
        recordIds.push(id);
        await (0, database_1.runExecute)(`INSERT OR REPLACE INTO inspection_records 
       (id, corridor_id, record_date, record_type, title, description, status, is_overlapping, 
        confirmed_by, confirmed_at, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, r.corridor, r.date, r.type, r.title, r.desc, r.status, r.overlap ? 1 : 0,
            r.confirmedBy, r.confirmedBy ? now : null, now, now, '小赵']);
        console.log(`Seeded record: ${r.title}`);
    }
    for (const m of materials) {
        const id = (0, utils_1.generateId)();
        const recordId = recordIds[m.record];
        const maxVersionRow = await new Promise((resolve) => {
            db.get('SELECT COALESCE(MAX(version), 0) as max_version FROM material_versions WHERE record_id = ? AND material_type = ?', [recordId, m.type], (_err, row) => resolve(row));
        });
        const version = (maxVersionRow?.max_version || 0) + 1;
        await (0, database_1.runExecute)(`INSERT INTO material_versions 
       (id, record_id, version, material_type, file_name, file_url, is_caliber_modified, 
        modified_description, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, recordId, version, m.type, m.name, m.url, m.modified ? 1 : 0, m.desc, now, '小赵']);
        console.log(`Seeded material: ${m.name}`);
    }
    for (const n of notes) {
        const id = (0, utils_1.generateId)();
        const recordId = recordIds[n.record];
        await (0, database_1.runExecute)(`INSERT INTO manual_notes 
       (id, record_id, content, created_at, created_by, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`, [id, recordId, n.content, now, '小赵', now]);
        console.log('Seeded note');
    }
    for (const h of history) {
        const id = (0, utils_1.generateId)();
        const recordId = recordIds[h.record];
        await (0, database_1.runExecute)(`INSERT INTO history_changes 
       (id, record_id, field_name, old_value, new_value, change_type, changed_by, changed_at, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, recordId, h.field, h.old || null, h.new || null, h.type, h.by, now, h.remark]);
        console.log('Seeded history change');
    }
    await (0, database_1.runExecute)(`INSERT OR REPLACE INTO users (id, name, role) VALUES (?, ?, ?)`, ['user-001', '小赵', 'manager']);
    console.log('Seeded user: 小赵');
    console.log('Database seed completed!');
    process.exit(0);
}
seed().catch(console.error);
