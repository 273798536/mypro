import { Injectable, BadRequestException } from '@nestjs/common';
import * as Papa from 'papaparse';
import {
  ExportTemplateType,
  ExportTemplateDto,
  ExportRequestDto,
  ExportHistoryDto,
  ExportResponseDto,
  ExportStatus,
  ExportFilterDto,
} from './export.dto';
import { TrackDto } from '../track/track.dto';
import { MaterialResponseDto } from '../material/material.dto';
import { NoteDto } from '../note/note.dto';

interface ExportRow {
  [key: string]: string | number | boolean | null | undefined;
}

@Injectable()
export class ExportService {
  private templates: ExportTemplateDto[] = [
    {
      id: 'scene_communication',
      name: '现场沟通版',
      description: '简化版导出，包含曲目基本信息、时码偏差和最新备注，供现场沟通使用',
      useCase: '现场彩排沟通、快速核对',
      columns: [
        'trackNo',
        'title',
        'artist',
        'expectedTimecode',
        'timecodeDeviation',
        'status',
        'latestNote',
      ],
    },
    {
      id: 'operation_verification',
      name: '运营核对版',
      description: '包含曲目信息、材料匹配状态、版本信息，供运营人员核对使用',
      useCase: '运营核对、版本确认、材料管理',
      columns: [
        'trackNo',
        'title',
        'artist',
        'expectedDuration',
        'expectedTimecode',
        'status',
        'currentVersion',
        'matchedFileName',
        'matchStatus',
        'matchConfidence',
        'timecodeDeviation',
        'submittedBy',
        'sourceBatch',
      ],
    },
    {
      id: 'complete_detail',
      name: '完整明细版',
      description: '包含所有曲目、材料、备注的完整信息，用于存档和详细审计',
      useCase: '完整存档、详细审计、数据分析',
      columns: [
        'trackNo',
        'title',
        'artist',
        'expectedDuration',
        'expectedTimecode',
        'status',
        'currentVersion',
        'matchedFileName',
        'matchStatus',
        'matchConfidence',
        'timecodeDeviation',
        'materialDuration',
        'materialTimecode',
        'version',
        'submittedBy',
        'submittedAt',
        'sourceBatch',
        'latestNote',
        'noteCreatedBy',
        'noteCreatedAt',
        'noteChain',
      ],
    },
    {
      id: 'timecode_special',
      name: '时码专项版',
      description: '专注于时码相关信息的导出，包含预期时码、实际时码、偏差等详细信息',
      useCase: '时码专项核对、音频技术分析、乐队同步',
      columns: [
        'trackNo',
        'title',
        'artist',
        'expectedDuration',
        'expectedTimecode',
        'materialDuration',
        'materialTimecode',
        'timecodeDeviation',
        'deviationStatus',
        'status',
        'version',
        'latestNote',
      ],
    },
  ];

  private exportHistory: ExportHistoryDto[] = [
    {
      id: 'export-1',
      templateId: 'complete_detail',
      templateName: '完整明细版',
      showId: '1',
      trackCount: 20,
      exportedBy: 'operator-001',
      exportedByName: '小孟',
      status: 'completed',
      fileName: '完整明细_20260615.csv',
      fileSize: 15600,
      createdAt: new Date('2026-06-15T14:30:00'),
      completedAt: new Date('2026-06-15T14:30:05'),
    },
    {
      id: 'export-2',
      templateId: 'scene_communication',
      templateName: '现场沟通版',
      showId: '1',
      trackCount: 5,
      exportedBy: 'teacher-001',
      exportedByName: '张老师',
      status: 'completed',
      fileName: '现场沟通_待确认曲目.csv',
      fileSize: 3200,
      createdAt: new Date('2026-06-14T10:00:00'),
      completedAt: new Date('2026-06-14T10:00:02'),
    },
  ];

  private fieldMap: Record<string, (track: TrackDto, material?: MaterialResponseDto, notes?: NoteDto[]) => string | number | null> = {
    trackNo: (track) => track.trackNo,
    title: (track) => track.title,
    artist: (track) => track.artist,
    expectedDuration: (track) => track.expectedDuration,
    expectedTimecode: (track) => track.expectedTimecode || '',
    timecodeDeviation: (track, material) => material?.timecodeDeviation ?? track.timecodeDeviation ?? null,
    status: (track) => this.getStatusText(track.status),
    currentVersion: (track) => track.currentVersion,
    latestNote: (track) => track.latestNote || '',
    matchedFileName: (_, material) => material?.fileName || '',
    matchStatus: (_, material) => this.getMatchStatusText(material?.matchStatus || ''),
    matchConfidence: (_, material) => material?.matchConfidence ?? null,
    materialDuration: (_, material) => material?.duration ?? null,
    materialTimecode: (_, material) => material?.timecode || '',
    version: (_, material) => material?.version ?? null,
    submittedBy: (_, material) => material?.submittedBy || '',
    submittedAt: (_, material) => material?.submittedAt ? material.submittedAt.toISOString() : '',
    sourceBatch: (_, material) => material?.sourceBatch || '',
    noteCreatedBy: (_, __, notes) => notes?.find(n => n.isActive)?.createdByName || '',
    noteCreatedAt: (_, __, notes) => notes?.find(n => n.isActive)?.createdAt?.toISOString() || '',
    noteChain: (_, __, notes) => {
      if (!notes || notes.length === 0) return '';
      return notes.map(n => `[${n.createdByName}] ${n.content}`).join('; ');
    },
    deviationStatus: (track, material) => {
      const deviation = material?.timecodeDeviation ?? track.timecodeDeviation;
      if (deviation === null || deviation === undefined) return '';
      const absDeviation = Math.abs(deviation);
      if (absDeviation <= 100) return '正常';
      if (absDeviation <= 500) return '轻微偏差';
      return '严重偏差';
    },
  };

