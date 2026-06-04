import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Report, Selection } from '@/types';

export class ExportService {
  static async exportToPDF(reportElement: HTMLElement, filename: string): Promise<void> {
    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  }

  static exportToCSV(report: Report, filename: string): void {
    try {
      const headers = ['序号', '圈选ID', '检测结果', '颜色越界', '边界碰撞', '点数'];
      const rows = report.selections.map((selection, index) => [
        index + 1,
        selection.id,
        this.getResultText(selection.detectionResult),
        selection.isOutOfBounds ? '是' : '否',
        selection.isColliding ? '是' : '否',
        selection.points.length
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('CSV export failed:', error);
      throw error;
    }
  }

  static exportSelectionsToJSON(selections: Selection[], filename: string): void {
    try {
      const data = JSON.stringify(selections, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('JSON export failed:', error);
      throw error;
    }
  }

  static copyTextToClipboard(text: string): Promise<boolean> {
    return navigator.clipboard.writeText(text)
      .then(() => true)
      .catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          return successful;
        } catch {
          document.body.removeChild(textArea);
          return false;
        }
      });
  }

  private static getResultText(result: string): string {
    const map: Record<string, string> = {
      'pass': '通过',
      'warning': '待确认',
      'fail': '不通过'
    };
    return map[result] || result;
  }
}
