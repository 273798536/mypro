const { v4: uuidv4 } = require('uuid');
const {
  versionHistoryDAO,
  sampleTransferOrderDAO,
  sizeModificationOpinionDAO,
  fabricInventoryDAO,
  retryQueueDAO,
  manualOpinionDAO,
  db
} = require('../dao');

class DataConsistencyService {
  async getUnifiedFactSource(queueId) {
    const queue = await retryQueueDAO.getById(queueId);
    if (!queue) return null;

    const [transferOrders, sizeOpinions, fabricRecords, versionHistory] = await Promise.all([
      sampleTransferOrderDAO.getByQueueId(queueId),
      sizeModificationOpinionDAO.getByQueueId(queueId),
      fabricInventoryDAO.getByQueueId(queueId),
      versionHistoryDAO.getQueueHistory(queueId)
    ]);

    const fabricBalance = this.calculateFabricBalance(fabricRecords);
    const latestModifications = this.getLatestSizeModifications(sizeOpinions);
    const transferSummary = this.summarizeTransfers(transferOrders);

    return {
      queueId,
      styleCode: queue.style_code,
      hotlineOrderId: queue.hotline_order_id,
      status: queue.status,
      lastUpdated: queue.updated_at,
      unifiedData: {
        transferSummary,
        latestModifications,
        fabricBalance
      },
      versionHistory: versionHistory.slice(0, 20),
      dataVersion: this.calculateDataVersion(versionHistory)
    };
  }

  calculateFabricBalance(fabricRecords) {
    const balance = {};
    
    for (const record of fabricRecords) {
      const key = `${record.fabric_code}_${record.color}`;
      if (!balance[key]) {
        balance[key] = {
          fabricCode: record.fabric_code,
          fabricName: record.fabric_name,
          color: record.color,
          unit: record.unit,
          in: 0,
          out: 0,
          balance: 0,
          history: []
        };
      }
      
      const qty = parseFloat(record.quantity) || 0;
      if (record.in_out_type === 'in') {
        balance[key].in += qty;
      } else {
        balance[key].out += qty;
      }
      balance[key].balance = balance[key].in - balance[key].out;
      
      balance[key].history.push({
        date: record.operation_date,
        type: record.in_out_type,
        quantity: qty,
        operator: record.operator
      });
    }

    return Object.values(balance);
  }

  getLatestSizeModifications(sizeOpinions) {
    const latest = {};
    
    for (const opinion of sizeOpinions) {
      const key = `${opinion.size}_${opinion.part}`;
      if (!latest[key] || opinion.round > latest[key].round) {
        latest[key] = {
          size: opinion.size,
          part: opinion.part,
          beforeValue: opinion.before_value,
          afterValue: opinion.after_value,
          round: opinion.round,
          modifier: opinion.modifier,
          modifyDate: opinion.modify_date,
          reason: opinion.reason
        };
      }
    }

    return Object.values(latest);
  }

  summarizeTransfers(transferOrders) {
    const summary = {
      totalQuantity: 0,
      orders: [],
      byDept: {}
    };

    for (const order of transferOrders) {
      summary.totalQuantity += parseInt(order.quantity) || 0;
      summary.orders.push({
        orderNo: order.order_no,
        fromDept: order.from_dept,
        toDept: order.to_dept,
        quantity: order.quantity,
        date: order.transfer_date,
        status: order.status
      });

      const deptKey = `${order.from_dept}_to_${order.to_dept}`;
      summary.byDept[deptKey] = (summary.byDept[deptKey] || 0) + (parseInt(order.quantity) || 0);
    }

    return summary;
  }

  calculateDataVersion(versionHistory) {
    if (!versionHistory || versionHistory.length === 0) return 0;
    return Math.max(...versionHistory.map(v => v.version));
  }

