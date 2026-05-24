const ExcelJS = require('exceljs');
const config = require('../config');
const { maskSensitiveFields } = require('../middleware/permission');

const exportToExcel = async (data, options = {}) => {
  const {
    sheetName = '导出数据',
    headers = [],
    maskSensitive = false,
    sensitiveFields = config.SENSITIVE_FIELDS
  } = options;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  let exportData = maskSensitive ? maskSensitiveFields(data, sensitiveFields) : data;
  
  if (!Array.isArray(exportData)) {
    exportData = [exportData];
  }

  if (headers.length > 0) {
    worksheet.columns = headers.map(h => ({
      header: h.label,
      key: h.key,
      width: h.width || 15
    }));
  } else if (exportData.length > 0) {
    const columns = Object.keys(exportData[0]).map(key => ({
      header: key,
      key: key,
      width: 15
    }));
    worksheet.columns = columns;
  }

  exportData.forEach(row => {
    worksheet.addRow(row);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

const generateExportFileName = (module, date = new Date()) => {
  const dateStr = date.toISOString().slice(0, 10);
  return `${module}_export_${dateStr}.xlsx`;
};

const getExportSummary = (records, module) => {
  if (!records || records.length === 0) {
    return { total: 0, summary: {} };
  }

  const isArray = Array.isArray(records);
  const data = isArray ? records : [records];

  const summary = {
    totalRecords: data.length,
    byStatus: {},
    byBranch: {},
    dirtyCount: 0,
    approvedCount: 0
  };

  data.forEach(record => {
    if (record.status) {
      summary.byStatus[record.status] = (summary.byStatus[record.status] || 0) + 1;
    }
    if (record.branch) {
      summary.byBranch[record.branch] = (summary.byBranch[record.branch] || 0) + 1;
    }
    if (record.is_dirty) {
      summary.dirtyCount++;
    }
    if (record.status === config.RECORD_STATUS.APPROVED) {
      summary.approvedCount++;
    }
  });

  if (module === 'supplier_bills') {
    summary.totalAmount = data.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  }

  if (module === 'teller_schedules') {
    summary.trainingCount = data.filter(r => r.is_training).length;
  }

  return summary;
};

const generateManagerViewData = (allData) => {
  const { schedules = [], leaves = [], forecasts = [], bills = [] } = allData;

  return {
    overview: {
      totalSchedules: schedules.length,
      totalLeaves: leaves.length,
      totalForecasts: forecasts.length,
      totalBills: bills.length,
      pendingReview: {
        schedules: schedules.filter(s => s.status === config.RECORD_STATUS.SUBMITTED).length,
        leaves: leaves.filter(l => l.status === config.RECORD_STATUS.SUBMITTED).length,
        bills: bills.filter(b => b.status === config.RECORD_STATUS.SUBMITTED).length
      },
      dirtyRecords: {
        schedules: schedules.filter(s => s.is_dirty).length,
        leaves: leaves.filter(l => l.is_dirty).length,
        bills: bills.filter(b => b.is_dirty).length
      }
    },
    branchStats: {},
    recentChanges: [],
    sensitiveFieldChanges: []
  };
};

module.exports = {
  exportToExcel,
  generateExportFileName,
  getExportSummary,
  generateManagerViewData
};
