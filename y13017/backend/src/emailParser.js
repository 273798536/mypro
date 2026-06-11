const { simpleParser } = require('mailparser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const STATUS_MAP = {
  'pending_materials': '待补材料',
  'processed': '已处理',
  'manual_review': '人工改判'
};

function extractFromText(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function parseDisputeFromEmail(emailData, emailFile) {
  const fullText = `${emailData.subject || ''}\n${emailData.text || ''}\n${emailData.html || ''}`;

  const caseNo = extractFromText(fullText, [
    /争议款编号[::\s]*([A-Za-z0-9\-_]+)/,
    /Case\s*(?:No|Number)[::\s]*([A-Za-z0-9\-_]+)/i,
    /案件编号[::\s]*([A-Za-z0-9\-_]+)/,
    /\[([A-Z]{2,}\d{6,})\]/
  ]);

  if (!caseNo) {
    const fromSubject = emailData.subject && emailData.subject.match(/([A-Z]{2,}\d{5,})/);
    if (fromSubject) {
      return null;
    }
    return null;
  }

  const cardNo = extractFromText(fullText, [
    /卡号[::\s]*(\d{4}[*Xx]+\d{4})/,
    /Card\s*(?:No|Number)[::\s]*(\d{4}[*Xx]+\d{4})/i
  ]);

  const txnDate = extractFromText(fullText, [
    /交易日期[::\s]*(\d{4}[-/]\d{2}[-/]\d{2})/,
    /Txn\s*Date[::\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i,
    /Transaction\s*Date[::\s]*(\d{4}[-/]\d{2}[-/]\d{2})/i
  ]);

  let txnAmount = null;
  let txnCurrency = null;
  const amountMatch = fullText.match(/交易金额[::\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)/);
  if (amountMatch) {
    txnCurrency = amountMatch[1] || null;
    txnAmount = parseFloat(amountMatch[2].replace(/,/g, ''));
  }

  const approvalNo = extractFromText(fullText, [
    /授权号[::\s]*([A-Za-z0-9]+)/,
    /Approval\s*Code[::\s]*([A-Za-z0-9]+)/i,
    /Approval\s*No[::\s]*([A-Za-z0-9]+)/i
  ]);

  const merchant = extractFromText(fullText, [
    /商户名称[::\s]*([^\n\r]+)/,
    /Merchant\s*Name[::\s]*([^\n\r]+)/i
  ]);

  const disputeType = extractFromText(fullText, [
    /争议类型[::\s]*([^\n\r]+)/,
    /Dispute\s*Type[::\s]*([^\n\r]+)/i,
    /Reason\s*Code[::\s]*([A-Za-z0-9]+)/i
  ]);

  let taxAmount = null;
  const taxMatch = fullText.match(/税(?:费)?[::\s]*([\d,]+\.?\d*)/);
  if (taxMatch) {
    taxAmount = parseFloat(taxMatch[1].replace(/,/g, ''));
  }

  let exchangeRate = null;
  const rateMatch = fullText.match(/(?:汇率|汇\s*率)[::\s]*([\d.]+\.?\d*)/);
  if (rateMatch) {
    exchangeRate = parseFloat(rateMatch[1]);
  }

  let settleAmount = null;
  let settleCurrency = null;
  const settleMatch = fullText.match(/(?:清算|结算)金额[::\s]*([A-Z]{3})?\s*([\d,]+\.?\d*)/);
  if (settleMatch) {
    settleCurrency = settleMatch[1] || null;
    settleAmount = parseFloat(settleMatch[2].replace(/,/g, ''));
  }

  let status = 'pending_materials';
  if (/已处理|处理完成|Completed/i.test(fullText)) {
    status = 'processed';
  } else if (/人工改判|复核|Review/i.test(fullText)) {
    status = 'manual_review';
  }

  return {
    caseNo,
    cardNo,
    txnDate,
    txnAmount,
    txnCurrency,
    approvalNo,
    merchant,
    disputeType,
    taxAmount,
    exchangeRate,
    settleAmount,
    settleCurrency,
    status,
    _emailSubject: emailData.subject,
    _emailDate: emailData.date ? dayjs(emailData.date).format('YYYY-MM-DD HH:mm:ss') : null,
    _attachments: emailData.attachments || []
  };
}

async function parseEmailFile(filePath) {
  const content = fs.readFileSync(filePath);
  const parsed = await simpleParser(content);
  return {
    messageId: parsed.messageId || null,
    subject: parsed.subject || '',
    sender: parsed.from ? parsed.from.text : '',
    recipient: parsed.to ? parsed.to.text : '',
    date: parsed.date || null,
    text: parsed.text || '',
    html: parsed.html || '',
    attachments: parsed.attachments || []
  };
}

module.exports = {
  parseEmailFile,
  parseDisputeFromEmail,
  STATUS_MAP
};