  async getTemplates(): Promise<{ code: number; message: string; data: ExportTemplateDto[] }> {
    return {
      code: 0,
      message: 'success',
      data: this.templates,
    };
  }

  async export(
    exportRequest: ExportRequestDto,
    tracks: TrackDto[],
    materials: MaterialResponseDto[],
    notes: NoteDto[],
  ): Promise<ExportResponseDto> {
    const template = this.templates.find((t) => t.id === exportRequest.templateId);
    if (!template) {
      throw new BadRequestException(`导出模板 ${exportRequest.templateId} 不存在`);
    }

    const exportId = `export-${this.exportHistory.length + 1}`;

    const historyRecord: ExportHistoryDto = {
      id: exportId,
      templateId: exportRequest.templateId,
      templateName: template.name,
      showId: exportRequest.showId,
      trackCount: tracks.length,
      exportedBy: exportRequest.exportedBy,
      exportedByName: exportRequest.exportedByName,
      status: 'processing',
      createdAt: new Date(),
    };
    this.exportHistory.push(historyRecord);

    try {
      const filteredTracks = this.filterTracks(tracks, exportRequest);

      const rows: ExportRow[] = filteredTracks.map((track) => {
        const trackMaterial = materials.find((m) => m.trackId === track.id && m.isActive);
        const trackNotes = notes.filter((n) => n.trackId === track.id);

        const row: ExportRow = {};
        template.columns.forEach((column) => {
          const mapper = this.fieldMap[column];
          if (mapper) {
            row[column] = mapper(track, trackMaterial, trackNotes);
          }
        });
        return row;
      });

      const csv = Papa.unparse(rows, {
        header: true,
        columns: template.columns,
      });

      const fileName = `${template.name}_${new Date().toISOString().split('T')[0]}.csv`;

      historyRecord.status = 'completed';
      historyRecord.fileName = fileName;
      historyRecord.fileSize = csv.length;
      historyRecord.completedAt = new Date();

      return {
        id: exportId,
        templateId: exportRequest.templateId,
        templateName: template.name,
        status: 'completed',
        fileName,
        downloadUrl: `/api/export/${exportId}/download`,
        createdAt: historyRecord.createdAt,
      };
    } catch (error) {
      historyRecord.status = 'failed';
      historyRecord.errorMessage = error instanceof Error ? error.message : '未知错误';
      throw error;
    }
  }

  async getHistory(filter: ExportFilterDto): Promise<{ data: ExportHistoryDto[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, status, startDate, endDate } = filter;

    let filteredHistory = [...this.exportHistory];

    if (status) {
      filteredHistory = filteredHistory.filter((h) => h.status === status);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredHistory = filteredHistory.filter((h) => h.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredHistory = filteredHistory.filter((h) => h.createdAt <= end);
    }

    filteredHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedHistory = filteredHistory.slice(startIndex, endIndex);

    return {
      data: paginatedHistory,
      total: filteredHistory.length,
      page,
      limit,
    };
  }

  async generateCsv(
    templateId: ExportTemplateType,
    tracks: TrackDto[],
    materials: MaterialResponseDto[],
    notes: NoteDto[],
  ): Promise<string> {
    const template = this.templates.find((t) => t.id === templateId);
    if (!template) {
      throw new BadRequestException(`导出模板 ${templateId} 不存在`);
    }

    const rows: ExportRow[] = tracks.map((track) => {
      const trackMaterial = materials.find((m) => m.trackId === track.id && m.isActive);
      const trackNotes = notes.filter((n) => n.trackId === track.id);

      const row: ExportRow = {};
      template.columns.forEach((column) => {
        const mapper = this.fieldMap[column];
        if (mapper) {
          row[column] = mapper(track, trackMaterial, trackNotes);
        }
      });
      return row;
    });

    return Papa.unparse(rows, {
      header: true,
      columns: template.columns,
    });
  }

  private filterTracks(tracks: TrackDto[], request: ExportRequestDto): TrackDto[] {
    let filtered = [...tracks];

    if (request.showId) {
      filtered = filtered.filter((t) => t.showId === request.showId);
    }

    if (request.trackIds && request.trackIds.length > 0) {
      filtered = filtered.filter((t) => request.trackIds!.includes(t.id));
    }

    if (request.statuses && request.statuses.length > 0) {
      filtered = filtered.filter((t) => request.statuses!.includes(t.status));
    }

    if (request.keyword) {
      const lowerKeyword = request.keyword.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(lowerKeyword) ||
          t.artist.toLowerCase().includes(lowerKeyword) ||
          String(t.trackNo).includes(lowerKeyword),
      );
    }

    filtered.sort((a, b) => a.trackNo - b.trackNo);

    return filtered;
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      matching: '匹配中',
      matched: '已匹配',
      mismatch: '不匹配',
      reviewing: '复核中',
      suspended: '挂起',
      approved: '已通过',
      rejected: '已拒绝',
    };
    return statusMap[status] || status;
  }

  private getMatchStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      auto: '自动匹配',
      manual: '手动匹配',
      mismatch: '不匹配',
    };
    return statusMap[status] || status;
  }
}
