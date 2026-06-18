import { db } from './db/index';

const mockSchemaVersions = [
  {
    version: 'v1.0',
    tableName: 'user_order',
    fields: [
      { name: 'id', type: 'bigint', nullable: false, defaultValue: '', comment: '主键ID', length: undefined, precision: undefined },
      { name: 'user_id', type: 'bigint', nullable: false, defaultValue: '', comment: '用户ID', length: undefined, precision: undefined },
      { name: 'order_no', type: 'varchar', nullable: false, defaultValue: '', comment: '订单编号', length: 64, precision: undefined },
      { name: 'pay_amount', type: 'decimal', nullable: false, defaultValue: '0.00', comment: '支付金额', length: 10, precision: 2 },
      { name: 'status', type: 'tinyint', nullable: false, defaultValue: '0', comment: '订单状态', length: undefined, precision: undefined },
      { name: 'created_at', type: 'datetime', nullable: false, defaultValue: '', comment: '创建时间', length: undefined, precision: undefined },
      { name: 'updated_at', type: 'datetime', nullable: false, defaultValue: '', comment: '更新时间', length: undefined, precision: undefined },
    ],
  },
  {
    version: 'v1.1',
    tableName: 'user_order',
    fields: [
      { name: 'id', type: 'bigint', nullable: false, defaultValue: '', comment: '主键ID', length: undefined, precision: undefined },
      { name: 'user_id', type: 'bigint', nullable: false, defaultValue: '', comment: '用户ID', length: undefined, precision: undefined },
      { name: 'order_no', type: 'varchar', nullable: false, defaultValue: '', comment: '订单编号', length: 64, precision: undefined },
      { name: 'pay_amount', type: 'decimal', nullable: false, defaultValue: '0.00', comment: '支付金额', length: 12, precision: 2 },
      { name: 'discount_amount', type: 'decimal', nullable: true, defaultValue: '0.00', comment: '优惠金额 TODO: 需要确认计算规则', length: 12, precision: 2 },
      { name: 'pay_method', type: 'varchar', nullable: true, defaultValue: '', comment: '支付方式', length: 32, precision: undefined },
      { name: 'status', type: 'tinyint', nullable: false, defaultValue: '0', comment: '订单状态', length: undefined, precision: undefined },
      { name: 'created_at', type: 'datetime', nullable: false, defaultValue: '', comment: '创建时间', length: undefined, precision: undefined },
      { name: 'updated_at', type: 'datetime', nullable: false, defaultValue: '', comment: '更新时间', length: undefined, precision: undefined },
    ],
  },
  {
    version: 'v1.0',
    tableName: 'user_info',
    fields: [
      { name: 'id', type: 'bigint', nullable: false, defaultValue: '', comment: '主键ID', length: undefined, precision: undefined },
      { name: 'username', type: 'varchar', nullable: false, defaultValue: '', comment: '用户名', length: 64, precision: undefined },
      { name: 'email', type: 'varchar', nullable: false, defaultValue: '', comment: '邮箱', length: 128, precision: undefined },
      { name: 'phone', type: 'varchar', nullable: true, defaultValue: '', comment: '手机号', length: 16, precision: undefined },
      { name: 'created_at', type: 'datetime', nullable: false, defaultValue: '', comment: '创建时间', length: undefined, precision: undefined },
    ],
  },
  {
    version: 'v1.1',
    tableName: 'user_info',
    fields: [
      { name: 'id', type: 'bigint', nullable: false, defaultValue: '', comment: '主键ID', length: undefined, precision: undefined },
      { name: 'username', type: 'varchar', nullable: false, defaultValue: '', comment: '用户名', length: 64, precision: undefined },
      { name: 'email', type: 'varchar', nullable: false, defaultValue: '', comment: '邮箱', length: 128, precision: undefined },
      { name: 'phone', type: 'varchar', nullable: true, defaultValue: '', comment: '手机号', length: 16, precision: undefined },
      { name: 'real_name', type: 'varchar', nullable: true, defaultValue: '', comment: '真实姓名', length: 32, precision: undefined },
      { name: 'id_card', type: 'varchar', nullable: true, defaultValue: '', comment: '身份证号', length: 18, precision: undefined },
      { name: 'created_at', type: 'datetime', nullable: false, defaultValue: '', comment: '创建时间', length: undefined, precision: undefined },
      { name: 'updated_at', type: 'datetime', nullable: false, defaultValue: '', comment: '更新时间', length: undefined, precision: undefined },
    ],
  },
];

