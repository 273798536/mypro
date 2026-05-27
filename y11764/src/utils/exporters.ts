import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Portfolio, Asset } from '../types/portfolio';
import type { Constraint } from '../types/constraints';
import type * as THREE from 'three';
import { formatPercent, formatNumber, formatDate } from './formatters';

export function generatePDFReport(
  portfolio: Portfolio,
  assets: Asset[],
  constraints: Constraint[],
  notes?: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('投资组合分析报告', pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${formatDate(new Date())}`, pageWidth / 2, 35, { align: 'center' });
  
  let yPosition = 50;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('一、组合基本信息', 14, yPosition);
  yPosition += 10;
  
  const basicInfoData = [
    ['组合名称', portfolio.name],
    ['来源', portfolio.source],
    ['版本', portfolio.version],
    ['创建时间', formatDate(portfolio.createdAt)],
    ['更新时间', formatDate(portfolio.updatedAt)],
    ['状态', portfolio.status === 'normal' ? '正常' : portfolio.status === 'warning' ? '警告' : '错误']
  ];
  
  autoTable(doc, {
    body: basicInfoData,
    startY: yPosition,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('二、核心指标', 14, yPosition);
  yPosition += 10;
  
  const metricsData = [
    ['预期收益', formatPercent(portfolio.expectedReturn)],
    ['波动率', formatPercent(portfolio.volatility)],
    ['最大回撤', formatPercent(portfolio.maxDrawdown)],
    ['夏普比率', formatNumber(portfolio.sharpeRatio, 3)]
  ];
  
  autoTable(doc, {
    body: metricsData,
    startY: yPosition,
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right' }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('三、资产权重配置', 14, yPosition);
  yPosition += 10;
  
  const weightHeaders = ['资产名称', '代码', '类别', '权重', '预期收益', '波动率'];
  const weightData = Object.entries(portfolio.weights)
    .filter(([_, w]) => w > 0.0001)
    .map(([assetId, weight]) => {
      const asset = assets.find(a => a.id === assetId);
      return [
        asset?.name || assetId,
        asset?.code || '-',
        asset?.category || '-',
        formatPercent(weight),
        asset ? formatPercent(asset.expectedReturn) : '-',
        asset ? formatPercent(asset.volatility) : '-'
      ];
    });
  
  autoTable(doc, {
    head: [weightHeaders],
    body: weightData,
    startY: yPosition,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 95] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }
  
  if (portfolio.riskContributions && Object.keys(portfolio.riskContributions).length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('四、风险贡献分析', 14, yPosition);
    yPosition += 10;
    
    const riskHeaders = ['资产名称', '风险贡献度', '边际贡献'];
    const riskData = Object.entries(portfolio.riskContributions)
      .filter(([_, rc]) => rc > 0.0001)
      .sort((a, b) => b[1] - a[1])
      .map(([assetId, contribution]) => {
        const asset = assets.find(a => a.id === assetId);
        return [
          asset?.name || assetId,
          formatPercent(contribution),
          asset ? formatPercent(asset.volatility) : '-'
        ];
      });
    
    autoTable(doc, {
      head: [riskHeaders],
      body: riskData,
      startY: yPosition,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }
  
  if (portfolio.anomalies.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('五、异常提示', 14, yPosition);
    yPosition += 10;
    
    const anomalyHeaders = ['异常类型', '严重程度', '异常信息'];
    const anomalyData = portfolio.anomalies.map(a => [
      a.type === 'weight_sum' ? '权重异常' : a.type === 'risk_overlap' ? '风险重叠' : '约束未生效',
      a.severity === 'error' ? '错误' : '警告',
      a.message
    ]);
    
    autoTable(doc, {
      head: [anomalyHeaders],
      body: anomalyData,
      startY: yPosition,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68] },
      didParseCell: (data: any) => {
        if (data.cell.raw === '错误') {
          data.cell.styles.fillColor = [239, 68, 68];
          data.cell.styles.textColor = 255;
        } else if (data.cell.raw === '警告') {
          data.cell.styles.fillColor = [245, 158, 11];
          data.cell.styles.textColor = 255;
        }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  if (yPosition > 230) {
    doc.addPage();
    yPosition = 20;
  }
  
  const activeConstraints = constraints.filter(c => c.enabled);
  if (activeConstraints.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('六、约束条件', 14, yPosition);
    yPosition += 10;
    
    const constraintHeaders = ['约束类型', '条件', '是否满足'];
    const constraintData = activeConstraints.map(c => {
      let valueStr = '';
      if (Array.isArray(c.value)) {
        valueStr = `${formatPercent(c.value[0])} ~ ${formatPercent(c.value[1])}`;
      } else {
        valueStr = formatPercent(c.value);
      }
      
      const opMap: Record<string, string> = { gt: '>', lt: '<', eq: '=', between: '在...之间' };
      
      const typeMap: Record<string, string> = {
        weight: '权重',
        return: '收益',
        volatility: '波动',
        drawdown: '回撤',
        correlation: '相关性'
      };
      
      const assetName = c.assetId ? assets.find(a => a.id === c.assetId)?.name || c.assetId : '';
      
      return [
        `${typeMap[c.type]}${assetName ? `(${assetName})` : ''}`,
        `${opMap[c.operator]} ${valueStr}`,
        '待验证'
      ];
    });
    
    autoTable(doc, {
      head: [constraintHeaders],
      body: constraintData,
      startY: yPosition,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 58, 95] }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 15;
  }
  
  if (notes) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('七、备注说明', 14, yPosition);
    yPosition += 10;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const splitNotes = doc.splitTextToSize(notes, pageWidth - 28);
    doc.text(splitNotes, 14, yPosition);
  }
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    '本报告由投资组合有效前沿分析系统自动生成，仅供参考，不构成投资建议。',
    pageWidth / 2,
    280,
    { align: 'center' }
  );
  
  doc.save(`组合分析报告_${portfolio.name}_${Date.now()}.pdf`);
}

export function generateComparisonReport(
  portfolios: Portfolio[],
  assets: Asset[],
  constraints: Constraint[]
): void {
  if (portfolios.length < 2) return;
  
  const doc = new jsPDF('landscape');
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('投资组合对比分析报告', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${formatDate(new Date())}`, pageWidth / 2, 30, { align: 'center' });
  
  let yPosition = 45;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('核心指标对比', 14, yPosition);
  yPosition += 8;
  
  const compareHeaders = ['指标', ...portfolios.map(p => p.name)];
  const compareData = [
    ['预期收益', ...portfolios.map(p => formatPercent(p.expectedReturn))],
    ['波动率', ...portfolios.map(p => formatPercent(p.volatility))],
    ['最大回撤', ...portfolios.map(p => formatPercent(p.maxDrawdown))],
    ['夏普比率', ...portfolios.map(p => formatNumber(p.sharpeRatio, 3))],
    ['状态', ...portfolios.map(p => 
      p.status === 'normal' ? '正常' : p.status === 'warning' ? '警告' : '错误'
    )],
    ['资产数量', ...portfolios.map(p => 
      Object.values(p.weights).filter(w => w > 0.001).length.toString()
    )]
  ];
  
  autoTable(doc, {
    head: [compareHeaders],
    body: compareData,
    startY: yPosition,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 58, 95] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 30 }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 15;
  
  if (yPosition > 180) {
    doc.addPage('landscape');
    yPosition = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('权重配置对比', 14, yPosition);
  yPosition += 8;
  
  const allAssetIds = new Set(portfolios.flatMap(p => Object.keys(p.weights)));
  const weightCompareHeaders = ['资产', ...portfolios.map(p => p.name)];
  const weightCompareData = Array.from(allAssetIds).map(assetId => {
    const asset = assets.find(a => a.id === assetId);
    return [
      asset?.name || assetId,
      ...portfolios.map(p => formatPercent(p.weights[assetId] || 0))
    ];
  });
  
  autoTable(doc, {
    head: [weightCompareHeaders],
    body: weightCompareData,
    startY: yPosition,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 58, 95] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 }
    }
  });
  
  doc.save(`组合对比报告_${Date.now()}.pdf`);
}

