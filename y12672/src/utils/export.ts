import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { useAppStore } from '../store/appStore';
import type { ExportSnapshot, ProcessingRecord, HistoryLog } from '../types';

export function useExport() {
  const anomalies = useAppStore((state) => state.anomalies);
  const processingRecords = useAppStore((state) => state.processingRecords);
  const historyLogs = useAppStore((state) => state.historyLogs);
  const exportData = useAppStore((state) => state.exportData);
  const addProcessingRecord = useAppStore((state) => state.addProcessingRecord);
  const addHistoryLog = useAppStore((state) => state.addHistoryLog);

  const operator = '当前用户';
  const operatorRole = 'operations_team';

  const getAnomalyTypeLabel = (type: string) => {
    switch (type) {
      case 'model_overlap':
        return '模型重叠';
      case 'camera_lost':
        return '相机视角丢失';
      case 'size_exceed':
        return '尺寸超限';
      case 'position_offset':
        return '位置偏移';
      default:
        return type;
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return '高危';
      case 'medium':
        return '中危';
      case 'low':
        return '低危';
      default:
        return severity;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '待处理';
      case 'processing':
        return '处理中';
      case 'processed':
        return '已处理';
      case 'reviewed':
        return '已复核';
      default:
        return status;
    }
  };

  const recordExport = (snapshot: ExportSnapshot, description: string) => {
    exportData(snapshot);

    snapshot.anomalyIds.forEach((anomalyId) => {
      const exportRecord: ProcessingRecord = {
        id: `pr_export_${Date.now()}_${anomalyId}`,
        anomalyId,
        operator,
        operatorRole,
        action: 'export',
        afterValue: description,
        timestamp: new Date(),
        exportSnapshot: snapshot,
      };
      addProcessingRecord(exportRecord);

      const historyLog: HistoryLog = {
        id: `log_export_${Date.now()}_${anomalyId}`,
        targetType: 'anomaly',
        targetId: anomalyId,
        operator,
        operatorRole,
        action: 'export',
        beforeState: {},
        afterState: {
          exportType: snapshot.type,
          exportFormat: snapshot.format,
          exportedAt: snapshot.exportedAt.toISOString(),
        },
        reason: description,
        timestamp: new Date(),
      };
      addHistoryLog(historyLog);
    });
  };

  const exportAnomalyReport = (selectedAnomalyIds?: string[]) => {
    const targetIds = selectedAnomalyIds || anomalies.map((a) => a.id);
    const targetAnomalies = anomalies.filter((a) => targetIds.includes(a.id));
    const relatedRecords = processingRecords.filter((pr) => targetIds.includes(pr.anomalyId));
    const relatedLogs = historyLogs.filter((log) =>
      targetIds.includes(log.targetId) && log.targetType === 'anomaly'
    );

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(40);
    doc.text('港口堆场箱位异常报告', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 105, 30, { align: 'center' });
    doc.text(`异常总数: ${targetAnomalies.length} | 处理记录数: ${relatedRecords.length} | 历史日志数: ${relatedLogs.length}`, 105, 38, { align: 'center' });

    let yPosition = 50;
    const pageHeight = doc.internal.pageSize.height;

    targetAnomalies.forEach((anomaly, index) => {
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text(`异常 ${index + 1}: ${getAnomalyTypeLabel(anomaly.type)} (ID: ${anomaly.id})`, 20, yPosition);

      yPosition += 8;
      doc.setFontSize(9);
      doc.setTextColor(60);

      const anomalyRecords = relatedRecords.filter((pr) => pr.anomalyId === anomaly.id);
      const anomalyLogs = relatedLogs.filter((log) => log.targetId === anomaly.id);

      doc.text(`严重程度: ${getSeverityLabel(anomaly.severity)} | 处理状态: ${getStatusLabel(anomaly.status)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`来源: ${anomaly.sourceInfo.sourceFile} | 批次: ${anomaly.sourceInfo.importBatch}`, 25, yPosition);
      yPosition += 6;
      doc.text(`风险备注: ${anomaly.riskNote || '暂无'}`, 25, yPosition);
      yPosition += 6;
      doc.text(`处理意见: ${anomaly.processingSuggestion || '暂无'}`, 25, yPosition);

      if (anomalyRecords.length > 0) {
        yPosition += 8;
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text(`处理记录 (共${anomalyRecords.length}条):`, 25, yPosition);
        yPosition += 5;

        anomalyRecords.forEach((record) => {
          const actionLabel = record.action === 'export'
            ? '导出记录'
            : record.action === 'add_risk_note'
            ? '添加风险备注'
            : record.action === 'add_suggestion'
            ? '填写处理意见'
            : record.action === 'change_status'
            ? '修改状态'
            : record.action === 'review'
            ? '复核确认'
            : record.action;
          doc.text(
            `- ${record.operator}(${record.operatorRole === 'simulation_engineer' ? '仿真' : '运维'}): ${actionLabel} | ${new Date(record.timestamp).toLocaleString('zh-CN')}`,
            30,
            yPosition
          );
          yPosition += 5;
        });
      }

      if (anomalyLogs.length > 0) {
        yPosition += 4;
        doc.setFontSize(8);
        doc.setTextColor(120, 0, 150);
        doc.text(`历史追溯 (共${anomalyLogs.length}条):`, 25, yPosition);
        yPosition += 5;

        anomalyLogs.forEach((log) => {
          doc.text(
            `- ${log.operator}: ${log.action} | 原因: ${log.reason} | ${new Date(log.timestamp).toLocaleString('zh-CN')}`,
            30,
            yPosition
          );
          yPosition += 5;
        });
      }

      yPosition += 8;
      doc.setDrawColor(200);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 10;
    });

    const snapshot: ExportSnapshot = {
      type: 'report',
      format: 'pdf',
      anomalyIds: targetIds,
      processingRecords: relatedRecords,
      exportedBy: operator,
      exportedAt: new Date(),
    };
    recordExport(snapshot, `导出异常汇总报告（PDF，共${targetAnomalies.length}条异常）`);

    doc.save(`异常报告_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportProcessingRecords = () => {
    const wsData = processingRecords.map((record) => ({
      异常ID: record.anomalyId,
      操作人: record.operator,
      角色: record.operatorRole === 'simulation_engineer' ? '仿真工程师' : '运维人员',
      操作类型: record.action,
      修改前: record.beforeValue || '-',
      修改后: record.afterValue,
      操作时间: new Date(record.timestamp).toLocaleString('zh-CN'),
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '处理记录');

    const targetIds = [...new Set(processingRecords.map((pr) => pr.anomalyId))];
    const snapshot: ExportSnapshot = {
      type: 'report',
      format: 'excel',
      anomalyIds: targetIds,
      processingRecords,
      exportedBy: operator,
      exportedAt: new Date(),
    };
    recordExport(snapshot, `导出全部处理记录（Excel，共${processingRecords.length}条）`);

    XLSX.writeFile(wb, `处理记录_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportHistoryLogs = () => {
    const wsData = historyLogs.map((log) => ({
      目标类型: log.targetType === 'anomaly' ? '异常记录' : '箱位',
      目标ID: log.targetId,
      操作人: log.operator,
      角色: log.operatorRole === 'simulation_engineer' ? '仿真工程师' : '运维人员',
      操作类型: log.action,
      修改前: JSON.stringify(log.beforeState),
      修改后: JSON.stringify(log.afterState),
      操作原因: log.reason,
      操作时间: new Date(log.timestamp).toLocaleString('zh-CN'),
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '历史追溯');

    const anomalyIds = historyLogs
      .filter((log) => log.targetType === 'anomaly')
      .map((log) => log.targetId);
    const targetIds = [...new Set(anomalyIds)];

    const snapshot: ExportSnapshot = {
      type: 'report',
      format: 'excel',
      anomalyIds: targetIds,
      processingRecords,
      exportedBy: operator,
      exportedAt: new Date(),
    };
    recordExport(snapshot, `导出全部历史追溯记录（Excel，共${historyLogs.length}条）`);

    XLSX.writeFile(wb, `历史追溯_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportAnomalyDetail = (anomalyId: string) => {
    const anomaly = anomalies.find((a) => a.id === anomalyId);
    if (!anomaly) return;

    const relatedRecords = processingRecords.filter((pr) => pr.anomalyId === anomalyId);
    const relatedLogs = historyLogs.filter((log) => log.targetId === anomalyId);

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;

    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text('异常详情追溯报告', 105, 20, { align: 'center' });

    let yPosition = 35;
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`异常ID: ${anomaly.id}`, 20, yPosition);
    yPosition += 8;
    doc.text(`异常类型: ${getAnomalyTypeLabel(anomaly.type)} | 严重程度: ${getSeverityLabel(anomaly.severity)}`, 20, yPosition);
    yPosition += 8;
    doc.text(`处理状态: ${getStatusLabel(anomaly.status)} | 创建时间: ${new Date(anomaly.createdAt).toLocaleString('zh-CN')}`, 20, yPosition);
    yPosition += 8;
    doc.text(`来源文件: ${anomaly.sourceInfo.sourceFile} | 批次: ${anomaly.sourceInfo.importBatch}`, 20, yPosition);
    yPosition += 12;

    doc.setFontSize(12);
    doc.setTextColor(180, 0, 0);
    doc.text('风险备注:', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const riskLines = doc.splitTextToSize(anomaly.riskNote || '暂无风险备注', 170);
    doc.text(riskLines, 25, yPosition);
    yPosition += riskLines.length * 6 + 10;

    doc.setFontSize(12);
    doc.setTextColor(0, 130, 60);
    doc.text('处理意见:', 20, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setTextColor(60);
    const suggestionLines = doc.splitTextToSize(anomaly.processingSuggestion || '暂无处理意见', 170);
    doc.text(suggestionLines, 25, yPosition);
    yPosition += suggestionLines.length * 6 + 12;

    if (relatedRecords.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(0, 51, 102);
      doc.text(`处理记录 (共${relatedRecords.length}条):`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      relatedRecords.forEach((record) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        const actionLabel = record.action === 'export'
          ? '导出记录'
          : record.action === 'add_risk_note'
          ? '添加风险备注'
          : record.action === 'add_suggestion'
          ? '填写处理意见'
          : record.action === 'change_status'
          ? '修改状态'
          : record.action === 'review'
          ? '复核确认'
          : record.action;
        doc.text(`- ${record.operator}(${record.operatorRole === 'simulation_engineer' ? '仿真工程师' : '运维人员'}) | ${actionLabel}`, 25, yPosition);
        yPosition += 5;
        if (record.beforeValue || record.afterValue) {
          const beforeText = record.beforeValue && record.beforeValue.length > 30 ? record.beforeValue.slice(0, 30) + '...' : (record.beforeValue || '(空)');
          const afterText = record.afterValue && record.afterValue.length > 30 ? record.afterValue.slice(0, 30) + '...' : (record.afterValue || '(空)');
          doc.text(`  ${beforeText}  →  ${afterText}`, 30, yPosition);
          yPosition += 5;
        }
        doc.text(`  时间: ${new Date(record.timestamp).toLocaleString('zh-CN')}`, 30, yPosition);
        yPosition += 7;
      });
      yPosition += 6;
    }

    if (relatedLogs.length > 0) {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(12);
      doc.setTextColor(102, 0, 153);
      doc.text(`完整追溯链 (共${relatedLogs.length}条):`, 20, yPosition);
      yPosition += 10;

      doc.setFontSize(9);
      relatedLogs.forEach((log) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(`- ${log.operator} | ${log.action}`, 25, yPosition);
        yPosition += 5;
        const reasonLines = doc.splitTextToSize(`原因: ${log.reason}`, 165);
        doc.text(reasonLines, 30, yPosition);
        yPosition += reasonLines.length * 5;
        doc.text(`  时间: ${new Date(log.timestamp).toLocaleString('zh-CN')}`, 30, yPosition);
        yPosition += 7;
      });
    }

    const snapshot: ExportSnapshot = {
      type: 'report',
      format: 'pdf',
      anomalyIds: [anomalyId],
      processingRecords: relatedRecords,
      exportedBy: operator,
      exportedAt: new Date(),
    };
    recordExport(snapshot, `导出异常详情追溯报告（${getAnomalyTypeLabel(anomaly.type)}）`);

    doc.save(`异常详情_${anomaly.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return {
    exportAnomalyReport,
    exportProcessingRecords,
    exportHistoryLogs,
    exportAnomalyDetail,
  };
}
