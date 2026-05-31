import { MatchRecord } from '../types';

export const mockMatchRecords: MatchRecord[] = [
  {
    recordId: 'REC001',
    batchId: 'BATCH001',
    projectId: 'PROJ001',
    paymentId: 'PAY001',
    matchStatus: 'matched',
    risks: [],
    project: {
      projectId: 'PROJ001',
      projectName: '赤峰松山200MW风电项目',
      gridConnectionDate: '2023-06-15',
      installedCapacity: 200,
      province: '内蒙古',
      projectType: '风电',
      gridCertificateNo: 'GW-2023-NM-0042'
    },
    batch: {
      batchId: 'BATCH001',
      projectId: 'PROJ001',
      batchNo: 'XNY-2024-Q1-008',
      declarationDate: '2024-01-15',
      subsidyAmount: 8620000,
      invoiceNo: 'FP-2024-001256',
      invoiceDate: '2024-01-20',
      status: 'paid',
      isInvoiceReversed: false
    },
    payment: {
      paymentId: 'PAY001',
      batchId: 'BATCH001',
      paymentDate: '2024-03-10',
      paymentAmount: 8620000,
      bankSerialNo: 'YHLS-20240310-0089',
      payer: '国家能源局内蒙古监管办公室',
      receiverAccount: '6222 **** **** 8888'
    }
  },
  {
    recordId: 'REC002',
    batchId: 'BATCH002',
    projectId: 'PROJ002',
    paymentId: 'PAY002',
    matchStatus: 'matched',
    risks: [
      {
        riskId: 'RISK001',
        batchId: 'BATCH002',
        riskType: 'project_merge',
        riskLevel: 'medium',
        description: '该批次为项目合并批次，由原BATCH003和BATCH004两个批次合并而成。原批次对应项目为"包头达茂旗一期50MW"和"包头达茂旗二期50MW"，合并后总装机容量100MW。',
        suggestion: '请核对两个原项目的并网证明文件，确认合并批次的补贴计算是否符合政策要求。',
        relatedBatches: ['BATCH003', 'BATCH004']
      }
    ],
    project: {
      projectId: 'PROJ002',
      projectName: '包头达茂旗100MW光伏项目（合并）',
      gridConnectionDate: '2023-09-01',
      installedCapacity: 100,
      province: '内蒙古',
      projectType: '光伏',
      gridCertificateNo: 'GW-2023-NM-0078'
    },
    batch: {
      batchId: 'BATCH002',
      projectId: 'PROJ002',
      batchNo: 'XNY-2024-Q1-015',
      declarationDate: '2024-01-28',
      subsidyAmount: 4310000,
      invoiceNo: 'FP-2024-001892',
      invoiceDate: '2024-02-05',
      status: 'merged',
      isInvoiceReversed: false,
      mergedFromBatches: ['BATCH003', 'BATCH004']
    },
    payment: {
      paymentId: 'PAY002',
      paymentDate: '2024-03-25',
      batchId: 'BATCH002',
      paymentAmount: 4310000,
      bankSerialNo: 'YHLS-20240325-0156',
      payer: '国家能源局内蒙古监管办公室',
      receiverAccount: '6222 **** **** 8888'
    }
  },
  {
    recordId: 'REC003',
    batchId: 'BATCH005',
    projectId: 'PROJ003',
    paymentId: 'PAY003',
    matchStatus: 'exception',
    risks: [
      {
        riskId: 'RISK002',
        batchId: 'BATCH005',
        riskType: 'delay',
        riskLevel: 'high',
        description: '该批次补贴申报时间为2024年1月10日，约定到账时间应为2024年3月10日，实际到账时间延迟超过30天以上。',
        suggestion: '请联系补贴发放部门确认延迟原因，跟进到账进度。'
      }
    ],
    project: {
      projectId: 'PROJ003',
      projectName: '张家口张北150MW风电项目',
      gridConnectionDate: '2023-08-20',
      installedCapacity: 150,
      province: '河北',
      projectType: '风电',
      gridCertificateNo: 'GW-2023-HE-0056'
    },
    batch: {
      batchId: 'BATCH005',
      projectId: 'PROJ003',
      batchNo: 'XNY-2024-Q1-022',
      declarationDate: '2024-01-10',
      subsidyAmount: 6465000,
      invoiceNo: 'FP-2024-002145',
      invoiceDate: '2024-01-18',
      status: 'delayed',
      isInvoiceReversed: false
    },
    payment: {
      paymentId: 'PAY003',
      batchId: 'BATCH005',
      paymentDate: '2024-04-20',
      paymentAmount: 6465000,
      bankSerialNo: 'YHLS-20240420-0078',
      payer: '国家能源局河北监管办公室',
      receiverAccount: '6222 **** **** 8888'
    }
  },
  {
    recordId: 'REC004',
    batchId: 'BATCH006',
    projectId: 'PROJ004',
    paymentId: 'PAY004',
    matchStatus: 'exception',
    risks: [
      {
        riskId: 'RISK003',
        batchId: 'BATCH006',
        riskType: 'invoice_reverse',
        riskLevel: 'high',
        description: '该批次原发票FP-2024-002567已红冲，红冲原因：开票信息有误。红冲发票号：HC-2024-000089。新发票号：FP-2024-002567-1。',
        suggestion: '请核对红冲发票与新开发票的金额、税额是否一致，确认账务处理正确。'
      }
    ],
    project: {
      projectId: 'PROJ004',
      projectName: '酒泉瓜州200MW光伏项目',
      gridConnectionDate: '2023-07-12',
      installedCapacity: 200,
      province: '甘肃',
      projectType: '光伏',
      gridCertificateNo: 'GW-2023-GS-0034'
    },
    batch: {
      batchId: 'BATCH006',
      projectId: 'PROJ004',
      batchNo: 'XNY-2024-Q1-031',
      declarationDate: '2024-02-05',
      subsidyAmount: 8620000,
      invoiceNo: 'FP-2024-002567',
      invoiceDate: '2024-02-12',
      status: 'reversed',
      isInvoiceReversed: true,
      reverseReason: '开票信息有误'
    },
    payment: {
      paymentId: 'PAY004',
      batchId: 'BATCH006',
      paymentDate: '2024-04-05',
      paymentAmount: 8620000,
      bankSerialNo: 'YHLS-20240405-0234',
      payer: '国家能源局甘肃监管办公室',
      receiverAccount: '6222 **** **** 8888'
    }
  },
  {
    recordId: 'REC005',
    batchId: 'BATCH007',
    projectId: 'PROJ001',
    paymentId: 'PAY005',
    matchStatus: 'confirmed',
    confirmedBy: '张三',
    confirmedAt: '2024-04-15 14:30:00',
    risks: [],
    project: {
      projectId: 'PROJ001',
      projectName: '赤峰松山200MW风电项目',
      gridConnectionDate: '2023-06-15',
      installedCapacity: 200,
      province: '内蒙古',
      projectType: '风电',
      gridCertificateNo: 'GW-2023-NM-0042'
    },
    batch: {
      batchId: 'BATCH007',
      projectId: 'PROJ001',
      batchNo: 'XNY-2024-Q2-003',
      declarationDate: '2024-04-08',
      subsidyAmount: 8620000,
      invoiceNo: 'FP-2024-003210',
      invoiceDate: '2024-04-15',
      status: 'paid',
      isInvoiceReversed: false
    },
    payment: {
      paymentId: 'PAY005',
      batchId: 'BATCH007',
      paymentDate: '2024-06-12',
      paymentAmount: 8620000,
      bankSerialNo: 'YHLS-20240612-0045',
      payer: '国家能源局内蒙古监管办公室',
      receiverAccount: '6222 **** **** 8888'
    }
  }
];

export const statusLabels: Record<string, string> = {
  unmatched: '未匹配',
  matched: '已匹配',
  confirmed: '已确认',
  exception: '异常'
};

export const riskTypeLabels: Record<string, string> = {
  delay: '批次延迟',
  invoice_reverse: '发票红冲',
  project_merge: '项目合并'
};

export const batchStatusLabels: Record<string, string> = {
  pending: '待处理',
  processing: '处理中',
  paid: '已到账',
  delayed: '延迟到账',
  reversed: '发票红冲',
  merged: '项目合并'
};
