import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import { Batch, AudioFile, AnalysisResult, ProblemRecord, FilterParams, FFTSpectrum, ExportFormat, ExportContent, ExportLog, PROBLEM_TYPE_LABELS, FILTER_TYPE_LABELS, SEVERITY_LABELS } from '../types';

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatFrequency(freq: number): string {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)} kHz`;
  }
  return `${freq.toFixed(0)} Hz`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function exportToJSON(
  batch: Batch,
  audioFiles: AudioFile[],
  analysisResult: AnalysisResult | null,
  filterParams: FilterParams | null,
  problems: ProblemRecord[],
  spectrumBefore: FFTSpectrum | null,
  spectrumAfter: FFTSpectrum | null
): Blob {
  const exportData = {
    batchId: batch.batchId,
    exportedAt: Date.now(),
    batch: {
      name: batch.name,
      sourceNote: batch.sourceNote,
      listenerNote: batch.listenerNote,
      createdAt: batch.createdAt,
      status: batch.status,
    },
    audioFiles: audioFiles.map(f => ({
      fileId: f.fileId,
      name: f.name,
      type: f.type,
      sampleRate: f.sampleRate,
      bitDepth: f.bitDepth,
      duration: f.duration,
      numberOfChannels: f.numberOfChannels,
    })),
    filterParams: filterParams ? {
      filterType: filterParams.filterType,
      filterTypeLabel: FILTER_TYPE_LABELS[filterParams.filterType],
      lowFreq: filterParams.lowFreq,
      highFreq: filterParams.highFreq,
      gain: filterParams.gain,
      order: filterParams.order,
    } : null,
    problems: problems.map(p => ({
      type: p.type,
      typeLabel: PROBLEM_TYPE_LABELS[p.type],
      severity: p.severity,
      description: p.description,
      reproduceMethod: p.reproduceMethod,
      detectedAt: p.detectedAt,
      frequency: p.frequency,
      magnitude: p.magnitude,
    })),
    spectrumData: spectrumBefore ? {
      fftSize: spectrumBefore.fftSize,
      windowType: spectrumBefore.windowType,
      sampleRate: spectrumBefore.sampleRate,
      binFrequencies: Array.from(spectrumBefore.binFrequencies),
      magnitudeBefore: Array.from(spectrumBefore.frequencyData),
      magnitudeAfter: spectrumAfter ? Array.from(spectrumAfter.frequencyData) : null,
    } : null,
  };

  return new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
}

export function exportToPDF(
  batch: Batch,
  audioFiles: AudioFile[],
  analysisResult: AnalysisResult | null,
  filterParams: FilterParams | null,
  problems: ProblemRecord[],
  spectrumCanvas?: HTMLCanvasElement,
  waveformCanvas?: HTMLCanvasElement,
  config?: { includeProblems?: boolean; includeParameters?: boolean }
): Blob {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let y = margin;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  doc.setFillColor(6, 182, 212);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('傅里叶噪声拆解分析报告', margin, y + 10);

  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(`生成时间: ${formatDate(Date.now())}`, margin, y + 17);
  doc.text(`批次ID: ${batch.batchId}`, margin, y + 22);

  y += 30;

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(batch.name, margin + 5, y + 8);

  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`来源备注: ${batch.sourceNote || '无'}`, margin + 5, y + 14);
  doc.text(`听感备注: ${batch.listenerNote || '无'}`, margin + 5, y + 19);

  y += 32;

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text('一、音频文件信息', margin, y);

  y += 8;
  const originalFile = audioFiles.find(f => f.type === 'original');
  const processedFile = audioFiles.find(f => f.type === 'processed');

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, y, (pageWidth - 2 * margin - 5) / 2, 30, 2, 2, 'F');
  doc.roundedRect(margin + (pageWidth - 2 * margin - 5) / 2 + 5, y, (pageWidth - 2 * margin - 5) / 2, 30, 2, 2, 'F');

  doc.setTextColor(6, 182, 212);
  doc.setFontSize(10);
  doc.text('原始材料', margin + 5, y + 7);
  doc.text('处理结果', margin + (pageWidth - 2 * margin - 5) / 2 + 10, y + 7);

  doc.setTextColor(226, 232, 240);
  doc.setFontSize(8);
  if (originalFile) {
    doc.text(`文件名: ${originalFile.name}`, margin + 5, y + 14);
    doc.text(`采样率: ${originalFile.sampleRate} Hz`, margin + 5, y + 19);
    doc.text(`时长: ${formatDuration(originalFile.duration)}`, margin + 5, y + 24);
  }
  if (processedFile) {
    doc.text(`文件名: ${processedFile.name}`, margin + (pageWidth - 2 * margin - 5) / 2 + 10, y + 14);
    doc.text(`采样率: ${processedFile.sampleRate} Hz`, margin + (pageWidth - 2 * margin - 5) / 2 + 10, y + 19);
    doc.text(`时长: ${formatDuration(processedFile.duration)}`, margin + (pageWidth - 2 * margin - 5) / 2 + 10, y + 24);
  }

  y += 38;

  if (filterParams) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('二、滤波参数', margin, y);
    y += 8;

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 2, 2, 'F');

    doc.setTextColor(226, 232, 240);
    doc.setFontSize(9);
    doc.text(`滤波类型: ${FILTER_TYPE_LABELS[filterParams.filterType]}`, margin + 5, y + 7);
    doc.text(`低频截止: ${formatFrequency(filterParams.lowFreq)}`, margin + 60, y + 7);
    doc.text(`高频截止: ${formatFrequency(filterParams.highFreq)}`, margin + 120, y + 7);
    doc.text(`增益: ${filterParams.gain} dB`, margin + 5, y + 14);
    doc.text(`滤波器阶数: ${filterParams.order}`, margin + 60, y + 14);

    y += 33;
  }

  if (problems.length > 0) {
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('三、检测到的问题', margin, y);
    y += 8;

    problems.forEach((problem, index) => {
      if (y > pageHeight - 40) {
        doc.addPage();
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        y = margin;
      }

      let fillColor: [number, number, number] = [56, 189, 248];
      if (problem.severity === 'warning') fillColor = [245, 158, 11];
      if (problem.severity === 'error') fillColor = [239, 68, 68];
      if (problem.severity === 'critical') fillColor = [220, 38, 38];

      doc.setFillColor(...fillColor);
      doc.roundedRect(margin, y, 3, 28, 1, 1, 'F');

      doc.setFillColor(30, 41, 59);
      doc.roundedRect(margin + 5, y, pageWidth - 2 * margin - 5, 28, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${PROBLEM_TYPE_LABELS[problem.type]}`, margin + 10, y + 7);

      doc.setTextColor(226, 232, 240);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      const splitDescription = doc.splitTextToSize(problem.description, pageWidth - 2 * margin - 15);
      doc.text(splitDescription, margin + 10, y + 13);

      y += 32;
    });

    y += 5;
  }

  if (spectrumCanvas || waveformCanvas) {
    if (y > pageHeight - 80) {
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = margin;
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('四、频谱分析图', margin, y);
    y += 8;

    if (spectrumCanvas) {
      const imgData = spectrumCanvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = 60;
      doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      y += imgHeight + 5;
    }

    if (waveformCanvas) {
      const imgData = waveformCanvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = 40;
      doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
    }
  }

  doc.setFillColor(6, 182, 212);
  doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');

  return new Blob([doc.output('blob')], { type: 'application/pdf' });
}

