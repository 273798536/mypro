import { create } from 'zustand';
import type {
  MigrationScript,
  MigrationBatch,
  FilterState,
  OperationType,
  AnomalyType,
  ScriptStatus,
  Operation,
} from '@/types';
import { mockScripts, mockBatches } from '@/data/mockData';

interface ApprovalState {
  scripts: MigrationScript[];
  batches: MigrationBatch[];
  filters: FilterState;
  selectedScriptId: string | null;

  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  getFilteredScripts: () => MigrationScript[];
  getScriptById: (id: string) => MigrationScript | undefined;
  getScriptsByBatchId: (batchId: string) => MigrationScript[];

  importScripts: (
    batchName: string,
    source: string,
    files: { fileName: string; sqlContent: string; sourceMaterial: string }[]
  ) => void;

  addOperation: (
    scriptId: string,
    type: OperationType,
    operator: string,
    note: string,
    result: string
  ) => void;

  addConclusion: (scriptId: string, content: string) => void;
  updateScriptStatus: (scriptId: string, status: ScriptStatus) => void;

  getStatistics: () => {
    totalScripts: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    anomalyCounts: Record<AnomalyType, number>;
  };
}

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

const getNowString = () => {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  scripts: mockScripts,
  batches: mockBatches,
  filters: {
    anomalyType: 'all',
    severity: 'all',
    status: 'all',
    sourceMaterial: '',
  },
  selectedScriptId: null,

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  resetFilters: () => {
    set({
      filters: {
        anomalyType: 'all',
        severity: 'all',
        status: 'all',
        sourceMaterial: '',
      },
    });
  },

  getFilteredScripts: () => {
    const { scripts, filters } = get();
    return scripts.filter((script) => {
      if (filters.anomalyType !== 'all') {
        if (!script.anomalies.some((a) => a.type === filters.anomalyType)) {
          return false;
        }
      }
      if (filters.severity !== 'all') {
        if (!script.anomalies.some((a) => a.severity === filters.severity)) {
          return false;
        }
      }
      if (filters.status !== 'all') {
        if (script.status !== filters.status) {
          return false;
        }
      }
      if (filters.sourceMaterial) {
        if (
          !script.sourceMaterial
            .toLowerCase()
            .includes(filters.sourceMaterial.toLowerCase())
        ) {
          return false;
        }
      }
      return true;
    });
  },

  getScriptById: (id) => {
    return get().scripts.find((s) => s.id === id);
  },

  getScriptsByBatchId: (batchId) => {
    return get().scripts.filter((s) => s.batchId === batchId);
  },

  importScripts: (batchName, source, files) => {
    const batchId = generateId();
    const now = getNowString();
    const newBatch: MigrationBatch = {
      id: batchId,
      name: batchName,
      importedAt: now,
      source,
      scriptIds: [],
    };

    const newScripts: MigrationScript[] = files.map((file) => {
      const scriptId = generateId();
      newBatch.scriptIds.push(scriptId);

      const anomalies = detectAnomalies(file.sqlContent, file.sourceMaterial);

      return {
        id: scriptId,
        batchId,
        fileName: file.fileName,
        sourceMaterial: file.sourceMaterial,
        sqlContent: file.sqlContent,
        anomalies,
        conclusions: [
          {
            version: 1,
            content:
              anomalies.length > 0
                ? `检测到 ${anomalies.length} 个异常，请逐一复核。`
                : '脚本检测通过，未发现异常。',
            createdAt: now,
          },
        ],
        operations: [],
        status: 'pending',
      };
    });

    set((state) => ({
      batches: [newBatch, ...state.batches],
      scripts: [...newScripts, ...state.scripts],
    }));
  },

  addOperation: (scriptId, type, operator, note, result) => {
    const operation: Operation = {
      id: generateId(),
      type,
      label: type === 'rerun' ? '重复运行' : type === 'supplement' ? '补录' : '人工确认',
      operator,
      timestamp: getNowString(),
      note,
      result,
    };

    const statusMap: Record<OperationType, ScriptStatus> = {
      rerun: 'rerun',
      supplement: 'supplemented',
      manual_confirm: 'manual_review',
    };

    set((state) => ({
      scripts: state.scripts.map((s) =>
        s.id === scriptId
          ? {
              ...s,
              operations: [...s.operations, operation],
              status: statusMap[type],
            }
          : s
      ),
    }));
  },

  addConclusion: (scriptId, content) => {
    const now = getNowString();
    set((state) => ({
      scripts: state.scripts.map((s) =>
        s.id === scriptId
          ? {
              ...s,
              conclusions: [
                ...s.conclusions,
                {
                  version: s.conclusions.length + 1,
                  content,
                  createdAt: now,
                },
              ],
            }
          : s
      ),
    }));
  },

  updateScriptStatus: (scriptId, status) => {
    set((state) => ({
      scripts: state.scripts.map((s) =>
        s.id === scriptId ? { ...s, status } : s
      ),
    }));
  },

  getStatistics: () => {
    const { scripts } = get();
    let criticalCount = 0;
    let warningCount = 0;
    let infoCount = 0;
    const anomalyCounts: Record<AnomalyType, number> = {
      pagination_unstable: 0,
      backup_gap: 0,
      schema_drift: 0,
      slow_query_risk: 0,
      breaking_change: 0,
    };

    scripts.forEach((script) => {
      script.anomalies.forEach((anomaly) => {
        if (anomaly.severity === 'critical') criticalCount++;
        else if (anomaly.severity === 'warning') warningCount++;
        else infoCount++;

        anomalyCounts[anomaly.type]++;
      });
    });

    return {
      totalScripts: scripts.length,
      criticalCount,
      warningCount,
      infoCount,
      anomalyCounts,
    };
  },
}));

