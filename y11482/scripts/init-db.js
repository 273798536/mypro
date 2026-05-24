const knex = require('knex');
const config = require('../knexfile');

const environment = process.env.NODE_ENV || 'development';
const db = knex(config[environment]);

async function createTables() {
  console.log('开始创建数据库表...');

  await db.schema.createTable('import_sources', (table) => {
    table.uuid('id').primary();
    table.string('source_type').notNullable();
    table.string('source_file').notNullable();
    table.string('source_name').notNullable();
    table.integer('total_rows').defaultTo(0);
    table.integer('success_rows').defaultTo(0);
    table.integer('failed_rows').defaultTo(0);
    table.string('status').defaultTo('processing');
    table.uuid('imported_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.index(['source_type', 'created_at']);
  });

  await db.schema.createTable('sample_labels', (table) => {
    table.uuid('id').primary();
    table.uuid('import_source_id').references('import_sources.id');
    table.integer('source_line_number');
    table.string('source_raw_data', 2000);
    table.string('batch_no').notNullable();
    table.string('product_name').notNullable();
    table.string('product_code');
    table.string('pot_no').notNullable();
    table.timestamp('produce_time').notNullable();
    table.string('produce_line');
    table.string('sampler');
    table.timestamp('sample_time');
    table.string('sample_location');
    table.string('store_code');
    table.string('store_name');
    table.decimal('quantity', 10, 2);
    table.string('unit');
    table.string('storage_location');
    table.string('retention_period');
    table.string('status').defaultTo('active');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.index(['batch_no']);
    table.index(['pot_no']);
    table.index(['store_code']);
    table.index(['produce_time']);
  });

  await db.schema.createTable('temperature_records', (table) => {
    table.uuid('id').primary();
    table.uuid('import_source_id').references('import_sources.id');
    table.integer('source_line_number');
    table.string('source_raw_data', 2000);
    table.string('batch_no').notNullable();
    table.string('pot_no').notNullable();
    table.string('record_type').notNullable();
    table.decimal('temperature', 5, 2).notNullable();
    table.string('temperature_unit').defaultTo('C');
    table.timestamp('measure_time').notNullable();
    table.string('measure_point');
    table.string('measurer');
    table.string('equipment_code');
    table.string('status').defaultTo('normal');
    table.text('remark');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.index(['batch_no', 'pot_no']);
    table.index(['measure_time']);
  });

  await db.schema.createTable('store_complaints', (table) => {
    table.uuid('id').primary();
    table.uuid('import_source_id').references('import_sources.id');
    table.integer('source_line_number');
    table.string('source_raw_data', 2000);
    table.string('complaint_no').unique().notNullable();
    table.string('store_code').notNullable();
    table.string('store_name').notNullable();
    table.string('batch_no');
    table.string('pot_no');
    table.string('product_name');
    table.string('product_code');
    table.timestamp('complaint_time').notNullable();
    table.string('complaint_type').notNullable();
    table.string('complaint_level').defaultTo('normal');
    table.text('complaint_content').notNullable();
    table.string('complainant');
    table.string('complainant_contact');
    table.string('handler');
    table.timestamp('handle_time');
    table.string('handle_result');
    table.string('status').defaultTo('pending');
    table.text('remark');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.index(['store_code']);
    table.index(['batch_no', 'pot_no']);
    table.index(['complaint_time']);
    table.index(['status']);
  });

  await db.schema.createTable('refund_records', (table) => {
    table.uuid('id').primary();
    table.uuid('import_source_id').references('import_sources.id');
    table.integer('source_line_number');
    table.string('source_raw_data', 2000);
    table.string('refund_no').unique().notNullable();
    table.string('store_code').notNullable();
    table.string('store_name').notNullable();
    table.string('batch_no');
    table.string('pot_no');
    table.string('product_name');
    table.string('product_code');
    table.decimal('refund_amount', 12, 2).notNullable();
    table.decimal('refund_quantity', 10, 2);
    table.string('refund_reason').notNullable();
    table.timestamp('refund_time').notNullable();
    table.string('refund_channel');
    table.string('related_complaint_no');
    table.string('status').defaultTo('completed');
    table.text('remark');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.index(['store_code']);
    table.index(['batch_no', 'pot_no']);
    table.index(['refund_time']);
  });

  await db.schema.createTable('inventory_differences', (table) => {
    table.uuid('id').primary();
    table.uuid('import_source_id').references('import_sources.id');
    table.integer('source_line_number');
    table.string('source_raw_data', 2000);
    table.string('diff_no').unique().notNullable();
    table.string('store_code').notNullable();
    table.string('store_name').notNullable();
    table.string('batch_no');
    table.string('pot_no');
    table.string('product_name');
    table.string('product_code');
    table.decimal('expected_quantity', 10, 2);
    table.decimal('actual_quantity', 10, 2);
    table.decimal('diff_quantity', 10, 2);
    table.decimal('diff_amount', 12, 2);
    table.string('diff_type');
    table.timestamp('check_time').notNullable();
    table.string('checker');
    table.string('status').defaultTo('pending');
    table.text('remark');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.index(['store_code']);
    table.index(['batch_no', 'pot_no']);
    table.index(['check_time']);
    table.index(['status']);
  });

  await db.schema.createTable('compensation_queue', (table) => {
    table.uuid('id').primary();
    table.string('idempotent_key').unique();
    table.string('source_type').notNullable();
    table.string('source_id').notNullable();
    table.string('batch_no').notNullable();
    table.string('pot_no').notNullable();
    table.string('store_code');
    table.string('store_name');
    table.string('product_name');
    table.string('action_type').notNullable();
    table.string('priority').defaultTo('normal');
    table.string('status').defaultTo('pending');
    table.integer('retry_count').defaultTo(0);
    table.integer('max_retry_count').defaultTo(3);
    table.integer('retry_interval').defaultTo(300);
    table.timestamp('next_retry_time');
    table.timestamp('last_retry_time');
    table.text('last_error');
    table.string('error_code');
    table.jsonb('payload');
    table.text('result');
    table.uuid('handled_by');
    table.timestamp('handled_at');
    table.timestamp('completed_at');
    table.uuid('created_by');
    table.uuid('updated_by');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
    table.unique(['source_type', 'source_id', 'action_type']);
    table.index(['status', 'priority']);
    table.index(['batch_no', 'pot_no']);
    table.index(['store_code']);
    table.index(['next_retry_time']);
    table.index(['idempotent_key']);
  });

  await db.schema.createTable('audit_logs', (table) => {
    table.uuid('id').primary();
    table.string('operation_type').notNullable();
    table.string('entity_type').notNullable();
    table.string('entity_id').notNullable();
    table.string('field_name');
    table.text('old_value');
    table.text('new_value');
    table.jsonb('diff_detail');
    table.uuid('operator_id');
    table.string('operator_name');
    table.string('operation_remark');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.index(['entity_type', 'entity_id']);
    table.index(['operation_type']);
    table.index(['created_at']);
  });

  await db.schema.createTable('batch_inquiries', (table) => {
    table.uuid('id').primary();
    table.string('inquiry_no').unique().notNullable();
    table.string('batch_no').notNullable();
    table.string('pot_no');
    table.text('inquiry_reason');
    table.string('inquiry_type');
    table.string('status').defaultTo('processing');
    table.jsonb('related_records');
    table.uuid('initiated_by');
    table.timestamp('initiated_at').defaultTo(db.fn.now());
    table.timestamp('completed_at');
    table.text('conclusion');
    table.index(['batch_no', 'pot_no']);
    table.index(['status']);
    table.index(['initiated_at']);
  });

  console.log('数据库表创建完成!');
  await db.destroy();
}

createTables().catch((err) => {
  console.error('创建数据库表失败:', err);
  process.exit(1);
});
