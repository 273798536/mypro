import { Router, Request, Response } from 'express';
import * as XLSX from 'xlsx';
import { warningsData } from '../data/mockData';
import type { Warning } from '../../shared/types';

const router = Router();

const typeLabels: Record<string, string> = {
  quality_downgrade: '质检降级',
  duplicate_receipt: '重复仓单',
  price_gap: '价格缺口',
  normal: '正常'
};

const levelLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

const statusLabels: Record<string, string> = {
  pending: '待复核',
  reviewing: '复核中',
  confirmed: '确认风险',
  dismissed: '排除风险',
  pending_info: '待补充材料'
};

router.get('/warnings', (req: Request, res: Response) => {
  const exportData = warningsData.map((w: Warning) => ({
    '预警编号': w.id,
    '预警类型': typeLabels[w.type] || w.type,
    '预警等级': levelLabels[w.level] || w.level,
    '状态': statusLabels[w.status] || w.status,
    '仓单编号': w.receiptNo,
    '客户名称': w.customerName,
    '货物名称': w.goodsName,
    '预警描述': w.description,
    '风险金额(万元)': (w.riskAmount / 10000).toFixed(2),
    '预警时间': new Date(w.warningTime).toLocaleString('zh-CN'),
    '仓库': w.receipt.warehouse,
    '质押合同数': w.contracts.length,
    '质检报告数': w.inspections.length,
    '复核次数': w.reviews.length
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  ws['!cols'] = [
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
    { wch: 18 },
    { wch: 25 },
    { wch: 12 },
    { wch: 50 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, '预警列表');

  if (warningsData.length > 0) {
    const detailData: any[] = [];
    warningsData.forEach((w: Warning) => {
      w.contracts.forEach((c, idx) => {
        detailData.push({
          '预警编号': w.id,
          '仓单编号': w.receiptNo,
          '合同编号': c.contractNo,
          '客户名称': c.customerName,
          '质押数量(吨)': c.pledgedQuantity,
          '约定等级': c.agreedGrade,
          '质押率': (c.pledgeRate * 100).toFixed(0) + '%',
          '原始单价(元)': c.originalUnitPrice,
          '当前单价(元)': c.currentUnitPrice,
          '质押金额(万元)': (c.pledgedAmount / 10000).toFixed(2),
          '剩余本金(万元)': (c.remainingPrincipal / 10000).toFixed(2),
          '合同起始日': c.startDate,
          '合同到期日': c.endDate
        });
      });
    });
    
    const wsDetail = XLSX.utils.json_to_sheet(detailData);
    wsDetail['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 25 },
      { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 },
      { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, '合同明细');
  }

  if (warningsData.length > 0) {
    const inspectionData: any[] = [];
    warningsData.forEach((w: Warning) => {
      w.inspections.forEach((i) => {
        inspectionData.push({
          '预警编号': w.id,
          '仓单编号': i.receiptNo,
          '质检日期': i.inspectionDate,
          '质检员': i.inspector,
          '质量等级': i.qualityGrade,
          '质量评分': i.qualityScore,
          '水分(%)': i.moistureContent,
          '杂质(%)': i.impurityContent,
          '是否降级': i.isDowngraded ? '是' : '否',
          '备注': i.remarks
        });
      });
    });
    
    const wsInspect = XLSX.utils.json_to_sheet(inspectionData);
    wsInspect['!cols'] = [
      { wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
      { wch: 10 }, { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInspect, '质检明细');
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const fileName = `仓单质押价格预警_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.send(buffer);
});

export default router;