export function exportToWAV(
  channelData: Float32Array[],
  sampleRate: number,
  bitDepth: number = 16
): Blob {
  const numberOfChannels = channelData.length;
  const length = channelData[0].length;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;

  const buffer = new ArrayBuffer(bufferSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numberOfChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]));
      if (bitDepth === 16) {
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      } else if (bitDepth === 24) {
        const intSample = Math.round(sample * 0x7FFFFF);
        view.setInt8(offset, intSample & 0xFF);
        view.setInt8(offset + 1, (intSample >> 8) & 0xFF);
        view.setInt8(offset + 2, (intSample >> 16) & 0xFF);
        offset += 3;
      } else if (bitDepth === 32) {
        view.setInt32(offset, sample * 0x7FFFFFFF, true);
        offset += 4;
      }
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export function downloadFile(
  blob: Blob,
  fileName: string
): ExportLog {
  saveAs(blob, fileName);
  
  const ext = fileName.split('.').pop() || '';
  const formatMap: Record<string, 'pdf' | 'json' | 'wav'> = {
    pdf: 'pdf',
    json: 'json',
    wav: 'wav',
  };

  return {
    exportId: generateId(),
    batchId: '',
    format: formatMap[ext] || 'json',
    content: 'report',
    exportedAt: Date.now(),
    fileName,
  };
}

export function generateFileName(
  batchName: string,
  format: ExportFormat,
  timestamp: number = Date.now()
): string {
  const safeName = batchName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
  const dateStr = new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, '');
  return `${safeName}_${dateStr}.${format}`;
}

export function exportToWAVDiff(
  originalFile: AudioFile,
  processedFile: AudioFile,
  bitDepth: number = 16
): Blob {
  const originalData = originalFile.channelData[0];
  const processedData = processedFile.channelData[0];
  const length = Math.min(originalData.length, processedData.length);
  
  const diffData = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    diffData[i] = originalData[i] - processedData[i];
  }
  
  return exportToWAV([diffData], originalFile.sampleRate, bitDepth);
}
