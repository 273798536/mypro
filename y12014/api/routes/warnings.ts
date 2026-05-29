import { Router, Request, Response } from 'express';
import { warningsData, warehouseReceipts, inspectionReports, pledgeContracts, gradeValues } from '../data/mockData';
import type { Warning, WarningFilter, WarningStatus, TraceNode, ReviewRecord } from '../../shared/types';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  const {
    type,
    level,
    status,
    receiptNo,
    customerName,
    startDate,
    endDate,
    page = '1',
    pageSize = '10'
  } = req.query as WarningFilter;

  let filtered = [...warningsData];

  if (type) {
    filtered = filtered.filter(w => w.type === type);
  }
  if (level) {
    filtered = filtered.filter(w => w.level === level);
  }
  if (status) {
    filtered = filtered.filter(w => w.status === status);
  }
  if (receiptNo) {
    filtered = filtered.filter(w => w.receiptNo.includes(receiptNo));
  }
  if (customerName) {
    filtered = filtered.filter(w => w.customerName.includes(customerName));
  }
  if (startDate) {
    filtered = filtered.filter(w => w.warningTime >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(w => w.warningTime <= endDate + 'T23:59:59');
  }

  const pageNum = parseInt(page as string);
  const size = parseInt(pageSize as string);
  const total = filtered.length;
  const start = (pageNum - 1) * size;
  const items = filtered.slice(start, start + size);

  res.json({
    code: 0,
    message: 'success',
    data: {
      items,
      total,
      page: pageNum,
      pageSize: size
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const warning = warningsData.find(w => w.id === req.params.id);
  if (!warning) {
    return res.status(404).json({
      code: 404,
      message: '预警记录不存在',
      data: null,
      timestamp: new Date().toISOString()
    });
  }
  res.json({
    code: 0,
    message: 'success',
    data: warning,
    timestamp: new Date().toISOString()
  });
});

router.get('/:id/trace', (req: Request, res: Response) => {
  const warning = warningsData.find(w => w.id === req.params.id);
  if (!warning) {
    return res.status(404).json({
      code: 404,
      message: '预警记录不存在',
      data: null,
      timestamp: new Date().toISOString()
    });
  }

  const traceNodes: TraceNode[] = [];
  const contract = warning.contracts[0];
  const latestInspection = warning.inspections[warning.inspections.length - 1];

  traceNodes.push({
    id: 'trace-1',
    type: 'warning',
    title: '预警触发',
    description: warning.description,
    time: warning.warningTime,
    data: {
      type: warning.type,
      level: warning.level,
      riskAmount: warning.riskAmount
    }
  });

  if (warning.type === 'quality_downgrade' && contract && latestInspection) {
    const originalValue = contract.originalUnitPrice * contract.pledgedQuantity * contract.pledgeRate;
    const currentValue = contract.currentUnitPrice * contract.pledgedQuantity * contract.pledgeRate;

    traceNodes.push({
      id: 'trace-2',
      type: 'valuation',
      title: '押品估值变化',
      description: `因质检降级，押品估值从${(originalValue / 10000).toFixed(0)}万元下调至${(currentValue / 10000).toFixed(0)}万元`,
      time: latestInspection.inspectionDate + 'T14:00:00',
      data: {
        originalGrade: latestInspection.previousGrade,
        currentGrade: latestInspection.qualityGrade,
        originalUnitPrice: contract.originalUnitPrice,
        currentUnitPrice: contract.currentUnitPrice
      },
      previousValue: originalValue,
      currentValue: currentValue
    });

    traceNodes.push({
      id: 'trace-3',
      type: 'limit',
      title: '额度重算',
      description: `当前剩余本金${(contract.remainingPrincipal / 10000).toFixed(0)}万元，估值${(currentValue / 10000).toFixed(0)}万元，存在${((contract.remainingPrincipal - currentValue) / 10000).toFixed(0)}万元风险敞口`,
      time: warning.warningTime,
      data: {
        remainingPrincipal: contract.remainingPrincipal,
        currentValue,
        riskAmount: warning.riskAmount,
        suggestion: '建议追加保证金或补充质押物'
      }
    });

    traceNodes.push({
      id: 'trace-4',
      type: 'status',
      title: '仓单状态',
      description: `当前状态：${warning.receipt.status === 'normal' ? '正常' : '异常'}，需跟进处理`,
      time: warning.warningTime,
      data: {
        status: warning.receipt.status,
        warehouse: warning.receipt.warehouse,
        expiryDate: warning.receipt.expiryDate
      }
    });
  } else if (warning.type === 'duplicate_receipt') {
    const totalPledged = warning.contracts.reduce((sum, c) => sum + c.pledgedQuantity, 0);
    
    traceNodes.push({
      id: 'trace-2',
      type: 'valuation',
      title: '质押明细分析',
      description: `仓单总量${warning.receipt.quantity}吨，累计质押${totalPledged}吨，超额质押${totalPledged - warning.receipt.quantity}吨`,
      time: warning.warningTime,
      data: {
        totalQuantity: warning.receipt.quantity,
        totalPledged,
        contracts: warning.contracts.map(c => ({
          contractNo: c.contractNo,
          pledgedQuantity: c.pledgedQuantity,
          remainingPrincipal: c.remainingPrincipal
        }))
      }
    });

    traceNodes.push({
      id: 'trace-3',
      type: 'limit',
      title: '风险额度分析',
      description: `涉及${warning.contracts.length}笔合同，风险敞口${(warning.riskAmount / 10000).toFixed(0)}万元`,
      time: warning.warningTime,
      data: {
        contractCount: warning.contracts.length,
        totalRiskAmount: warning.riskAmount,
        suggestion: '建议立即核实仓单真实性，冻结重复质押部分'
      }
    });

    traceNodes.push({
      id: 'trace-4',
      type: 'status',
      title: '仓单状态',
      description: '已标记为重复质押状态，需立即核查',
      time: warning.warningTime,
      data: {
        status: 'duplicate',
        warehouse: warning.receipt.warehouse,
        suggestion: '联系仓储方确认实际库存'
      }
    });
  } else if (warning.type === 'price_gap' && contract) {
    const currentValue = contract.currentUnitPrice * contract.pledgedQuantity * contract.pledgeRate;
    
    traceNodes.push({
      id: 'trace-2',
      type: 'valuation',
      title: '市场价格波动',
      description: `价格从${contract.originalUnitPrice}元/吨下跌至${contract.currentUnitPrice}元/吨，跌幅${(((contract.originalUnitPrice - contract.currentUnitPrice) / contract.originalUnitPrice) * 100).toFixed(1)}%`,
      time: warning.warningTime,
      data: {
        originalUnitPrice: contract.originalUnitPrice,
        currentUnitPrice: contract.currentUnitPrice,
        priceDrop: contract.originalUnitPrice - contract.currentUnitPrice,
        priceDropRate: (contract.originalUnitPrice - contract.currentUnitPrice) / contract.originalUnitPrice
      }
    });

    traceNodes.push({
      id: 'trace-3',
      type: 'limit',
      title: '预警线测算',
      description: `警戒线：${(contract.originalUnitPrice * 0.8).toFixed(0)}元/吨，当前价格${contract.currentUnitPrice}元/吨已跌破预警线`,
      time: warning.warningTime,
      data: {
        warningLine: contract.originalUnitPrice * 0.8,
        currentPrice: contract.currentUnitPrice,
        breachAmount: contract.originalUnitPrice * 0.8 - contract.currentUnitPrice,
        suggestion: '通知客户追加保证金或补充质押'
      }
    });

    traceNodes.push({
      id: 'trace-4',
      type: 'status',
      title: '仓单状态',
      description: '仓单状态正常，但需关注价格走势',
      time: warning.warningTime,
      data: {
        status: warning.receipt.status,
        warehouse: warning.receipt.warehouse
      }
    });
  } else {
    traceNodes.push({
      id: 'trace-2',
      type: 'valuation',
      title: '押品估值',
      description: '押品估值充足',
      time: warning.warningTime,
      data: {
        originalValue: contract?.originalUnitPrice,
        currentValue: contract?.currentUnitPrice
      }
    });

    traceNodes.push({
      id: 'trace-3',
      type: 'status',
      title: '仓单状态',
      description: '一切正常',
      time: warning.warningTime,
      data: {
        status: warning.receipt.status
      }
    });
  }

  res.json({
    code: 0,
    message: 'success',
    data: traceNodes,
    timestamp: new Date().toISOString()
  });
});

router.post('/:id/review', (req: Request, res: Response) => {
  const warning = warningsData.find(w => w.id === req.params.id);
  if (!warning) {
    return res.status(404).json({
      code: 404,
      message: '预警记录不存在',
      data: null,
      timestamp: new Date().toISOString()
    });
  }

  const { result, opinion, reviewer } = req.body;
  
  const reviewRecord: ReviewRecord = {
    id: `r-${Date.now()}`,
    warningId: warning.id,
    reviewer: reviewer || '风控专员',
    reviewTime: new Date().toISOString(),
    result: result as WarningStatus,
    opinion
  };

  warning.reviews.push(reviewRecord);
  warning.status = result as WarningStatus;

  res.json({
    code: 0,
    message: '复核成功',
    data: reviewRecord,
    timestamp: new Date().toISOString()
  });
});

router.put('/refresh', (req: Request, res: Response) => {
  res.json({
    code: 0,
    message: '数据已刷新',
    data: {
      refreshedAt: new Date().toISOString(),
      warningCount: warningsData.length
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