  async verifyConsistency(queueId) {
    const factSource = await this.getUnifiedFactSource(queueId);
    if (!factSource) return { consistent: false, error: 'Queue not found' };

    const issues = [];

    for (const fabric of factSource.unifiedData.fabricBalance) {
      if (fabric.balance < 0) {
        issues.push({
          type: 'negative_balance',
          severity: 'high',
          message: `面料 ${fabric.fabricCode}(${fabric.color}) 出现负库存: ${fabric.balance}`,
          detail: fabric
        });
      }
    }

    const transferTotal = factSource.unifiedData.transferSummary.totalQuantity;
    if (transferTotal === 0 && factSource.queue.status === 'success') {
      issues.push({
        type: 'no_transfer_data',
        severity: 'medium',
        message: '成功处理但没有样衣流转数据'
      });
    }

    return {
      consistent: issues.length === 0,
      issues,
      checkTime: new Date().toISOString()
    };
  }

  async exportUnifiedData(queueId, format = 'json') {
    const factSource = await this.getUnifiedFactSource(queueId);
    if (!factSource) return null;

    const consistencyCheck = await this.verifyConsistency(queueId);

    const exportData = {
      exportTime: new Date().toISOString(),
      dataVersion: factSource.dataVersion,
      consistent: consistencyCheck.consistent,
      consistencyIssues: consistencyCheck.issues,
      ...factSource
    };

    if (format === 'csv') {
      return this.convertToCSV(exportData);
    }

    return exportData;
  }

  convertToCSV(data) {
    const rows = [];
    
    rows.push(['服装打版样衣重试补偿队列 - 统一数据导出']);
    rows.push(['导出时间', data.exportTime]);
    rows.push(['数据版本', data.dataVersion]);
    rows.push(['一致性状态', data.consistent ? '一致' : '不一致']);
    rows.push([]);

    rows.push(['款号', data.styleCode]);
    rows.push(['热线单号', data.hotlineOrderId]);
    rows.push(['状态', data.status]);
    rows.push([]);

    rows.push(['--- 面料库存 ---']);
    rows.push(['面料编码', '面料名称', '颜色', '入库', '出库', '结存', '单位']);
    for (const fabric of data.unifiedData.fabricBalance) {
      rows.push([
        fabric.fabricCode,
        fabric.fabricName,
        fabric.color,
        fabric.in,
        fabric.out,
        fabric.balance,
        fabric.unit
      ]);
    }
    rows.push([]);

    rows.push(['--- 最新尺码修改 ---']);
    rows.push(['尺码', '部位', '修改前', '修改后', '轮次', '修改人', '修改日期']);
    for (const mod of data.unifiedData.latestModifications) {
      rows.push([
        mod.size,
        mod.part,
        mod.beforeValue,
        mod.afterValue,
        mod.round,
        mod.modifier,
        mod.modifyDate
      ]);
    }

    return rows.map(row => row.join(',')).join('\n');
  }

  async getRecordHistory(recordType, recordId) {
    const history = await versionHistoryDAO.getRecordHistory(recordType, recordId);
    
    return history.map(h => ({
      version: h.version,
      data: JSON.parse(h.data_snapshot),
      changeReason: h.change_reason,
      changedBy: h.changed_by,
      changedAt: h.changed_at
    }));
  }

  async recordManualChange(queueId, recordType, recordId, oldData, newData, operator, reason) {
    const id = uuidv4();
    const currentVersion = await this.getCurrentVersion(recordType, recordId);
    
    await db.run(`
      INSERT INTO version_history 
      (id, queue_id, record_type, record_id, version, data_snapshot, change_reason, changed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      queueId,
      recordType,
      recordId,
      currentVersion + 1,
      JSON.stringify(newData),
      reason,
      operator
    ]);

    await manualOpinionDAO.create({
      id: uuidv4(),
      queue_id: queueId,
      operator: operator,
      opinion_type: 'manual_edit',
      content: `修改 ${recordType} 记录: ${reason}`,
      target_record_type: recordType,
      target_record_id: recordId,
      operation_type: 'edit'
    });

    return true;
  }

  async getCurrentVersion(recordType, recordId) {
    const history = await versionHistoryDAO.getRecordHistory(recordType, recordId);
    return history.length > 0 ? Math.max(...history.map(h => h.version)) : 0;
  }
}

module.exports = new DataConsistencyService();