const mockChangeRecords = [
  {
    recordNo: 'REC-2026-001',
    tableName: 'user_order',
    fieldName: 'pay_amount',
    changeType: 'MODIFY',
    status: 'AVAILABLE',
    sourceInfo: {
      ticketNo: 'TICKET-1001',
      businessDesc: '订单支付金额字段精度调整，支持大额订单',
      materialLink: 'https://wiki.example.com/ticket/1001',
      requester: '业务部-张三',
    },
    schemaBefore: { name: 'pay_amount', type: 'decimal(10,2)', nullable: false, defaultValue: '0.00', comment: '支付金额', length: 10, precision: 2 },
    schemaAfter: { name: 'pay_amount', type: 'decimal(12,2)', nullable: false, defaultValue: '0.00', comment: '支付金额', length: 12, precision: 2 },
    handlingOpinion: '字段精度扩展，无数据丢失风险，可直接使用',
  },
  {
    recordNo: 'REC-2026-002',
    tableName: 'user_order',
    fieldName: 'discount_amount',
    changeType: 'ADD',
    status: 'PENDING_REVIEW',
    sourceInfo: {
      ticketNo: 'TICKET-1002',
      businessDesc: '新增优惠金额字段',
      materialLink: 'https://wiki.example.com/ticket/1002',
      requester: '业务部-李四',
    },
    schemaBefore: { name: '', type: '', nullable: false, defaultValue: '', comment: '' },
    schemaAfter: { name: 'discount_amount', type: 'decimal(12,2)', nullable: true, defaultValue: '0.00', comment: '优惠金额 TODO: 确认计算规则', length: 12, precision: 2 },
    handlingOpinion: '',
  },
  {
    recordNo: 'REC-2026-003',
    tableName: 'user_order',
    fieldName: 'pay_method',
    changeType: 'ADD',
    status: 'UNAVAILABLE',
    sourceInfo: {
      ticketNo: 'TICKET-1003',
      businessDesc: '新增支付方式字段',
      materialLink: '',
      requester: '业务部-王五',
    },
    schemaBefore: { name: '', type: '', nullable: false, defaultValue: '', comment: '' },
    schemaAfter: { name: 'pay_method', type: 'varchar(32)', nullable: true, defaultValue: '', comment: '支付方式', length: 32 },
    handlingOpinion: '缺少原始材料链接，无法追溯变更来源，不可直接使用',
  },
  {
    recordNo: 'REC-2026-004',
    tableName: 'user_info',
    fieldName: 'phone',
    changeType: 'MODIFY',
    status: 'PENDING_REVIEW',
    sourceInfo: {
      ticketNo: 'TICKET-1004',
      businessDesc: '用户手机号字段允许空值',
      materialLink: 'https://wiki.example.com/ticket/1004',
      requester: '产品部-赵六',
    },
    schemaBefore: { name: 'phone', type: 'varchar(16)', nullable: false, defaultValue: '', comment: '手机号', length: 16 },
    schemaAfter: { name: 'phone', type: 'varchar(16)', nullable: true, defaultValue: '', comment: '手机号', length: 16 },
    handlingOpinion: '',
  },
  {
    recordNo: 'REC-2026-005',
    tableName: 'user_info',
    fieldName: 'real_name',
    changeType: 'ADD',
    status: 'AVAILABLE',
    sourceInfo: {
      ticketNo: 'TICKET-1005',
      businessDesc: '新增用户真实姓名字段用于实名认证',
      materialLink: 'https://wiki.example.com/ticket/1005',
      requester: '风控部-孙七',
    },
    schemaBefore: { name: '', type: '', nullable: false, defaultValue: '', comment: '' },
    schemaAfter: { name: 'real_name', type: 'varchar(32)', nullable: true, defaultValue: '', comment: '真实姓名', length: 32 },
    handlingOpinion: '新增字段，不影响现有数据，可以使用',
  },
  {
    recordNo: 'REC-2026-006',
    tableName: 'user_order',
    fieldName: 'status',
    changeType: 'MODIFY',
    status: 'UNAVAILABLE',
    sourceInfo: {
      ticketNo: 'TICKET-1006',
      businessDesc: '订单状态字段类型修改 可能需要确认',
      materialLink: 'https://wiki.example.com/ticket/1006',
      requester: '研发部-周八',
    },
    schemaBefore: { name: 'status', type: 'tinyint', nullable: false, defaultValue: '0', comment: '订单状态' },
    schemaAfter: { name: 'status', type: 'varchar(16)', nullable: false, defaultValue: 'PENDING', comment: '订单状态' },
    handlingOpinion: '类型变更风险高，int转varchar需要确认所有数据可转换',
  },
];

