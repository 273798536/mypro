import type {
  ConflictRecord,
  TableSnapshot,
  SnapshotField,
  ExecutionTrail,
  UserRole,
  User,
  PermissionSnapshot,
  OperationLog,
  ExportJob,
  BackupRecord,
  RollbackRecord,
  ResolveInfo,
} from '../types';

const now = new Date();
const pad = (n: number): string => String(n).padStart(2, '0');
const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000Z`;
const daysAgo = (days: number, h = 10, m = 30): Date => {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(h, m, Math.floor(Math.random() * 60), 0);
  return d;
};
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const uid = (prefix: string, n: number): string => `${prefix}_${String(n).padStart(4, '0')}`;

const severities: ConflictRecord['severity'][] = ['critical', 'warning', 'info'];
const statuses: ConflictRecord['status'][] = ['pending', 'in_progress', 'resolved', 'ignored', 'unavailable'];
const idemTypes: ConflictRecord['idempotentKeyType'][] = ['order_no', 'biz_id', 'unique_hash', 'composite'];
const conflictTypes: ConflictRecord['conflictType'][] = ['duplicate_execution', 'schema_mismatch', 'key_collision'];
const tagsPool = ['订单迁移', '会员系统', '支付网关', '库存同步', '优惠券', '积分系统', '物流跟踪', '发票模块'];
const unavailableReasonPool = [
  '源系统订单已归档，无法查询原始快照',
  '幂等键关联的业务记录在数据清洗阶段被物理删除',
  '目标数据库表结构变更导致外键关联丢失',
  'ETL任务失败且缺少重试上下文，轨迹链断裂',
  '该记录所属批次被标记为废弃，不再提供恢复能力',
];
const migrationNames = [
  '订单主表2024Q1历史迁移',
  '会员积分体系升级补录',
  '支付流水对账迁移',
  '商品库存实时同步迁移',
  '优惠券核销记录回溯',
  '物流运单状态映射迁移',
  '发票税号字段补录',
  '用户画像标签系统迁移',
  '商户结算单批次迁移',
  '售后工单归档回溯',
];
const nodeNames = [
  'node-beijing-01', 'node-shanghai-02', 'node-guangzhou-03',
  'node-shenzhen-04', 'node-hangzhou-05', 'node-chengdu-06',
];
const blockReasonRulePairs: Array<[string, string]> = [
  ['幂等键已存在：检测到相同order_no的记录已在目标表写入', 'IDEMPOTENCY_ORDER_NO_UNIQUE'],
  ['唯一索引冲突：biz_id + tenant_id 联合键命中重复约束', 'IDEMPOTENCY_UNIQUE_KEY_VIOLATION'],
  ['重复执行防护：migration_task_id + batch_no 已标记处理完成', 'MIGRATION_BATCH_ALREADY_DONE'],
  ['字段校验失败：新表not_null字段在旧数据中存在空值', 'SCHEMA_NOT_NULL_CHECK'],
  ['枚举值不兼容：order_status从5扩展导致映射缺失', 'SCHEMA_ENUM_MAPPING'],
  ['外键约束失败：关联的customer_id在用户表不存在', 'SCHEMA_FK_CONSTRAINT'],
  ['数据长度超限：remark字段由varchar(255)改为varchar(500)但UTF8编码超字节', 'SCHEMA_DATA_TRUNCATION'],
  ['计算字段校验：amount_including_tax != amount * (1+tax_rate) 误差超阈值', 'BUSINESS_CALC_CONSISTENCY'],
];

export const userRoles: UserRole[] = [
  {
    id: 'role_audit',
    name: 'audit_readonly',
    displayName: '审计只读',
    permissions: ['conflict:view', 'history:view', 'history:audit_chain', 'export:run'],
  },
  {
    id: 'role_ops',
    name: 'data_ops',
    displayName: '数据运维',
    permissions: [
      'conflict:view', 'conflict:resolve', 'conflict:assign',
      'backup:create', 'rollback:update', 'history:view',
      'history:audit_chain', 'export:run',
    ],
  },
  {
    id: 'role_admin',
    name: 'admin',
    displayName: '系统管理员',
    permissions: [
      'conflict:view', 'conflict:resolve', 'conflict:assign',
      'backup:create', 'rollback:update', 'history:view',
      'history:audit_chain', 'export:run', 'user:manage',
    ],
  },
];

export const users: User[] = [
  {
    id: 'u_001', username: 'zhangsan', displayName: '张三（审计）',
    roleIds: ['role_audit'],
    effectivePermissions: userRoles[0].permissions,
    lastPermissionChangeAt: isoDate(daysAgo(15, 9, 0)),
  },
  {
    id: 'u_002', username: 'lisi', displayName: '李四（运维）',
    roleIds: ['role_ops'],
    effectivePermissions: userRoles[1].permissions,
    lastPermissionChangeAt: isoDate(daysAgo(22, 10, 0)),
  },
  {
    id: 'u_003', username: 'wangwu', displayName: '王五（运维）',
    roleIds: ['role_ops'],
    effectivePermissions: userRoles[1].permissions,
    lastPermissionChangeAt: isoDate(daysAgo(8, 14, 0)),
  },
  {
    id: 'u_004', username: 'zhaoliu', displayName: '赵六（管理员）',
    roleIds: ['role_admin'],
    effectivePermissions: userRoles[2].permissions,
    lastPermissionChangeAt: isoDate(daysAgo(30, 8, 0)),
  },
  {
    id: 'u_005', username: 'sunqi', displayName: '孙七（审计+临时授权）',
    roleIds: ['role_audit'],
    effectivePermissions: [...userRoles[0].permissions, 'conflict:resolve', 'backup:create'],
    lastPermissionChangeAt: isoDate(daysAgo(3, 16, 0)),
  },
  {
    id: 'u_006', username: 'zhouba', displayName: '周八（只读访客）',
    roleIds: ['role_audit'],
    effectivePermissions: ['conflict:view', 'history:view'],
    lastPermissionChangeAt: isoDate(daysAgo(5, 11, 0)),
  },
];

const generateSnapshotFields = (
  count: number,
  pairIdx: number,
  isAfter: boolean
): SnapshotField[] => {
  const baseFields = [
    { name: 'id', type: 'BIGINT', nullable: false, def: null, comment: '主键' },
    { name: 'order_no', type: 'VARCHAR(64)', nullable: false, def: null, comment: '订单号' },
    { name: 'biz_id', type: 'VARCHAR(128)', nullable: false, def: null, comment: '业务唯一ID' },
    { name: 'tenant_id', type: 'INT', nullable: false, def: '0', comment: '租户ID' },
    { name: 'customer_id', type: 'BIGINT', nullable: false, def: null, comment: '客户ID' },
    { name: 'amount', type: 'DECIMAL(18,2)', nullable: false, def: '0.00', comment: '订单金额' },
    { name: 'tax_rate', type: 'DECIMAL(5,4)', nullable: true, def: '0.1300', comment: '税率' },
    { name: 'amount_including_tax', type: 'DECIMAL(18,2)', nullable: true, def: null, comment: '含税金额' },
    { name: 'status', type: 'TINYINT', nullable: false, def: '0', comment: '订单状态' },
    { name: 'pay_status', type: 'TINYINT', nullable: false, def: '0', comment: '支付状态' },
    { name: 'ship_status', type: 'TINYINT', nullable: true, def: '0', comment: '发货状态' },
    { name: 'created_at', type: 'DATETIME', nullable: false, def: 'CURRENT_TIMESTAMP', comment: '创建时间' },
    { name: 'updated_at', type: 'DATETIME', nullable: false, def: 'CURRENT_TIMESTAMP ON UPDATE', comment: '更新时间' },
    { name: 'remark', type: 'VARCHAR(255)', nullable: true, def: null, comment: '备注' },
    { name: 'operator', type: 'VARCHAR(64)', nullable: true, def: null, comment: '操作人' },
    { name: 'channel', type: 'VARCHAR(32)', nullable: true, def: "'app'", comment: '下单渠道' },
    { name: 'store_id', type: 'INT', nullable: true, def: null, comment: '门店ID' },
    { name: 'source_type', type: 'VARCHAR(32)', nullable: true, def: "'online'", comment: '来源类型' },
    { name: 'is_deleted', type: 'TINYINT', nullable: false, def: '0', comment: '软删除标记' },
    { name: 'version', type: 'INT', nullable: false, def: '1', comment: '乐观锁版本号' },
  ];
  const fields: SnapshotField[] = [];
  const useCount = Math.min(count, baseFields.length + 5);
  for (let i = 0; i < useCount; i++) {
    const base = baseFields[i] ?? {
      name: `ext_field_${i}`, type: 'VARCHAR(255)', nullable: true, def: null, comment: `扩展字段${i}`,
    };
    let dataType = base.type;
    let nullable = base.nullable;
    let defaultValue: string | undefined = base.def ?? undefined;
    let changeType: SnapshotField['changeType'] = 'unchanged';
    let oldValue: string | undefined;
    let newValue: string | undefined;
    let impactNote: string | undefined;

    const seeded = (pairIdx * 7 + i * 3) % 11;
    if (!isAfter) {
      if (seeded === 0) { changeType = 'removed'; impactNote = '该字段在目标表中已弃用，迁移时会忽略，若下游报表仍依赖需人工确认。'; }
      else if (seeded === 2) { changeType = 'modified'; oldValue = dataType; dataType = base.type.includes('VARCHAR') ? 'VARCHAR(500)' : base.type; newValue = dataType; impactNote = '字段长度扩展，旧数据无损，但新写入需注意UTF8字节数上限。'; }
      else if (seeded === 5) { changeType = 'modified'; oldValue = nullable ? 'TRUE' : 'FALSE'; nullable = !nullable; newValue = nullable ? 'TRUE' : 'FALSE'; impactNote = nullable ? '字段允许空，迁移不会报错，但需注意业务层NPE防护。' : '字段改为非空，需检查源数据中是否存在空值，否则写入失败。'; }
    } else {
      if (seeded === 1) { changeType = 'added'; impactNote = '新增字段，默认值已配置，历史记录会回填默认值，需验证报表口径是否受影响。'; }
      else if (seeded === 2) { changeType = 'modified'; oldValue = base.type; dataType = base.type.includes('VARCHAR') ? 'VARCHAR(500)' : base.type; newValue = dataType; impactNote = '字段长度扩展，旧数据无损，但新写入需注意UTF8字节数上限。'; }
      else if (seeded === 5) { changeType = 'modified'; oldValue = nullable ? 'TRUE' : 'FALSE'; nullable = !nullable; newValue = nullable ? 'TRUE' : 'FALSE'; impactNote = nullable ? '字段允许空，迁移不会报错，但需注意业务层NPE防护。' : '字段改为非空，需检查源数据中是否存在空值，否则写入失败。'; }
      else if (seeded === 7) { changeType = 'modified'; oldValue = defaultValue; defaultValue = base.def ?? undefined; if (!defaultValue) defaultValue = "'N/A'"; newValue = defaultValue; impactNote = '默认值调整，对存量数据无影响，仅影响新写入记录的业务语义。'; }
    }

    fields.push({
      name: base.name,
      dataType,
      nullable,
      defaultValue,
      comment: base.comment,
      ordinalPosition: i + 1,
      changeType,
      oldValue,
      newValue,
      impactNote,
    });
  }
  return fields;
};

export const tableSnapshots: TableSnapshot[] = [];
for (let i = 0; i < 40; i++) {
  const pairDay = i % 29;
  const captureBefore = daysAgo(pairDay + 1, 8, 15);
  const captureAfter = daysAgo(pairDay, 18, 45);
  const tableName = randomItem([
    't_order_main', 't_customer_points', 't_payment_flow',
    't_product_stock', 't_coupon_writeoff', 't_shipment_waybill',
  ]);
  const fieldCount = randomInt(15, 25);
  tableSnapshots.push({
    id: uid('snap_before', i),
    snapshotName: `${tableName}_v${i}_before`,
    tableName,
    capturedAt: isoDate(captureBefore),
    migrationVersion: `v${1 + (i % 5)}.${i % 9}.${i % 11}`,
    fields: generateSnapshotFields(fieldCount, i, false),
    rowCount: randomInt(8000, 500000),
    checksum: `sha256:${(i * 9301 + 49297).toString(16)}${(i * 233).toString(16)}`.padEnd(70, '0').slice(0, 64),
  });
  tableSnapshots.push({
    id: uid('snap_after', i),
    snapshotName: `${tableName}_v${i}_after`,
    tableName,
    capturedAt: isoDate(captureAfter),
    migrationVersion: `v${1 + (i % 5)}.${i % 9}.${(i % 11) + 1}`,
    fields: generateSnapshotFields(fieldCount, i, true),
    rowCount: randomInt(8000, 500000),
    checksum: `sha256:${(i * 1301 + 88117).toString(16)}${(i * 311).toString(16)}`.padEnd(70, '0').slice(0, 64),
  });
}

export const conflictRecords: ConflictRecord[] = [];
export const executionTrails: ExecutionTrail[] = [];
export const backupRecords: BackupRecord[] = [];
export const rollbackRecords: RollbackRecord[] = [];

for (let i = 0; i < 70; i++) {
  const dayAgo = i % 29;
  const firstExe = daysAgo(dayAgo + 2, randomInt(6, 10), randomInt(0, 59));
  const lastExe = daysAgo(dayAgo, randomInt(13, 22), randomInt(0, 59));
  const createdAt = new Date(firstExe.getTime() + 60000);
  const updatedAt = lastExe;
  const severity = severities[i % severities.length];
  const status = statuses[i % statuses.length];
  const idemType = idemTypes[i % idemTypes.length];
  const conflictType = conflictTypes[i % conflictTypes.length];
  const orderNo = `ORD${20240600 + i}`;
  const idemKey = idemType === 'order_no' ? orderNo
    : idemType === 'biz_id' ? `BIZ-${(100000 + i * 13).toString(36).toUpperCase()}`
    : idemType === 'unique_hash' ? `H${(i * 2654435761).toString(16).padStart(32, '0')}`
    : `${orderNo}::TENANT-${(i % 99) + 1}::${(i % 12) + 1}`;

  const snapIdx = i % 40;
  const beforeId = uid('snap_before', snapIdx);
  const afterId = uid('snap_after', snapIdx);
  const assignee = status === 'pending' ? undefined : users[(i + 2) % users.length].id;
  const currentOwner = assignee ?? users[3].id;
  const duplicateAttempts = randomInt(2, 8);
  const tags: string[] = [];
  tags.push(tagsPool[i % tagsPool.length]);
  if (i % 3 === 0) tags.push(tagsPool[(i + 5) % tagsPool.length]);
  if (severity === 'critical') tags.push('高危-需尽快处理');

  const unavailableReasons = status === 'unavailable'
    ? [unavailableReasonPool[i % unavailableReasonPool.length]]
    : undefined;

  const trailIds: string[] = [];
  for (let t = 0; t < duplicateAttempts; t++) {
    const [blockReason, blockRule] = blockReasonRulePairs[(i + t) % blockReasonRulePairs.length];
    const attemptTime = new Date(firstExe.getTime() + t * randomInt(1800, 7200) * 1000);
    const result: ExecutionTrail['result'] = t === duplicateAttempts - 1 ? 'blocked' : randomItem(['failed', 'partial', 'blocked']);
    const trailId = uid('trail', i * 10 + t);
    trailIds.push(trailId);
    executionTrails.push({
      id: trailId,
      conflictId: uid('conf', i),
      attemptNo: t + 1,
      executedAt: isoDate(attemptTime),
      nodeName: nodeNames[(i + t) % nodeNames.length],
      operator: users[(i + t + 1) % users.length].username,
      inputSummary: {
        orderNo,
        idempotentKey: idemKey,
        retryContext: {
          batchNo: `B${20240600 + i}`,
          shard: (i % 8) + 1,
          retriedFrom: t === 0 ? 'initial' : `attempt_${t}`,
        },
      },
      result,
      blockReason,
      blockRule,
      fullLogPath: `/var/logs/migration/202406/${uid('log', i * 10 + t)}.log`,
    });
  }

  let resolveInfo: ResolveInfo | undefined;
  if (status === 'resolved') {
    const resolver = users[(i + 1) % users.length];
    const resolvedAt = daysAgo(dayAgo - 1 < 0 ? 0 : dayAgo - 1, 15, randomInt(0, 59));
    const backupId = uid('bak', i);
    const rollbackId = uid('rb', i);
    resolveInfo = {
      strategy: randomItem(['overwrite', 'merge', 'skip']),
      resolvedAt: isoDate(resolvedAt),
      resolvedBy: resolver.id,
      remark: `按策略${resolveInfo?.strategy ?? 'merge'}处理，已核对上下游影响`,
      backupRecordId: backupId,
      rollbackRecordId: rollbackId,
      changes: {
        status: { before: 1, after: 3 },
        pay_status: { before: 0, after: 2 },
        remark: { before: null, after: '冲突处理：合并支付流水' },
      },
    };
    backupRecords.push({
      id: backupId,
      conflictId: uid('conf', i),
      linkedResolveInfoId: `ri_${i}`,
      createdAt: isoDate(resolvedAt),
      createdBy: resolver.id,
      backupScope: randomItem(['full_row', 'changed_fields']),
      backupData: {
        orderNo,
        status_before: 1,
        pay_status_before: 0,
        snapshot_before_checksum: tableSnapshots[snapIdx * 2].checksum,
      },
      restored: false,
    });
    rollbackRecords.push({
      id: rollbackId,
      conflictId: uid('conf', i),
      linkedBackupId: backupId,
      linkedResolveInfoId: `ri_${i}`,
      updatedAt: isoDate(resolvedAt),
      updatedBy: resolver.id,
      rollbackStatus: randomItem(['pending', 'applied', 'verified']),
      fieldRollbacks: {
        status: { from: 3, to: 1, appliedAt: undefined },
        pay_status: { from: 2, to: 0, appliedAt: undefined },
      },
    });
  }

  conflictRecords.push({
    id: uid('conf', i),
    migrationTaskId: `TASK-${20240600 + (i % 10)}`,
    migrationTaskName: migrationNames[i % migrationNames.length],
    orderNo,
    idempotentKey: idemKey,
    idempotentKeyType: idemType,
    conflictType,
    severity,
    firstExecuteTime: isoDate(firstExe),
    lastExecuteTime: isoDate(lastExe),
    duplicateAttempts,
    status,
    assignee,
    currentOwner,
    snapshotBeforeId: beforeId,
    snapshotAfterId: afterId,
    executionTrailIds: trailIds,
    resolveInfo,
    createdAt: isoDate(createdAt),
    updatedAt: isoDate(updatedAt),
    tags,
    unavailableReasons,
  });
}

export const operationLogs: OperationLog[] = [];
export const permissionSnapshots: PermissionSnapshot[] = [];

const createSnapForLog = (
  logIdx: number,
  user: User,
  opId: string,
  source: PermissionSnapshot['permissionSource'] = 'role_grant'
): PermissionSnapshot => ({
  id: uid('ps', logIdx),
  operationId: opId,
  userId: user.id,
  capturedAt: isoDate(daysAgo(logIdx % 28, 10 + (logIdx % 8), (logIdx * 7) % 60)),
  roleIdsAtThatTime: [...user.roleIds],
  permissionsAtThatTime: [...user.effectivePermissions],
  permissionSource: source,
  valid: true,
});

for (let i = 0; i < 30; i++) {
  const logId = uid('op', i);
  const opUser = users[i % users.length];
  const ps = createSnapForLog(i, opUser, logId, i === 18 ? 'temporary_authorization' : 'role_grant');
  permissionSnapshots.push(ps);

  const opType = ([
    'view', 'resolve', 'backup', 'rollback', 'export', 'assign', 'permission_change',
  ] as const)[i % 7];
  const conflictForLog = i % 5 !== 6 ? conflictRecords[(i * 3) % conflictRecords.length].id : undefined;

  let detail: Record<string, unknown> = {};
  let beforeState: Record<string, unknown> | undefined;
  let afterState: Record<string, unknown> | undefined;
  let relatedBackupId: string | undefined;
  let relatedRollbackId: string | undefined;
  let remark: string | undefined;

  if (opType === 'resolve' && backupRecords.length > 0 && rollbackRecords.length > 0) {
    const ri = i % backupRecords.length;
    relatedBackupId = backupRecords[ri].id;
    relatedRollbackId = rollbackRecords[ri].id;
    beforeState = { status: 'in_progress', owner: 'u_003' };
    afterState = { status: 'resolved', owner: opUser.id, strategy: 'merge' };
    detail = { strategy: 'merge', withBackup: true, remark: '核对后合并处理' };
    remark = '备份+回滚记录已联动创建，可随时撤销';
  } else if (opType === 'backup') {
    beforeState = { restored: false };
    afterState = { restored: false, backupScope: 'full_row' };
    detail = { scope: 'full_row', fields: ['amount', 'status', 'remark'] };
  } else if (opType === 'rollback') {
    const ri = i % Math.max(1, rollbackRecords.length);
    relatedRollbackId = rollbackRecords[ri]?.id;
    relatedBackupId = rollbackRecords[ri]?.linkedBackupId;
    beforeState = { rollbackStatus: 'pending' };
    afterState = { rollbackStatus: 'verified' };
    detail = { fieldsRolled: ['status', 'pay_status'] };
    remark = '回滚与备份联动验证通过';
  } else if (opType === 'assign') {
    beforeState = { assignee: null, status: 'pending' };
    afterState = { assignee: 'u_003', status: 'in_progress' };
    detail = { from: 'u_004', to: 'u_003', batchCount: (i % 5) + 1 };
  } else if (opType === 'permission_change') {
    beforeState = { roleIds: ['role_audit'] };
    afterState = { roleIds: ['role_audit', 'role_ops'], extraPerms: ['conflict:resolve'] };
    detail = { target: 'u_005', grantExpiresAt: isoDate(daysAgo(-7, 23, 59)) };
  } else if (opType === 'export') {
    detail = { format: randomItem(['pdf', 'xlsx', 'csv']), scope: randomItem(['current_filter', 'all', 'single']) };
  } else {
    detail = { viewedAt: ps.capturedAt, route: `/conflicts/${conflictForLog}` };
  }

  operationLogs.push({
    id: logId,
    conflictId: conflictForLog,
    operationType: opType,
    operatorId: opUser.id,
    operatorName: opUser.displayName,
    operatedAt: ps.capturedAt,
    permissionSnapshotId: ps.id,
    detail,
    beforeState,
    afterState,
    relatedBackupId,
    relatedRollbackId,
    remark,
  });
}

export const exportJobs: ExportJob[] = [
  {
    id: 'job_001', format: 'pdf', scope: 'all',
    includeExplanations: true, includeCharts: true, includeSnapshots: true, includeAuditSummary: true,
    status: 'done',
    createdAt: isoDate(daysAgo(2, 9, 15)),
    createdBy: 'u_001',
    completedAt: isoDate(daysAgo(2, 9, 22)),
    fileName: 'idempotent_conflict_report_20240616_all.pdf',
    fileSizeKb: 4820,
    downloadCount: 3,
  },
  {
    id: 'job_002', format: 'xlsx', scope: 'current_filter',
    filterCriteria: { severity: ['critical'], status: ['pending', 'in_progress'] },
    includeExplanations: true, includeCharts: false, includeSnapshots: true, includeAuditSummary: false,
    status: 'done',
    createdAt: isoDate(daysAgo(4, 14, 30)),
    createdBy: 'u_002',
    completedAt: isoDate(daysAgo(4, 14, 36)),
    fileName: 'critical_pending_conflicts_20240614.xlsx',
    fileSizeKb: 1560,
    downloadCount: 5,
  },
  {
    id: 'job_003', format: 'csv', scope: 'single',
    singleConflictId: conflictRecords[0].id,
    includeExplanations: true, includeCharts: false, includeSnapshots: true, includeAuditSummary: true,
    status: 'done',
    createdAt: isoDate(daysAgo(1, 17, 8)),
    createdBy: 'u_005',
    completedAt: isoDate(daysAgo(1, 17, 9)),
    fileName: `conflict_${conflictRecords[0].id}_detail.csv`,
    fileSizeKb: 42,
    downloadCount: 1,
  },
  {
    id: 'job_004', format: 'pdf', scope: 'current_filter',
    filterCriteria: { status: ['unavailable'], dateFrom: isoDate(daysAgo(10, 0, 0)) },
    includeExplanations: true, includeCharts: true, includeSnapshots: false, includeAuditSummary: true,
    status: 'generating',
    createdAt: isoDate(daysAgo(0, 16, 55)),
    createdBy: 'u_003',
    fileName: 'unavailable_escalation_jun18.pdf',
    downloadCount: 0,
  },
  {
    id: 'job_005', format: 'xlsx', scope: 'all',
    includeExplanations: false, includeCharts: false, includeSnapshots: false, includeAuditSummary: true,
    status: 'failed',
    createdAt: isoDate(daysAgo(6, 11, 40)),
    createdBy: 'u_004',
    completedAt: isoDate(daysAgo(6, 11, 41)),
    fileName: 'monthly_audit_jun.xlsx',
    downloadCount: 0,
  },
  {
    id: 'job_006', format: 'csv', scope: 'current_filter',
    filterCriteria: { idempotentKeyType: ['composite'] },
    includeExplanations: true, includeCharts: false, includeSnapshots: true, includeAuditSummary: false,
    status: 'queued',
    createdAt: isoDate(daysAgo(0, 17, 2)),
    createdBy: 'u_002',
    fileName: 'composite_key_conflicts.csv',
    downloadCount: 0,
  },
];
