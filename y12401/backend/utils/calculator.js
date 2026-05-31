const dayjs = require('dayjs');

function calculateDiscount(invoiceAmount, discountRate, advanceDays) {
  const discountAmount = invoiceAmount * discountRate;
  const actualPayAmount = invoiceAmount - discountAmount;
  const savingAmount = discountAmount;

  return {
    discountAmount: roundToTwo(discountAmount),
    actualPayAmount: roundToTwo(actualPayAmount),
    savingAmount: roundToTwo(savingAmount),
  };
}

function calculateAdvanceDays(originalDueDate, proposedPayDate) {
  const due = dayjs(originalDueDate);
  const pay = dayjs(proposedPayDate);
  return due.diff(pay, 'day');
}

function roundToTwo(num) {
  return Math.round(num * 100) / 100;
}

function findMatchingRule(rules, advanceDays, supplierName) {
  const supplierRules = rules.filter(
    (r) => r.supplierName === supplierName || r.supplierName === '*'
  );

  const matchingRules = supplierRules.filter(
    (r) => advanceDays >= r.minAdvanceDays && advanceDays <= r.maxAdvanceDays
  );

  matchingRules.sort((a, b) => {
    if (a.supplierName === supplierName && b.supplierName !== supplierName) return -1;
    if (b.supplierName === supplierName && a.supplierName !== supplierName) return 1;
    return b.discountRate - a.discountRate;
  });

  return matchingRules[0] || null;
}

function generateQuoteNo() {
  const now = dayjs();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `DQ${now.format('YYYYMMDDHHmmss')}${random}`;
}

module.exports = {
  calculateDiscount,
  calculateAdvanceDays,
  findMatchingRule,
  generateQuoteNo,
  roundToTwo,
};
