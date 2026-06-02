import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type {
  Instrument,
  Transport,
  CitySchedule,
  TraceRecord,
  Photo,
  ExportConfig,
  ExportBatch,
  ExportItem,
} from '@/store/types';
import { formatDate, formatDateTime, generateId } from './dataMapper';

interface ExportRow {
  乐器ID: string;
  乐器名称: string;
  乐器类型: string;
  序列号: string;
  所属演奏员: string;
  状态: string;
  保险到期日: string;
  运输单号: string;
  承运方: string;
  箱号: string;
  出发城市: string;
  目的城市: string;
  发运时间: string;
  预计到达: string;
  实际到达: string;
  运输状态: string;
  日程ID: string;
  演出城市: string;
  演出场地: string;
  计划到达: string;
  实际到达日程: string;
  日程状态: string;
  演出日期: string;
  冲突数量?: number;
  冲突详情?: string;
  照片数量?: number;
  导出批次号?: string;
  导出时间?: string;
}

const buildExportRow = (
  instrument: Instrument,
  transport?: Transport,
  schedule?: CitySchedule,
  traces?: TraceRecord[],
  photos?: Photo[],
  includeConflicts = false,
  includePhotos = false,
  batchId?: string,
  exportTime?: string
): ExportRow => {
  const conflicts = traces?.filter((t) => t.severity !== 'INFO' && !t.resolved) || [];

  return {
    乐器ID: instrument.id,
    乐器名称: instrument.name,
    乐器类型: instrument.type,
    序列号: instrument.serialNumber,
    所属演奏员: instrument.owner,
    状态: instrument.status,
    保险到期日: formatDate(instrument.insuranceExpiry),
    运输单号: transport?.id || '-',
    承运方: transport?.carrier || '-',
    箱号: transport?.boxNumber || '-',
    出发城市: transport?.fromCity || '-',
    目的城市: transport?.toCity || '-',
    发运时间: formatDate(transport?.departureTime || null),
    预计到达: formatDate(transport?.estimatedArrival || null),
    实际到达: formatDate(transport?.actualArrival || null),
    运输状态: transport?.status || '-',
    日程ID: schedule?.id || '-',
    演出城市: schedule?.city || '-',
    演出场地: schedule?.venue || '-',
    计划到达: formatDate(schedule?.scheduledArrival || null),
    实际到达日程: formatDate(schedule?.actualArrival || null),
    日程状态: schedule?.status || '-',
    演出日期: formatDate(schedule?.concertDate || null),
    ...(includeConflicts && {
      冲突数量: conflicts.length,
      冲突详情: conflicts.map((c) => `[${new Date(c.eventTime).toLocaleDateString()}] ${c.description}`).join('; '),
    }),
    ...(includePhotos && {
      照片数量: photos?.length || 0,
    }),
    导出批次号: batchId || '-',
    导出时间: exportTime ? formatDateTime(exportTime) : '-',
  };
};

