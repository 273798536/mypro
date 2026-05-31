import MatchRepository from '../repositories/matchRepository';
import ReviewRepository from '../repositories/reviewRepository';
import ConflictRepository from '../repositories/conflictRepository';
import AuditService from './auditService';
import type { MatchResult, RISK_LEVEL_LABELS, MATCH_STATUS_LABELS } from '../../shared/types';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

export class ExportService {
  private matchRepo = new MatchRepository();
  private reviewRepo = new ReviewRepository();
  private conflictRepo = new ConflictRepository();
  private auditService = new AuditService();

  private currentUser = 'admin';

  async exportExcel(): Promise<Buffer> {
    const matches = this.matchRepo.findAll({ pageSize: 1000 }).data;
    
    const exportData = matches.map(match => {
      const review = this.reviewRepo.findByMatchResultId(match.id);
      const conflict = this.conflictRepo.findByMatchResultId(match.id);
      
      return {
        '歌曲名称': match.song?.name || '',
        '歌手': match.song?.artist || '',
        '时长(秒)': match.song?.duration || '',
        '匹配状态': this.getMatchStatusLabel(match.matchStatus),
        '匹配度': (match.matchConfidence * 100).toFixed(0) + '%',
        '风险等级': this.getRiskLevelLabel(match.riskLevel),
        '风险原因': match.riskReasons?.join('；') || '',
        '版权歌曲': match.copyright?.songName || '',
        '版权歌手': match.copyright?.artist || '',
        '授权类型': this.getLicenseTypeLabel(match.copyright?.licenseType),
        '授权地区': match.copyright?.authorizedRegions?.join(', ') || '',
        '有效期': match.copyright ? `${match.copyright.validFrom} 至 ${match.copyright.validTo}` : '',
        '是否翻唱': match.isCoverDetected ? '是' : '否',
        '原唱': match.copyright?.originalArtist || '',
        '审核状态': review ? this.getReviewStatusLabel(review.status) : '待审核',
        '审核意见': review?.comments || '',
        '冲突状态': conflict ? this.getConflictStatusLabel(conflict.status) : '无冲突',
        '创建时间': match.createdAt,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '版权过滤清单');

    const cols = [
      { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 8 },
      { wch: 10 }, { wch: 40 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 20 }, { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
      { wch: 30 }, { wch: 10 }, { wch: 20 },
    ];
    worksheet['!cols'] = cols;

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    this.auditService.log('export_excel', 'export', 'list', this.currentUser, `导出Excel清单，共 ${exportData.length} 条记录`);
    
    return buffer as Buffer;
  }

  async exportPDF(): Promise<Buffer> {
    const matches = this.matchRepo.findAll({ pageSize: 1000 }).data;
    const stats = this.matchRepo.getStats();
    const now = new Date().toLocaleString('zh-CN');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('直播点歌版权过滤报告', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`生成时间：${now}`, 14, 32);
    doc.text(`生成人：${this.currentUser}`, 14, 38);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('一、风险分级口径说明', 14, 50);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const riskGuide = [
      '【高风险】无匹配版权记录、授权已过期、匹配度<60%',
      '【中风险】歌手不匹配、匹配置信度60%-70%、授权地区受限',
      '【低风险】翻唱版本、非独家授权、部分字段不匹配但置信度>70%',
      '【无风险】完全匹配、独家授权、有效期内、无地区限制',
    ];
    riskGuide.forEach((text, i) => {
      doc.text(text, 18, 58 + i * 6);
    });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('二、统计概览', 14, 90);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`总歌曲数：${stats.total}`, 18, 98);
    doc.text(`高风险：${stats.byRiskLevel['high'] || 0}`, 18, 104);
    doc.text(`中风险：${stats.byRiskLevel['medium'] || 0}`, 18, 110);
    doc.text(`低风险：${stats.byRiskLevel['low'] || 0}`, 18, 116);
    doc.text(`无风险：${stats.byRiskLevel['none'] || 0}`, 18, 122);

    let yPosition = 135;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('三、详细清单', 14, yPosition);
    yPosition += 8;

    const headers = ['序号', '歌曲', '歌手', '风险等级', '状态', '备注'];
    const colWidths = [12, 40, 25, 22, 22, 49];
    let x = 14;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, i) => {
      doc.text(header, x, yPosition);
      x += colWidths[i];
    });
    yPosition += 6;

    doc.setFont('helvetica', 'normal');
    
    matches.forEach((match, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        let x2 = 14;
        headers.forEach((header, i) => {
          doc.text(header, x2, yPosition);
          x2 += colWidths[i];
        });
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
      }

      const riskLabel = this.getRiskLevelLabel(match.riskLevel);
      const statusLabel = this.getMatchStatusLabel(match.matchStatus);
      const remarks = match.riskReasons?.[0] || '';

      x = 14;
      doc.text(String(index + 1), x, yPosition);
      x += colWidths[0];
      
      const songName = match.song?.name || '';
      doc.text(songName.length > 18 ? songName.substring(0, 18) + '...' : songName, x, yPosition);
      x += colWidths[1];
      
      const artist = match.song?.artist || '';
      doc.text(artist.length > 10 ? artist.substring(0, 10) + '...' : artist, x, yPosition);
      x += colWidths[2];
      
      doc.text(riskLabel, x, yPosition);
      x += colWidths[3];
      
      doc.text(statusLabel, x, yPosition);
      x += colWidths[4];
      
      doc.text(remarks.length > 22 ? remarks.substring(0, 22) + '...' : remarks, x, yPosition);
      
      yPosition += 6;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`第 ${i} 页 / 共 ${pageCount} 页`, 105, 290, { align: 'center' });
    }

    const buffer = Buffer.from(doc.output('arraybuffer'));
    
    this.auditService.log('export_pdf', 'export', 'report', this.currentUser, `导出PDF报告，共 ${matches.length} 条记录`);
    
    return buffer;
  }

  private getRiskLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
      none: '无风险',
    };
    return labels[level] || level;
  }

  private getMatchStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      full: '完全匹配',
      partial: '部分匹配',
      none: '无匹配',
      conflict: '冲突待处理',
    };
    return labels[status] || status;
  }

  private getLicenseTypeLabel(type?: string): string {
    if (!type) return '';
    const labels: Record<string, string> = {
      exclusive: '独家授权',
      'non-exclusive': '非独家授权',
      cover: '翻唱授权',
    };
    return labels[type] || type;
  }

  private getReviewStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      approved: '已通过',
      rejected: '已驳回',
      pending: '待审核',
    };
    return labels[status] || status;
  }

  private getConflictStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: '待处理',
      resolved_playlist: '按点歌单',
      resolved_copyright: '按曲库',
      resolved_custom: '自定义',
    };
    return labels[status] || status;
  }
}

export default ExportService;