export function exportChartAsImage(chartCanvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = chartCanvas.toDataURL('image/png');
  link.click();
}

export function export3DSceneAsImage(renderer: THREE.WebGLRenderer, filename: string): void {
  const dataURL = renderer.domElement.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
}

export function exportToJSON(
  portfolios: Portfolio[],
  assets: Asset[],
  constraints: Constraint[]
): void {
  const data = JSON.stringify({ portfolios, assets, constraints }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `portfolios_${Date.now()}.json`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(
  portfolios: Portfolio[],
  assets: Asset[]
): void {
  const wb = XLSX.utils.book_new();

  const portfolioData = portfolios.map(p => ({
    '组合ID': p.id,
    '组合名称': p.name,
    '来源': p.source,
    '版本': p.version,
    '预期收益(%)': (p.expectedReturn * 100).toFixed(2),
    '波动率(%)': (p.volatility * 100).toFixed(2),
    '最大回撤(%)': (p.maxDrawdown * 100).toFixed(2),
    '夏普比率': p.sharpeRatio.toFixed(3),
    '状态': p.status,
    '创建时间': new Date(p.createdAt).toLocaleString('zh-CN'),
    '更新时间': new Date(p.updatedAt).toLocaleString('zh-CN'),
    ...Object.fromEntries(
      assets.map(a => [
        `${a.name}权重(%)`,
        ((p.weights[a.id] || 0) * 100).toFixed(2)
      ])
    ),
    '异常信息': p.anomalies.map(a => a.message).join('; ')
  }));

  const ws = XLSX.utils.json_to_sheet(portfolioData);
  XLSX.utils.book_append_sheet(wb, ws, '投资组合');

  if (portfolios.some(p => p.anomalies.length > 0)) {
    const anomalyData = portfolios.flatMap(p =>
      p.anomalies.map(a => ({
        '组合ID': p.id,
        '组合名称': p.name,
        '异常类型': a.type,
        '严重程度': a.severity,
        '异常信息': a.message,
        '详细信息': JSON.stringify(a.details)
      }))
    );
    const ws2 = XLSX.utils.json_to_sheet(anomalyData);
    XLSX.utils.book_append_sheet(wb, ws2, '异常信息');
  }

  const assetData = assets.map(a => ({
    '资产ID': a.id,
    '资产名称': a.name,
    '代码': a.code,
    '类别': a.category || '',
    '预期收益(%)': (a.expectedReturn * 100).toFixed(2),
    '波动率(%)': (a.volatility * 100).toFixed(2),
    '最大回撤(%)': (a.maxDrawdown * 100).toFixed(2)
  }));
  const ws3 = XLSX.utils.json_to_sheet(assetData);
  XLSX.utils.book_append_sheet(wb, ws3, '资产信息');

  XLSX.writeFile(wb, `portfolios_${Date.now()}.xlsx`);
}
