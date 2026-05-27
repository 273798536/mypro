import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { CalculationParams, CalculationResult, Report } from '../types';
import { FLOW_REGIME_LABELS } from '../utils/constants';
import { formatPressure, formatNumber } from '../utils/units';

export class ReportService {
  static generateReport(
    params: CalculationParams,
    result: CalculationResult,
    title?: string
  ): Report {
    return {
      id: crypto.randomUUID(),
      calcId: params.id,
      params,
      result,
      exportedAt: Date.now(),
      title: title || `${params.name} - 压降计算报告`,
    };
  }

  static exportToJSON(params: CalculationParams, result?: CalculationResult): string {
    const data = {
      params,
      result: result || null,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(data, null, 2);
  }

  static importFromJSON(json: string): { params: CalculationParams; result?: CalculationResult } {
    try {
      const data = JSON.parse(json);
      if (!data.params) {
        throw new Error('无效的文件格式：缺少计算参数');
      }
      return {
        params: data.params,
        result: data.result,
      };
    } catch (e) {
      throw new Error(`JSON解析失败：${(e as Error).message}`);
    }
  }

  static async exportToPDF(element: HTMLElement, filename: string): Promise<void> {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'l' : 'p',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`${filename}.pdf`);
    } catch (e) {
      throw new Error(`PDF导出失败：${(e as Error).message}`);
    }
  }

  static generateReportText(params: CalculationParams, result: CalculationResult): string {
    const now = new Date().toLocaleString('zh-CN');
    
    return `
流体管路压降计算报告
生成时间：${now}
方案名称：${params.name}
数据来源：${params.source || '手动输入'}
版本：v${params.version}

【输入参数】
──────────────────────────────────────
管径：${params.diameter} ${params.diameterUnit}
流量：${params.flowRate} ${params.flowRateUnit}
管长：${params.pipeLength} ${params.pipeLengthUnit}
绝对粗糙度：${params.roughness} ${params.roughnessUnit}
流体：${params.fluid.name}
流体密度：${params.fluid.density} kg/m³
运动粘度：${params.fluid.viscosity.toExponential(4)} m²/s
阀门/管件数量：${params.valves.reduce((s, v) => s + v.count, 0)} 个 (${params.valves.length} 种)

【计算结果】
──────────────────────────────────────
流速：${formatNumber(result.velocity)} m/s
雷诺数：${formatNumber(result.reynolds, 0)}
流态：${FLOW_REGIME_LABELS[result.flowRegime]}
摩擦系数：${formatNumber(result.frictionFactor, 6)}
沿程损失：${formatNumber(result.headLoss)} m
局部损失：${formatNumber(result.localLoss)} m
总压降：${formatPressure(result.totalPressureDrop)}

【警告信息】
──────────────────────────────────────
${result.warnings.length === 0 ? '无' : result.warnings.map(w => `[${w.severity.toUpperCase()}] ${w.message}\n  建议：${w.suggestion}`).join('\n\n')}

【计算解释】
──────────────────────────────────────
${result.explanation}

【修正历史】
──────────────────────────────────────
${params.editHistory.length === 0 ? '无' : params.editHistory.map((r, i) => 
  `${i + 1}. ${new Date(r.timestamp).toLocaleString('zh-CN')}\n   ${r.field}: ${r.oldValue} → ${r.newValue}${r.reason ? `\n   原因：${r.reason}` : ''}`
).join('\n\n')}

──────────────────────────────────────
本报告由流体管路压降计算工具生成
`.trim();
  }

  static downloadTextReport(params: CalculationParams, result: CalculationResult): void {
    const text = this.generateReportText(params, result);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.name}_压降计算报告.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