function initMockData() {
  try {
    const versionCount = db.prepare('SELECT COUNT(*) as count FROM schema_version').get() as { count: number };
    if (versionCount.count === 0) {
      const insertVersion = db.prepare(`
        INSERT INTO schema_version (id, version, table_name, fields, created_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const v of mockSchemaVersions) {
        const id = `sv_${v.tableName}_${v.version}`;
        insertVersion.run(
          id,
          v.version,
          v.tableName,
          JSON.stringify(v.fields),
          new Date().toISOString(),
          'user_2'
        );
      }
      console.log('Mock schema versions inserted');
    }

    const changeCount = db.prepare('SELECT COUNT(*) as count FROM change_record').get() as { count: number };
    if (changeCount.count === 0) {
      const insertChange = db.prepare(`
        INSERT INTO change_record (
          id, record_no, table_name, field_name, change_type, status,
          source_info, schema_before, schema_after, handling_opinion,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertAnomaly = db.prepare(`
        INSERT INTO anomaly (id, change_record_id, type, description, severity, detected_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < mockChangeRecords.length; i++) {
        const record = mockChangeRecords[i];
        const id = `cr_${i + 1}`;
        const now = new Date().toISOString();

        insertChange.run(
          id,
          record.recordNo,
          record.tableName,
          record.fieldName,
          record.changeType,
          record.status,
          JSON.stringify(record.sourceInfo),
          JSON.stringify(record.schemaBefore),
          JSON.stringify(record.schemaAfter),
          record.handlingOpinion,
          'user_2',
          now,
          now
        );

        const anomalies: Array<{ type: string; description: string; severity: string }> = [];

        if (record.status === 'UNAVAILABLE') {
          if (!record.sourceInfo.materialLink) {
            anomalies.push({
              type: 'BACKUP_GAP',
              description: '缺少原始材料链接，无法追溯变更来源',
              severity: 'HIGH',
            });
          }
          if (record.schemaBefore.type && record.schemaAfter.type !== record.schemaBefore.type) {
            anomalies.push({
              type: 'OTHER',
              description: `类型变更风险: ${record.schemaBefore.type} -> ${record.schemaAfter.type}，需要确认数据兼容性`,
              severity: 'HIGH',
            });
          }
        }

        if (record.status === 'PENDING_REVIEW') {
          if (record.schemaAfter.comment.includes('TODO')) {
            anomalies.push({
              type: 'MIXED_NOTES',
              description: `注释中包含待确认内容: "${record.schemaAfter.comment}"`,
              severity: 'MEDIUM',
            });
          }
          if (record.schemaBefore.nullable === false && record.schemaAfter.nullable === true && !record.schemaAfter.defaultValue) {
            anomalies.push({
              type: 'NULL_VALUE',
              description: '非空字段改为可空但未设置默认值，可能导致空值问题',
              severity: 'MEDIUM',
            });
          }
        }

        for (let j = 0; j < anomalies.length; j++) {
          insertAnomaly.run(
            `an_${id}_${j}`,
            id,
            anomalies[j].type,
            anomalies[j].description,
            anomalies[j].severity,
            now
          );
        }
      }
      console.log('Mock change records inserted');
    }
  } catch (error) {
    console.error('Error inserting mock data:', error);
  }
}

// initMockData(); // Removed automatic call, will be called from server.ts

export default initMockData;