function detectAnomalies(
  sqlContent: string,
  sourceMaterial: string
): MigrationScript['anomalies'] {
  const anomalies: MigrationScript['anomalies'] = [];
  const lines = sqlContent.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    if (
      /LIMIT\s+\d+\s+OFFSET\s+\d+/i.test(line) &&
      !/\bORDER\s+BY\b/i.test(
        lines.slice(Math.max(0, index - 10), index + 1).join(' ')
      )
    ) {
      anomalies.push({
        id: generateId(),
        type: 'pagination_unstable',
        severity: 'warning',
        title: '分页查询缺少 ORDER BY',
        description: `第 ${lineNum} 行的分页查询未指定明确的 ORDER BY 子句，相同数据在不同执行环境下返回顺序可能不一致，导致分页结果重复或遗漏。`,
        sourceMaterial,
        lineRange: `L${lineNum}`,
        handlingOpinion:
          '建议添加 ORDER BY 主键或唯一键 DESC 确保分页顺序稳定。如果业务上允许接受一定程度的顺序波动，也请显式指定 ORDER BY 时间字段 DESC，至少保证同一批次内顺序一致。',
      });
    }

    if (/DROP\s+INDEX/i.test(line)) {
      const backupExists = /SHOW\s+CREATE\s+TABLE|CREATE\s+TABLE.*AS\s+SELECT|BACKUP/i.test(
        lines.slice(Math.max(0, index - 20), index).join(' ')
      );
      if (!backupExists) {
        anomalies.push({
          id: generateId(),
          type: 'backup_gap',
          severity: 'critical',
          title: '删除索引前未备份',
          description: `第 ${lineNum} 行删除索引，但未执行 SHOW CREATE TABLE 或 CREATE TABLE ... AS SELECT 备份原有索引定义。一旦删除后发现影响查询性能，无法快速回滚。`,
          sourceMaterial,
          lineRange: `L${lineNum}`,
          handlingOpinion:
            '删除索引前必须执行 SHOW CREATE TABLE 并将结果保存到变更工单附件。建议在低峰期操作，操作前确认相关慢查询日志中无依赖该索引的查询。',
        });
      }
    }

    if (/DROP\s+COLUMN/i.test(line)) {
      const backupExists = /SHOW\s+CREATE\s+TABLE|CREATE\s+TABLE.*AS\s+SELECT|BACKUP/i.test(
        lines.slice(Math.max(0, index - 20), index).join(' ')
      );
      if (!backupExists) {
        anomalies.push({
          id: generateId(),
          type: 'backup_gap',
          severity: 'warning',
          title: '删除列前未备份数据',
          description: `第 ${lineNum} 行删除列，但未执行数据备份。如果后续发现仍有业务场景需要这些字段，数据将无法恢复。`,
          sourceMaterial,
          lineRange: `L${lineNum}`,
          handlingOpinion:
            '建议先执行 CREATE TABLE ..._backup AS SELECT * FROM ...，保留至少 30 天后再清理备份。',
        });
      }
    }

    if (/DROP\s+COLUMN/i.test(line)) {
      const columnMatch = /DROP\s+COLUMN\s+(\w+)/i.exec(line);
      if (columnMatch) {
        const columnName = columnMatch[1];
        const viewReference = new RegExp(
          `CREATE\\s+(OR\\s+REPLACE\\s+)?VIEW.*${columnName}`,
          'i'
        ).test(sqlContent);
        if (viewReference) {
          anomalies.push({
            id: generateId(),
            type: 'breaking_change',
            severity: 'critical',
            title: '删除列仍被视图引用',
            description: `第 ${lineNum} 行删除 ${columnName} 列，但脚本中存在视图仍然引用该列。执行后视图会失效，所有依赖该视图的报表和下游任务都会报错。`,
            sourceMaterial,
            lineRange: `L${lineNum}`,
            handlingOpinion:
              '必须先修改或删除依赖视图，再执行 DROP COLUMN 操作。建议检查 INFORMATION_SCHEMA.VIEW_TABLE_USAGE 确认所有依赖关系。',
          });
        }
      }
    }

    const typoChecks: Record<string, string> = {
      profie: 'profile',
      usre: 'user',
      oder: 'order',
      recieve: 'receive',
      seperate: 'separate',
    };
    for (const [typo, correct] of Object.entries(typoChecks)) {
      const typoRegex = new RegExp(`\\b${typo}\\b`, 'i');
      if (typoRegex.test(line) && /CREATE\s+TABLE|ALTER\s+TABLE/i.test(lines.slice(Math.max(0, index - 2), index + 1).join(' '))) {
        anomalies.push({
          id: generateId(),
          type: 'breaking_change',
          severity: 'critical',
          title: '标识符拼写错误',
          description: `第 ${lineNum} 行检测到拼写错误："${typo}" 应为 "${correct}"。该错误会导致后续所有依赖该标识符的脚本、ETL 任务、报表查询全部失败。`,
          sourceMaterial,
          lineRange: `L${lineNum}`,
          handlingOpinion: `这是典型的"材料里混进来的小麻烦"，建议在代码审核阶段强制检查标识符与设计文档一致性。修复方式：将所有 "${typo}" 改为 "${correct}"。`,
        });
      }
    }
  });

  return anomalies;
}