export const exportToExcel = (
  instruments: Instrument[],
  transports: Transport[],
  schedules: CitySchedule[],
  traces: TraceRecord[],
  photos: Photo[],
  config: ExportConfig,
  batchId: string,
  exportTime: string
): Blob => {
  const rows: ExportRow[] = instruments.map((inst) => {
    const transport = transports.find((t) => t.id === inst.transportId);
    const schedule = schedules.find((s) => s.id === inst.scheduleId);
    const instTraces = traces.filter((t) => t.instrumentId === inst.id);
    const instPhotos = photos.filter((p) => p.instrumentId === inst.id);
    return buildExportRow(
      inst,
      transport,
      schedule,
      instTraces,
      instPhotos,
      config.includeConflicts,
      config.includePhotos,
      batchId,
      exportTime
    );
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '物流清单');

  if (config.includeConflicts) {
    const traceRows = traces.map((t) => ({
      留痕ID: t.id,
      乐器ID: t.instrumentId,
      来源: t.source,
      事件类型: t.eventType,
      严重程度: t.severity,
      描述: t.description,
      变更前值: t.beforeValue || '-',
      变更后值: t.afterValue || '-',
      操作人: t.operator,
      事件时间: formatDateTime(t.eventTime),
      是否已解决: t.resolved ? '是' : '否',
      解决说明: t.resolution || '-',
    }));
    const traceSheet = XLSX.utils.json_to_sheet(traceRows);
    XLSX.utils.book_append_sheet(workbook, traceSheet, '留痕记录');
  }

  if (config.includePhotos) {
    const photoRows = photos.map((p) => ({
      照片ID: p.id,
      乐器ID: p.instrumentId,
      类型: p.type,
      上传人: p.uploader,
      上传时间: formatDateTime(p.uploadTime),
      数据来源: p.source,
    }));
    const photoSheet = XLSX.utils.json_to_sheet(photoRows);
    XLSX.utils.book_append_sheet(workbook, photoSheet, '照片记录');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const exportToPDF = (
  instruments: Instrument[],
  transports: Transport[],
  schedules: CitySchedule[],
  traces: TraceRecord[],
  config: ExportConfig,
  batchId: string,
  exportTime: string
): Blob => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('乐团巡演物流清单', 140, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`导出批次: ${batchId}`, 10, 25);
  doc.text(`导出时间: ${formatDateTime(exportTime)}`, 10, 32);
  doc.text(`导出人: ${config.filters.status?.join(', ') || '全部'}`, 10, 39);

  let yPosition = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const rowHeight = 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const headers = ['乐器名称', '类型', '演奏员', '状态', '运输状态', '日程状态', '冲突数'];
  const colWidths = [45, 30, 40, 25, 25, 25, 20];

  let xPosition = margin;
  headers.forEach((header, i) => {
    doc.text(header, xPosition + 2, yPosition - 2);
    xPosition += colWidths[i];
  });

  doc.setDrawColor(200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += rowHeight;

  doc.setFont('helvetica', 'normal');
  instruments.forEach((inst, index) => {
    if (yPosition > 180) {
      doc.addPage();
      yPosition = 20;
    }

    const transport = transports.find((t) => t.id === inst.transportId);
    const schedule = schedules.find((s) => s.id === inst.scheduleId);
    const conflicts = traces.filter(
      (t) => t.instrumentId === inst.id && t.severity !== 'INFO' && !t.resolved
    );

    const rowData = [
      inst.name,
      inst.type,
      inst.owner,
      inst.status,
      transport?.status || '-',
      schedule?.status || '-',
      conflicts.length.toString(),
    ];

    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition - rowHeight + 2, pageWidth - 2 * margin, rowHeight - 1, 'F');
    }

    xPosition = margin;
    rowData.forEach((data, i) => {
      doc.text(data.toString().substring(0, colWidths[i] / 2), xPosition + 2, yPosition - 2);
      xPosition += colWidths[i];
    });

    yPosition += rowHeight;
  });

  if (config.includeConflicts && traces.length > 0) {
    doc.addPage();
    yPosition = 20;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('留痕记录详情', 140, yPosition, { align: 'center' });
    yPosition += 15;

    const conflictHeaders = ['时间', '来源', '类型', '严重程度', '描述'];
    const conflictWidths = [35, 25, 25, 25, 100];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    xPosition = margin;
    conflictHeaders.forEach((header, i) => {
      doc.text(header, xPosition + 2, yPosition - 2);
      xPosition += conflictWidths[i];
    });

    doc.setDrawColor(200);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += rowHeight;

    doc.setFont('helvetica', 'normal');
    traces
      .filter((t) => t.severity !== 'INFO')
      .forEach((trace, index) => {
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }

        if (index % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition - rowHeight + 2, pageWidth - 2 * margin, rowHeight - 1, 'F');
        }

        xPosition = margin;
        const rowData = [
          formatDate(trace.eventTime),
          trace.source,
          trace.eventType,
          trace.severity,
          trace.description.substring(0, 50),
        ];

        rowData.forEach((data, i) => {
          doc.text(data.toString(), xPosition + 2, yPosition - 2);
          xPosition += conflictWidths[i];
        });

        yPosition += rowHeight;
      });
  }

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
};

export const downloadExport = (
  blob: Blob,
  fileName: string,
  format: 'EXCEL' | 'PDF'
) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.${format === 'EXCEL' ? 'xlsx' : 'pdf'}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const createExportItems = (
  instruments: Instrument[],
  transports: Transport[],
  schedules: CitySchedule[],
  traces: TraceRecord[],
  batchId: string
): ExportItem[] => {
  return instruments.map((inst) => {
    const transport = transports.find((t) => t.id === inst.transportId);
    const schedule = schedules.find((s) => s.id === inst.scheduleId);
    const instTraces = traces.filter((t) => t.instrumentId === inst.id);

    return {
      id: generateId('EXPORT-ITEM'),
      batchId,
      instrumentId: inst.id,
      transportId: inst.transportId,
      scheduleId: inst.scheduleId,
      snapshot: JSON.stringify({
        instrument: inst,
        transport,
        schedule,
        traces: instTraces,
      }),
    };
  });
};
