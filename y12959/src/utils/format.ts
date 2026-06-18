import type {
  BlockReasonDetail,
  ConflictSeverity,
  ConflictStatus,
  ExplanationContextData,
  ExplanationContextType,
  GeneratedExplanation,
  ResolveStrategy,
} from '../types';

const pad = (n: number): string => String(n).padStart(2, '0');

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatRelative = (iso: string): string => {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  if (Number.isNaN(diffMs)) return iso;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return diffSec <= 0 ? '刚刚' : `${diffSec}秒前`;
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}个月前`;
  return `${Math.floor(diffMonth / 12)}年前`;
};

interface SeverityMeta {
  label: string;
  dotColor: string;
  bgClass: string;
  textClass: string;
  description: string;
  suggestHours: number;
}

export const getSeverityMeta = (severity: ConflictSeverity): SeverityMeta => {
  switch (severity) {
    case 'critical':
      return {
        label: '高危',
        dotColor: '#ef4444',
        bgClass: 'bg-red-50 dark:bg-red-500/10',
        textClass: 'text-red-600 dark:text-red-400',
        description: '可能造成订单丢失、金额错算、下游系统联动失败，需在2小时内响应。',
        suggestHours: 2,
      };
    case 'warning':
      return {
        label: '中危',
        dotColor: '#f59e0b',
        bgClass: 'bg-amber-50 dark:bg-amber-500/10',
        textClass: 'text-amber-600 dark:text-amber-400',
        description: '可能导致报表口径不一致、数据可追溯性降低，建议当日内处理。',
        suggestHours: 24,
      };
    case 'info':
      return {
        label: '提示',
        dotColor: '#3b82f6',
        bgClass: 'bg-blue-50 dark:bg-blue-500/10',
        textClass: 'text-blue-600 dark:text-blue-400',
        description: '幂等系统按预期拦截，无数据风险，仅用于审计和统计。',
        suggestHours: 72,
      };
  }
};

interface StatusMeta {
  label: string;
  dotColor: string;
  bgClass: string;
  textClass: string;
  description: string;
}

export const getStatusMeta = (status: ConflictStatus): StatusMeta => {
  switch (status) {
    case 'pending':
      return {
        label: '待处理',
        dotColor: '#94a3b8',
        bgClass: 'bg-slate-100 dark:bg-slate-500/10',
        textClass: 'text-slate-600 dark:text-slate-300',
        description: '尚未分配处理人，或分配后未进入修正流程。',
      };
    case 'in_progress':
      return {
        label: '处理中',
        dotColor: '#6366f1',
        bgClass: 'bg-indigo-50 dark:bg-indigo-500/10',
        textClass: 'text-indigo-600 dark:text-indigo-400',
        description: '已分配处理人，正在核对数据、制定修正策略。',
      };
    case 'resolved':
      return {
        label: '已处理',
        dotColor: '#10b981',
        bgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        textClass: 'text-emerald-600 dark:text-emerald-400',
        description: '已完成修正，备份与回滚记录已生成，支持随时撤销。',
      };
    case 'ignored':
      return {
        label: '已忽略',
        dotColor: '#64748b',
        bgClass: 'bg-slate-100 dark:bg-slate-500/10',
        textClass: 'text-slate-500 dark:text-slate-400',
        description: '经人工判断无需修正（如幂等按预期拦截、下游自行兼容）。',
      };
    case 'unavailable':
      return {
        label: '不可用',
        dotColor: '#a855f7',
        bgClass: 'bg-purple-50 dark:bg-purple-500/10',
        textClass: 'text-purple-600 dark:text-purple-400',
        description: '原始数据或上下文缺失，无法按正常流程处理，需转交专项。',
      };
  }
};

interface StrategyMeta {
  label: string;
  description: string;
}

export const getStrategyMeta = (strategy: ResolveStrategy): StrategyMeta => {
  switch (strategy) {
    case 'skip':
      return {
        label: '跳过（保留被拦记录）',
        description: '不执行写入，让幂等拦截继续生效，适合冲突本身就是预期场景。',
      };
    case 'overwrite':
      return {
        label: '覆盖（以新数据为准）',
        description: '清空旧冲突记录，以当前数据重放写入，适合源数据为唯一可信来源。',
      };
    case 'merge':
      return {
        label: '合并（新旧字段融合）',
        description: '按字段映射规则合并，保留双方非空值，适合部分字段需要兼容的场景。',
      };
    case 'manual':
      return {
        label: '线下手工处理',
        description: '在系统外人工更新数据库或协调下游，系统仅记录处理过程以便追溯。',
      };
  }
};

interface BlockReasonRule {
  summary: string;
  whyBlocked: string;
  typical: string;
  suggestion: string;
}

const reasonRuleMap: Record<string, BlockReasonRule> = {
  IDEMPOTENCY_ORDER_NO_UNIQUE: {
    summary: '检测到相同订单号已写入目标表',
    whyBlocked:
      '幂等模块在写入前按 order_no 建了唯一索引；当前批次中的该订单号在目标库已存在，继续写入会触发 UNIQUE 约束报错，因此被前置拦截。',
    typical:
      '同一条迁移任务因网络超时触发前端重试，或两条批次在分库合并时命中同一 order_no；重复执行的 SQL 在未拦截时会报 1062 Duplicate entry。',
    suggestion:
      '先确认旧记录是否为同一条业务数据：若是同一条，选择 overwrite 或 skip；若为不同业务碰巧同号，需在目标表引入 tenant_id+order_no 的联合幂等键。',
  },
  IDEMPOTENCY_UNIQUE_KEY_VIOLATION: {
    summary: '业务唯一键（biz_id + tenant_id）重复',
    whyBlocked:
      '目标表以 biz_id 和 tenant_id 作为联合唯一键；当前写入记录的 (biz_id, tenant_id) 在已有记录中命中，为防止覆盖被系统拦截。',
    typical:
      '上游在补录时生成了新的 order_no 但复用了旧的 biz_id；或多租户场景下数据合并时未加租户前缀。',
    suggestion:
      '查源系统确认 biz_id 是否真的重复：重复则按“以最新为准”使用 overwrite；不重复则需修正迁移 SQL 的租户映射，再重新批次执行。',
  },
  MIGRATION_BATCH_ALREADY_DONE: {
    summary: '该批次已标记处理完成，禁止重复执行',
    whyBlocked:
      '迁移调度器按 migration_task_id + batch_no 维护批次状态；当前批次在控制表中状态为 done，再次提交被判定为重复请求而拦截。',
    typical:
      '调度器故障重试、人工重复点击“开始迁移”、或运维脚本在同一批次上重复 run；日志会显示 batch_status=DONE 但仍有新的写入请求。',
    suggestion:
      '若需强制重放，先在批次控制页将对应 batch 置为 failed 或新建一个批次号；若确实重复，直接选择 skip 并关闭当前工单。',
  },
  SCHEMA_NOT_NULL_CHECK: {
    summary: '新表 NOT NULL 字段存在空值',
    whyBlocked:
      '目标表新增或升级了 NOT NULL 约束，但源数据在该字段上存在 NULL，迁移时若强写会触发 cannot be null 报错。',
    typical:
      '老系统版本中 remark / pay_channel 等字段允许空，新模型将其升级为 NOT NULL 但历史数据未补录；通常集中在特定日期段的历史订单。',
    suggestion:
      '用 merge 策略，按业务含义给空字段回填默认值（如 pay_channel→offline、remark→"历史缺省"），同时在备份记录中保留原始 NULL 以便审计。',
  },
  SCHEMA_ENUM_MAPPING: {
    summary: '枚举值映射缺失（新状态表无对应 key）',
    whyBlocked:
      '目标表的 status / pay_status 使用了更严格的枚举，但源数据中存在扩展值（例如原 5=部分退款），迁移时无对应映射规则。',
    typical:
      '源系统在迭代中临时加了状态码但迁移映射表未同步；常见于 order_status、refund_status、ship_status 等状态字段。',
    suggestion:
      '在字段映射表中补全对应枚举→新枚举的关系；若业务语义不清，使用 manual 策略按订单明细人工归类，避免将“部分退款”误写入“已完成”。',
  },
  SCHEMA_FK_CONSTRAINT: {
    summary: '外键约束失败（关联表无对应记录）',
    whyBlocked:
      '写入目标表时，customer_id / store_id / product_id 等外键指向的父表中不存在对应行，数据库触发 FK constraint fails 被前置拦截。',
    typical:
      '主表与子表迁移顺序相反、或父记录在清洗阶段被过滤；常见于会员表先迁移后订单表但部分会员被软删除的情况。',
    suggestion:
      '优先确认父数据丢失原因：若应存在，先补跑父表迁移；若已废弃，可用 merge 策略将外键置为默认 fallback（如未知门店=9999）并记录备注。',
  },
  SCHEMA_DATA_TRUNCATION: {
    summary: '字段长度超限（编码导致字节数超上限）',
    whyBlocked:
      '目标字段在 utf8mb4 下实际字节数超过列定义的最大长度，写入将被数据库截断或抛出 Data too long 错误。',
    typical:
      'remark、address、goods_title 等长文本字段，迁移时未考虑 emoji 和中文的字节数；有时 varchar(255) 实际只允许 63 个中文。',
    suggestion:
      '若字段语义允许，在目标表把列改大（varchar(500) 或 TEXT）；若不允许改表，使用 merge 策略截断并在备份中保留原文，便于后期补全。',
  },
  BUSINESS_CALC_CONSISTENCY: {
    summary: '金额计算字段一致性校验失败',
    whyBlocked:
      '迁移校验规则要求 amount_including_tax ≈ amount * (1 + tax_rate)；当前记录偏差超过允许阈值（通常 0.01 元），被视为业务数据不一致而拦截。',
    typical:
      '老系统含税金额与不含税金额分别人工录入；或四舍五入顺序不同导致 1 分差异；常出现在发票、对账相关字段。',
    suggestion:
      '使用 merge 策略重新以 amount * (1 + tax_rate) 计算并覆盖含税金额；若涉及已开票的记录，采用 manual 策略并同步财务确认。',
  },
};

export const getBlockReasonDetail = (
  reason: string,
  rule: string
): BlockReasonDetail => {
  const byRule = reasonRuleMap[rule];
  if (byRule) return byRule;
  const lower = reason.toLowerCase();
  for (const k of Object.keys(reasonRuleMap)) {
    if (lower.includes(k.toLowerCase()) || rule.includes(k)) {
      return reasonRuleMap[k];
    }
  }
  return {
    summary: reason || '通用拦截原因',
    whyBlocked: `系统依据规则【${rule || '未知'}】判定当前写入存在风险，已阻止执行。`,
    typical: '通常由幂等校验、结构兼容性或业务一致性规则触发，需结合完整日志确认具体触发路径。',
    suggestion:
      '先在 Execution Trail 中查看该规则关联的输入摘要与返回码；确认可安全重放后使用 overwrite，否则使用 manual 策略线下核对。',
  };
};

export const generateExplanation = (
  contextType: ExplanationContextType,
  data: ExplanationContextData
): GeneratedExplanation => {
  if (contextType === 'chart_hover' && data.chart_hover) {
    const c = data.chart_hover;
    const title = `${c.metricName} 明细`;
    const summary = `当前指标值为 ${c.value}${c.timestamp ? `，时间点：${formatDateTime(c.timestamp)}` : ''}。`;
    let detail = '该数值由系统按日/按小时聚合统计，反映当前维度下对应冲突记录的汇总状态。';
    const suggestions: string[] = [
      '点击图表数据点可联动下方明细表查看构成记录。',
      '结合严重度分布判断是否需要立即介入处理。',
    ];
    if (c.breakdown) {
      const parts = Object.entries(c.breakdown)
        .map(([k, v]) => `${k}: ${v}`)
        .join('；');
      detail += ` 细分构成：${parts}。`;
      suggestions.push('对比各细分维度是否存在异常尖峰以定位批次问题。');
    }
    return { title, summary, detail, suggestions };
  }

  if (contextType === 'snapshot_diff' && data.snapshot_diff) {
    const s = data.snapshot_diff;
    const title = `字段差异：${s.fieldName}`;
    const typeLabel: Record<string, string> = {
      added: '字段新增',
      removed: '字段移除',
      modified: '字段定义修改',
      unchanged: '字段未变化',
    };
    const summary = `在表【${s.tableName}】中检测到${typeLabel[s.changeType ?? 'unchanged'] ?? '变更'}。`;
    let detail = '';
    if (s.changeType === 'added') {
      detail = `新增字段：旧快照中不存在该字段，新快照引入，默认值为【${s.newValue ?? '未配置'}】。迁移时存量记录会使用默认值回填。`;
    } else if (s.changeType === 'removed') {
      detail = `移除字段：旧快照存在（原定义：${s.oldValue ?? '未知'}），新快照不再使用。若下游报表或 ETL 仍引用该字段，需及时调整。`;
    } else if (s.changeType === 'modified') {
      detail = `字段修改：原【${s.oldValue ?? '—'}】→ 新【${s.newValue ?? '—'}】。差异可能是类型、长度、是否可空、默认值或注释变更。`;
    } else {
      detail = '字段在前后快照中保持一致，无需额外处理。';
    }
    return {
      title,
      summary,
      detail,
      suggestions: [
        '查看 Impact Note 获取业务影响说明。',
        '确认下游报表/API 是否依赖该字段后再决定处理策略。',
        '如涉及 NOT NULL 或枚举修改，需检查源数据是否有不兼容样本。',
      ],
    };
  }

  if (contextType === 'trail_node' && data.trail_node) {
    const t = data.trail_node;
    const title = `第 ${t.attemptNo} 次执行节点：${t.nodeName}`;
    const resultLabel = { blocked: '被拦截', failed: '执行失败', partial: '部分成功' };
    const summary = `结果：${resultLabel[t.result]}；命中规则【${t.blockRule}】。`;
    const detail = `在节点 ${t.nodeName} 执行时，系统按规则【${t.blockRule}】返回【${t.result}】，拦截原因摘要为：${t.blockReason}。`;
    const meta = getBlockReasonDetail(t.blockReason, t.blockRule);
    return {
      title,
      summary,
      detail,
      suggestions: [
        `为什么被拦：${meta.whyBlocked}`,
        `典型场景：${meta.typical}`,
        `建议处理：${meta.suggestion}`,
        '完整栈追踪可通过 FullLogPath 下载原始日志核对。',
      ],
    };
  }

  if (contextType === 'idempotent_key' && data.idempotent_key) {
    const k = data.idempotent_key;
    const typeLabel: Record<string, string> = {
      order_no: '订单号级幂等',
      biz_id: '业务唯一ID级幂等',
      unique_hash: '内容哈希级幂等',
      composite: '多字段联合幂等',
    };
    const title = `幂等键分析：${k.key.slice(0, 24)}${k.key.length > 24 ? '...' : ''}`;
    const summary = `键类型：${typeLabel[k.keyType]}；累计尝试 ${k.attempts} 次；首次执行 ${formatDate(k.firstTime)}，最近一次 ${formatRelative(k.lastTime)}。`;
    const detail =
      `该幂等键覆盖的业务操作在 ${formatDateTime(k.firstTime)} 首次进入迁移管道，` +
      `至 ${formatDateTime(k.lastTime)} 共被系统观察到 ${k.attempts} 次写入请求。` +
      (k.attempts >= 5
        ? ' 多次重试通常意味着上游重试或调度异常，建议先在上游定位重复触发来源再选择处理策略。'
        : ' 次数在正常范围内，多为网络抖动或人工误触导致。');
    const suggestions: string[] = [
      '核对幂等键粒度是否覆盖所有需要去重的维度（是否遗漏租户/门店等）。',
      '若业务确实需要重复执行，使用 overwrite 策略以最新一次请求为准重放。',
      '若拦截符合预期，直接 skip 并记录处理备注。',
    ];
    if (k.attempts >= 5) {
      suggestions.unshift('高频重试：优先排查上游定时任务或补偿链路是否异常。');
    }
    return { title, summary, detail, suggestions };
  }

  return {
    title: '明细解释',
    summary: '当前上下文信息不足，无法生成结构化解释。',
    detail: '请提供图表指标、快照字段、轨迹节点或幂等键相关字段。',
    suggestions: ['切换到支持的解释上下文后重新触发。'],
  };
};
