import db from '../db/database';
import crypto from 'crypto-js';
import {
  ConnectionPoolData,
  DiagnosisResult,
  DiagnosisBatch,
  DataDictionary
} from '../../shared/types';

export class DiagnosisService {
  private getDictionaryValues(): Record<string, number> {
    const rows = db.prepare('SELECT key, value FROM data_dictionary').all() as DataDictionary[];
    const values: Record<string, number> = {};
    rows.forEach(r => {
      values[r.key] = parseFloat(r.value);
    });
    return values;
  }

  private validateData(data: ConnectionPoolData): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (data.activeConnections < 0) issues.push('活跃连接数为负数');
    if (data.idleConnections < 0) issues.push('空闲连接数为负数');
    if (data.waitingRequests < 0) issues.push('等待请求数为负数');
    if (data.totalConnections < 0) issues.push('总连接数为负数');
    if (data.maxConnections <= 0) issues.push('最大连接数无效');
    if (data.timeoutCount < 0) issues.push('超时次数为负数');
    if (data.errorRate < 0 || data.errorRate > 100) issues.push('错误率超出正常范围');
    if (data.avgWaitTime < 0) issues.push('平均等待时间为负数');
    if (isNaN(data.activeConnections) || isNaN(data.idleConnections)) issues.push('存在NaN值');
    if (data.poolName && /[^\x00-\x7F]/.test(data.poolName)) issues.push('连接池名称包含非ASCII字符');
    if (data.totalConnections > data.maxConnections * 10) issues.push('总连接数异常偏大');
    if (data.waitingRequests > 10000) issues.push('等待请求数异常偏大');
    
