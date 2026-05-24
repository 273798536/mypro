import knex from 'knex';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import logger from '../utils/logger';

const dbDir = path.dirname(config.db.path);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = knex({
  client: 'sqlite3',
  connection: {
    filename: config.db.path,
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn: any, done: any) => {
      conn.run('PRAGMA foreign_keys = ON');
      done();
    },
  },
});

export async function initDatabase() {
  try {
    const hasTable = await db.schema.hasTable('exception_receipts');
    if (!hasTable) {
      await createTables();
      logger.info('Database tables created successfully');
    } else {
      logger.info('Database tables already exist');
    }
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}

async function createTables() {
  await db.schema.createTable('borrow_applications', (table) => {
    table.string('id').primary();
    table.string('application_no').unique().notNullable();
    table.string('reader_id').notNullable().index();
    table.string('reader_name').notNullable();
    table.string('book_id').notNullable();
    table.string('book_title').notNullable();
    table.string('source_library').notNullable();
    table.string('target_library').notNullable();
    table.dateTime('apply_date').notNullable();
    table.dateTime('borrow_date');
    table.dateTime('due_date');
    table.dateTime('return_date');
    table.string('status').notNullable();
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await db.schema.createTable('express_orders', (table) => {
    table.string('id').primary();
    table.string('order_no').unique().notNullable();
    table.string('borrow_application_id').notNullable().index();
    table.string('courier_company').notNullable();
    table.string('tracking_no').notNullable();
    table.string('sender').notNullable();
    table.string('receiver').notNullable();
    table.dateTime('send_date');
    table.dateTime('receive_date');
    table.decimal('cost', 10, 2).notNullable().defaultTo(0);
    table.string('status').notNullable();
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await db.schema.createTable('reader_compensations', (table) => {
    table.string('id').primary();
    table.string('record_no').unique().notNullable();
    table.string('borrow_application_id').notNullable().index();
    table.string('reader_id').notNullable().index();
    table.string('reader_name').notNullable();
    table.string('compensation_type').notNullable();
    table.decimal('amount', 10, 2).notNullable().defaultTo(0);
    table.text('reason').notNullable();
    table.string('status').notNullable();
    table.dateTime('paid_date');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await db.schema.createTable('supplier_bills', (table) => {
    table.string('id').primary();
    table.string('bill_no').unique().notNullable();
    table.string('supplier_id').notNullable().index();
    table.string('supplier_name').notNullable();
    table.text('borrow_application_ids').notNullable();
    table.decimal('total_amount', 10, 2).notNullable().defaultTo(0);
    table.dateTime('bill_date').notNullable();
    table.dateTime('due_date').notNullable();
    table.string('status').notNullable();
    table.dateTime('paid_date');
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
  });

  await db.schema.createTable('exception_receipts', (table) => {
    table.string('id').primary();
    table.string('receipt_no').unique().notNullable().index();
    table.string('batch_id').notNullable().index();
    table.string('exception_type').notNullable().index();
    table.string('status').notNullable().index();
    table.string('borrow_application_id').notNullable().index();
    table.string('express_order_id');
    table.string('reader_compensation_id');
    table.string('supplier_bill_id');
    table.string('reader_id').notNullable().index();
    table.string('reader_name').notNullable();
    table.string('book_title').notNullable();
    table.decimal('amount', 10, 2).notNullable().defaultTo(0);
    table.text('reason').notNullable();
    table.text('manual_reason');
    table.text('review_comment');
    table.string('reviewed_by');
    table.dateTime('reviewed_at');
    table.string('frozen_by');
    table.dateTime('frozen_at');
    table.text('frozen_reason');
    table.string('previous_status');
    table.string('status_before_freeze');
    table.boolean('is_deleted').notNullable().defaultTo(false);
    table.dateTime('created_at').notNullable();
    table.dateTime('updated_at').notNullable();
    table.string('created_by').notNullable();

    table.index(['reader_id', 'status']);
    table.index(['created_at', 'status']);
  });

  await db.schema.createTable('audit_logs', (table) => {
    table.string('id').primary();
    table.string('receipt_id').index();
    table.string('batch_id').index();
    table.string('action_type').notNullable().index();
    table.string('operator_id').notNullable();
    table.string('operator_name').notNullable();
    table.text('previous_state');
    table.text('new_state');
    table.text('changes');
    table.text('reason');
    table.string('ip_address');
    table.string('user_agent');
    table.dateTime('created_at').notNullable().index();
  });

  await db.schema.createTable('batches', (table) => {
    table.string('id').primary();
    table.string('batch_no').unique().notNullable().index();
    table.string('name').notNullable();
    table.string('record_type').notNullable();
    table.integer('total_count').notNullable().defaultTo(0);
    table.integer('success_count').notNullable().defaultTo(0);
    table.integer('failed_count').notNullable().defaultTo(0);
    table.text('failed_records');
    table.string('status').notNullable();
    table.string('created_by').notNullable();
    table.dateTime('created_at').notNullable().index();
    table.dateTime('completed_at');
  });

  await db.schema.createTable('attachments', (table) => {
    table.string('id').primary();
    table.string('receipt_id').notNullable().index();
    table.string('file_name').notNullable();
    table.string('file_type').notNullable();
    table.integer('file_size').notNullable();
    table.string('file_path').notNullable();
    table.string('uploaded_by').notNullable();
    table.dateTime('created_at').notNullable();
  });

  await db.schema.createTable('approval_emails', (table) => {
    table.string('id').primary();
    table.string('receipt_id').notNullable().index();
    table.string('email_subject').notNullable();
    table.string('email_from').notNullable();
    table.text('email_to').notNullable();
    table.text('email_cc');
    table.text('email_body').notNullable();
    table.dateTime('sent_at').notNullable();
    table.string('sent_by').notNullable();
    table.dateTime('created_at').notNullable();
  });

  await db.schema.createTable('auto_check_results', (table) => {
    table.string('id').primary();
    table.string('check_type').notNullable().index();
    table.text('details');
    table.integer('issues_found').notNullable().defaultTo(0);
    table.boolean('passed').notNullable();
    table.dateTime('checked_at').notNullable().index();
  });
}

export default db;
