import { initDatabase, getDb } from '../api/db/connection';

function seedPromptVersions() {
  const db = getDb();
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO prompt_versions (id, version, content, description, effective_from, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    'pv_001',
    'v1.0.0',
    '你是一个客服机器人，请识别用户意图，从以下选项中选择：退款、换货、咨询、技术支持、其他',
    '初始版本，基础意图分类',
    '2026-01-01 00:00:00',
    0,
    'system'
  );

  insertStmt.run(
    'pv_002',
    'v1.1.0',
    '你是一个客服机器人，请识别用户意图，从以下选项中选择：退款申请、换货申请、投诉、咨询、技术支持、其他。请根据上下文判断用户的真实需求。',
    '优化意图分类描述，增加投诉类别',
    '2026-03-15 00:00:00',
    0,
    'engineer_li'
  );

  insertStmt.run(
    'pv_003',
    'v2.0.0',
    '你是一个专业的电商客服机器人，请根据对话上下文识别用户真实意图。可选意图包括：退款申请、换货申请、投诉、咨询、技术支持、其他。请特别注意用户可能隐含的抱怨情绪和未明确表达的真实需求。',
    '大版本升级，增加上下文理解能力和情绪识别',
    '2026-06-01 00:00:00',
    1,
    'engineer_wang'
  );

  console.log('Prompt versions seeded');
}

function seedMaterialBatches() {
  const db = getDb();
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO material_batches (id, name, source_type, file_name, total_records, processed_records, error_records, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStmt.run(
    'batch_001',
    '6月上旬标注记录',
    'annotation_record',
    'annotations_20260601_0610.xlsx',
    156,
    156,
    3,
    'completed'
  );

  insertStmt.run(
    'batch_002',
    '临时补录切分清单',
    'segmentation_list',
    'segmentation_temp_20260612.csv',
    89,
    89,
    8,
    'completed'
  );

  insertStmt.run(
    'batch_003',
    '历史训练样本(带旧备注)',
    'training_sample',
    'training_samples_with_remarks_202605.json',
    234,
    234,
    12,
    'completed'
  );

  console.log('Material batches seeded');
}

async function main() {
  console.log('Initializing database...');
  initDatabase();
  
  console.log('Seeding initial data...');
  seedPromptVersions();
  seedMaterialBatches();
  
  console.log('Database initialization complete!');
}

main().catch(console.error);