    return { valid: issues.length === 0, issues };
  }

  public diagnose(poolData: ConnectionPoolData, batchId: string): DiagnosisResult[] {
    const dict = this.getDictionaryValues();
    const results: DiagnosisResult[] = [];
    const now = Date.now();

    const validation = this.validateData(poolData);
    if (!validation.valid) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'data_anomaly' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'warning',
        issueType: 'data_anomaly',
        description: `数据异常: ${validation.issues.join('; ')}`,
        affectedConnections: [poolData.activeConnections, poolData.idleConnections],
        suggestions: ['检查数据源完整性', '验证监控采集脚本', '过滤异常数据点后重新分析'],
        rawData: poolData
      });
    }

    const usageRate = (poolData.totalConnections / poolData.maxConnections) * 100;

    if (usageRate >= dict['pool.max_connections_critical']) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'pool_exhausted' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'critical',
        issueType: 'pool_exhausted',
        description: `连接池严重耗尽，使用率达${usageRate.toFixed(1)}%`,
        affectedConnections: [poolData.activeConnections, poolData.totalConnections],
        suggestions: [
          '立即评估是否需要扩容最大连接数',
          '检查是否存在连接泄漏',
          '考虑限流降级策略'
        ],
        rawData: poolData
      });
    } else if (usageRate >= dict['pool.max_connections_warning']) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'pool_high_usage' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'warning',
        issueType: 'pool_high_usage',
        description: `连接池使用率偏高，达${usageRate.toFixed(1)}%`,
        affectedConnections: [poolData.activeConnections],
        suggestions: ['关注连接数增长趋势', '检查是否有慢查询占用连接'],
        rawData: poolData
      });
    }

    if (poolData.activeConnections === 0 && poolData.waitingRequests > 0) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'connection_failure' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'critical',
        issueType: 'connection_failure',
        description: `无法建立数据库连接，${poolData.waitingRequests}个请求在等待`,
        affectedConnections: [],
        suggestions: [
          '检查数据库实例是否存活',
          '验证连接配置(host/port/database)',
          '检查网络连通性和防火墙规则',
          '确认数据库账号权限'
        ],
        rawData: poolData
      });
    }

    if (poolData.waitingRequests >= dict['pool.waiting_warning']) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'waiting_queue' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'warning',
        issueType: 'waiting_queue',
        description: `等待队列过长，当前${poolData.waitingRequests}个请求在等待`,
        affectedConnections: [poolData.waitingRequests],
        suggestions: ['检查是否有慢查询阻塞', '考虑增加连接数', '优化查询性能'],
        rawData: poolData
      });
    }

    if (poolData.timeoutCount >= dict['pool.timeout_warning']) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'connection_timeout' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'warning',
        issueType: 'connection_timeout',
        description: `连接超时频繁，周期内超时${poolData.timeoutCount}次`,
        affectedConnections: [],
        suggestions: [
          '检查网络是否稳定',
          '验证连接存活超时配置',
          '考虑调整连接池testOnBorrow配置'
        ],
        rawData: poolData
      });
    }

    if (poolData.errorRate >= dict['pool.error_rate_warning']) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'high_error_rate' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'warning',
        issueType: 'high_error_rate',
        description: `错误率偏高，达${poolData.errorRate.toFixed(1)}%`,
        affectedConnections: [],
        suggestions: ['检查数据库错误日志', '验证SQL语句正确性', '检查数据库资源使用情况'],
        rawData: poolData
      });
    }

    if (poolData.idleConnections === 0 && poolData.activeConnections === poolData.maxConnections) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'connection_leak' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'critical',
        issueType: 'connection_leak',
        description: '疑似连接泄漏，无空闲连接且活跃连接已达上限',
        affectedConnections: [poolData.activeConnections],
        suggestions: [
          '检查代码是否在finally块中释放连接',
          '分析连接生命周期日志',
          '考虑启用连接泄漏检测'
        ],
        rawData: poolData
      });
    }

    if (poolData.activeConnections > 0 && poolData.errorRate > 5 && poolData.timeoutCount > 5) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'connection_reset' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'warning',
        issueType: 'connection_reset',
        description: '连接被异常重置，可能是网络设备超时断开',
        affectedConnections: [],
        suggestions: [
          '检查防火墙空闲超时配置',
          '验证连接池minEvictableIdleTimeMillis',
          '考虑启用testWhileIdle'
        ],
        rawData: poolData
      });
    }

    if (results.length === 0) {
      results.push({
        id: 'res-' + crypto.MD5(batchId + 'normal' + poolData.id).toString(),
        batchId,
        timestamp: now,
        poolName: poolData.poolName,
        severity: 'normal',
        issueType: 'normal',
        description: '连接池运行正常',
        affectedConnections: [],
        suggestions: ['继续保持监控'],
        rawData: poolData
      });
    }

    return results;
  }

  public runDiagnosis(batchId: string): DiagnosisResult[] {
    const batch = db.prepare('SELECT * FROM diagnosis_batch WHERE id = ?').get(batchId) as any;
    if (!batch) throw new Error('Batch not found');

    const rawData: ConnectionPoolData[] = JSON.parse(batch.raw_data);
    const allResults: DiagnosisResult[] = [];

    rawData.forEach(data => {
      const results = this.diagnose(data, batchId);
      allResults.push(...results);
    });

    const insertResult = db.prepare(`
      INSERT INTO diagnosis_result 
      (id, batch_id, pool_name, severity, issue_type, description, affected_connections, suggestions, raw_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    allResults.forEach(r => {
      insertResult.run(
        r.id,
        r.batchId,
        r.poolName,
        r.severity,
        r.issueType,
        r.description,
        JSON.stringify(r.affectedConnections),
        JSON.stringify(r.suggestions),
        JSON.stringify(r.rawData)
      );
    });

    db.prepare("UPDATE diagnosis_batch SET status = 'completed' WHERE id = ?").run(batchId);

    return allResults;
  }

  public importData(data: ConnectionPoolData[], operatorId: string, operatorName: string): DiagnosisBatch {
    const now = Date.now();
    const batchId = 'batch-' + crypto.MD5('batch' + now + Math.random()).toString();
    const dataHash = crypto.MD5(JSON.stringify(data)).toString();

    db.prepare(`
      INSERT INTO diagnosis_batch (id, timestamp, operator, operator_id, data_hash, status, raw_data)
      VALUES (?, ?, ?, ?, ?, 'pending', ?)
    `).run(batchId, now, operatorName, operatorId, dataHash, JSON.stringify(data));

    const snapshotId = 'snap-' + crypto.MD5('snapshot' + batchId).toString();
    db.prepare(`
      INSERT INTO version_snapshot (id, batch_id, data, checksum, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(snapshotId, batchId, JSON.stringify(data), dataHash, now);

    return {
      id: batchId,
      timestamp: now,
      operator: operatorName,
      operatorId,
      dataHash,
      status: 'pending',
      rawData: data
    };
  }

  public getBatches(): DiagnosisBatch[] {
    const rows = db.prepare('SELECT * FROM diagnosis_batch ORDER BY timestamp DESC').all() as any[];
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      operator: r.operator,
      operatorId: r.operator_id,
      dataHash: r.data_hash,
      status: r.status,
      rawData: JSON.parse(r.raw_data)
    }));
  }

  public getBatchResults(batchId: string): { batch: DiagnosisBatch; results: DiagnosisResult[] } {
    const batchRow = db.prepare('SELECT * FROM diagnosis_batch WHERE id = ?').get(batchId) as any;
    if (!batchRow) throw new Error('Batch not found');

    const resultRows = db.prepare('SELECT * FROM diagnosis_result WHERE batch_id = ? ORDER BY severity DESC').all(batchId) as any[];

    return {
      batch: {
        id: batchRow.id,
        timestamp: batchRow.timestamp,
        operator: batchRow.operator,
        operatorId: batchRow.operator_id,
        dataHash: batchRow.data_hash,
        status: batchRow.status,
        rawData: JSON.parse(batchRow.raw_data)
      },
      results: resultRows.map(r => ({
        id: r.id,
        batchId: r.batch_id,
        timestamp: r.timestamp,
        poolName: r.pool_name,
        severity: r.severity,
        issueType: r.issue_type,
        description: r.description,
        affectedConnections: JSON.parse(r.affected_connections || '[]'),
        suggestions: JSON.parse(r.suggestions || '[]'),
        rawData: r.raw_data ? JSON.parse(r.raw_data) : undefined
      }))
    };
  }

  public generateReport(batchId: string): string {
    const { batch, results } = this.getBatchResults(batchId);
    
    const criticalCount = results.filter(r => r.severity === 'critical').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;
    const normalCount = results.filter(r => r.severity === 'normal').length;

    let report = '='.repeat(60) + '\n';
    report += '        数据库连接池诊断报告\n';
    report += '='.repeat(60) + '\n\n';
    report += `批次ID: ${batch.id}\n`;
    report += `诊断时间: ${new Date(batch.timestamp).toLocaleString('zh-CN')}\n`;
    report += `操作员: ${batch.operator}\n`;
    report += `数据哈希: ${batch.dataHash}\n\n`;
    
    report += '-'.repeat(60) + '\n';
    report += '诊断概览\n';
    report += '-'.repeat(60) + '\n';
    report += `严重问题: ${criticalCount}\n`;
    report += `警告问题: ${warningCount}\n`;
    report += `正常: ${normalCount}\n\n`;

    report += '-'.repeat(60) + '\n';
    report += '问题明细\n';
    report += '-'.repeat(60) + '\n\n';

    results.forEach((r, idx) => {
      const severityLabel = r.severity === 'critical' ? '[严重]' : r.severity === 'warning' ? '[警告]' : '[正常]';
      report += `${idx + 1}. ${severityLabel} ${r.issueType}\n`;
      report += `   连接池: ${r.poolName}\n`;
      report += `   描述: ${r.description}\n`;
      if (r.suggestions.length > 0) {
        report += '   建议:\n';
        r.suggestions.forEach(s => {
          report += `     - ${s}\n`;
        });
      }
      report += '\n';
    });

    report += '-'.repeat(60) + '\n';
    report += '原始数据摘要\n';
    report += '-'.repeat(60) + '\n';
    batch.rawData.forEach(d => {
      const usage = ((d.totalConnections / d.maxConnections) * 100).toFixed(1);
      report += `${d.poolName}: 活跃=${d.activeConnections}, 空闲=${d.idleConnections}, 使用率=${usage}%\n`;
    });

    report += '\n' + '='.repeat(60) + '\n';
    report += '报告生成时间: ' + new Date().toLocaleString('zh-CN') + '\n';
    report += '='.repeat(60) + '\n';

    return report;
  }

  public compareBatches(batchId1: string, batchId2: string) {
    const data1 = this.getBatchResults(batchId1);
    const data2 = this.getBatchResults(batchId2);

    const differences: any[] = [];

    const poolNames = new Set([
      ...data1.batch.rawData.map(d => d.poolName),
      ...data2.batch.rawData.map(d => d.poolName)
    ]);

    poolNames.forEach(poolName => {
      const d1 = data1.batch.rawData.find(d => d.poolName === poolName);
      const d2 = data2.batch.rawData.find(d => d.poolName === poolName);

      if (!d1) {
        differences.push({
          field: poolName,
          value1: null,
          value2: d2,
          changeType: 'added' as const,
          severity: this.calcSeverity(d2!)
        });
      } else if (!d2) {
        differences.push({
          field: poolName,
          value1: d1,
          value2: null,
          changeType: 'removed' as const,
          severity: this.calcSeverity(d1)
        });
      } else {
        const fields = ['activeConnections', 'idleConnections', 'waitingRequests', 'totalConnections', 'timeoutCount', 'errorRate'];
        fields.forEach(field => {
          const v1 = d1[field as keyof ConnectionPoolData];
          const v2 = d2[field as keyof ConnectionPoolData];
          if (v1 !== v2) {
            const diff = Math.abs(Number(v2) - Number(v1));
            const pct = Number(v1) > 0 ? (diff / Number(v1)) * 100 : 100;
            if (pct > 10 || diff > 5) {
              differences.push({
                field: `${poolName}.${field}`,
                value1: v1,
                value2: v2,
                changeType: 'modified' as const,
                severity: pct > 50 ? 'critical' : pct > 20 ? 'warning' : 'normal'
              });
            }
          }
        });

        const r1 = data1.results.filter(r => r.poolName === poolName);
        const r2 = data2.results.filter(r => r.poolName === poolName);
        
        const types1 = new Set(r1.map(r => r.issueType));
        const types2 = new Set(r2.map(r => r.issueType));
        
        types2.forEach(t => {
          if (!types1.has(t)) {
            const newResult = r2.find(r => r.issueType === t)!;
            differences.push({
              field: `${poolName}.issue.${t}`,
              value1: null,
              value2: newResult,
              changeType: 'added' as const,
              severity: newResult.severity
            });
          }
        });
      }
    });

    const criticalCount = differences.filter(d => d.severity === 'critical').length;
    const warningCount = differences.filter(d => d.severity === 'warning').length;

    return {
      id1: batchId1,
      id2: batchId2,
      timestamp1: data1.batch.timestamp,
      timestamp2: data2.batch.timestamp,
      differences,
      summary: {
        totalChanges: differences.length,
        criticalChanges: criticalCount,
        warningChanges: warningCount
      }
    };
  }

  private calcSeverity(d: ConnectionPoolData): 'normal' | 'warning' | 'critical' {
    const dict = this.getDictionaryValues();
    const usage = (d.totalConnections / d.maxConnections) * 100;
    if (usage >= dict['pool.max_connections_critical']) return 'critical';
    if (usage >= dict['pool.max_connections_warning']) return 'warning';
    if (d.waitingRequests >= dict['pool.waiting_warning']) return 'warning';
    if (d.errorRate >= dict['pool.error_rate_warning']) return 'warning';
    return 'normal';
  }
}

export default new DiagnosisService();
