import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import pdfParse from 'pdf-parse';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { ParsedInvoice, ParsedTravelApp, ParsedPayment } from '../types';

export class FileParserService {
  static async computeFileHash(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  static async parseInvoicePDF(filePath: string): Promise<ParsedInvoice[]> {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    const invoices: ParsedInvoice[] = [];
    const rawData = this.extractInvoiceFields(text);

    if (rawData.invoiceNo) {
      invoices.push({
        invoiceNo: rawData.invoiceNo,
        invoiceDate: rawData.invoiceDate || new Date(),
        amount: rawData.amount || 0,
        taxAmount: rawData.taxAmount,
        totalAmount: rawData.totalAmount || rawData.amount || 0,
        sellerName: rawData.sellerName,
        sellerTaxNo: rawData.sellerTaxNo,
        buyerName: rawData.buyerName,
        buyerTaxNo: rawData.buyerTaxNo,
        invoiceType: rawData.invoiceType,
        hotelName: rawData.hotelName,
        checkInDate: rawData.checkInDate,
        checkOutDate: rawData.checkOutDate,
        guestNames: rawData.guestNames,
        rawData: {
          fullText: text,
          extractedFields: rawData,
        },
      });
    }

    return invoices;
  }

  private static extractInvoiceFields(text: string): Record<string, any> {
    const result: Record<string, any> = {};

    const invoiceNoMatch = text.match(/发票号码[：:]\s*(\d+)/) ||
                           text.match(/No\.\s*[:：]\s*(\d+)/i) ||
                           text.match(/Invoice\s*No\.?\s*[:：]?\s*(\w+)/i);
    if (invoiceNoMatch) result.invoiceNo = invoiceNoMatch[1];

    const dateMatch = text.match(/开票日期[：:]\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}日?)/) ||
                      text.match(/Date[：:]\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i);
    if (dateMatch) {
      result.invoiceDate = this.parseDate(dateMatch[1]);
    }

    const totalMatch = text.match(/价税合计[：:]\s*[￥¥]?\s*([\d,]+\.?\d*)/) ||
                       text.match(/总金额[：:]\s*[￥¥]?\s*([\d,]+\.?\d*)/) ||
                       text.match(/Total[：:]\s*[￥¥$]?\s*([\d,]+\.?\d*)/i);
    if (totalMatch) {
      result.totalAmount = parseFloat(totalMatch[1].replace(/,/g, ''));
    }

    const amountMatch = text.match(/金额[：:]\s*[￥¥]?\s*([\d,]+\.?\d*)/) ||
                        text.match(/Amount[：:]\s*[￥¥$]?\s*([\d,]+\.?\d*)/i);
    if (amountMatch) {
      result.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    }

    const taxMatch = text.match(/税额[：:]\s*[￥¥]?\s*([\d,]+\.?\d*)/) ||
                     text.match(/Tax[：:]\s*[￥¥$]?\s*([\d,]+\.?\d*)/i);
    if (taxMatch) {
      result.taxAmount = parseFloat(taxMatch[1].replace(/,/g, ''));
    }

    const sellerMatch = text.match(/销售方[：:]\s*([^\n]+)/) ||
                        text.match(/Seller[：:]\s*([^\n]+)/i);
    if (sellerMatch) result.sellerName = sellerMatch[1].trim();

    const buyerMatch = text.match(/购买方[：:]\s*([^\n]+)/) ||
                       text.match(/Buyer[：:]\s*([^\n]+)/i);
    if (buyerMatch) result.buyerName = buyerMatch[1].trim();

    const hotelMatch = text.match(/(酒店|宾馆|饭店|Hotel)[：:\s]*([^\n]+)/i);
    if (hotelMatch) result.hotelName = hotelMatch[2]?.trim() || hotelMatch[0];

    const checkInMatch = text.match(/入住(日期)?[：:]\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}日?)/) ||
                         text.match(/Check[-\s]?in[：:]\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i);
    if (checkInMatch) result.checkInDate = this.parseDate(checkInMatch[2] || checkInMatch[1]);

    const checkOutMatch = text.match(/离店(日期)?[：:]\s*(\d{4}[-年]\d{1,2}[-月]\d{1,2}日?)/) ||
                          text.match(/Check[-\s]?out[：:]\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/i);
    if (checkOutMatch) result.checkOutDate = this.parseDate(checkOutMatch[2] || checkOutMatch[1]);

    const guestMatch = text.match(/客人?[：:]\s*([^\n]+)/) ||
                       text.match(/Guest[：:]\s*([^\n]+)/i);
    if (guestMatch) result.guestNames = guestMatch[1].trim();

    result.invoiceType = this.detectInvoiceType(text);

    return result;
  }

  private static detectInvoiceType(text: string): string {
    if (text.includes('增值税专用发票')) return '增值税专用发票';
    if (text.includes('增值税普通发票')) return '增值税普通发票';
    if (text.includes('电子发票')) return '电子发票';
    if (text.includes('住宿')) return '住宿费发票';
    if (text.includes('交通') || text.includes('打车') || text.includes('出租')) return '交通费发票';
    return '普通发票';
  }

  private static parseDate(dateStr: string): Date | undefined {
    try {
      const cleaned = dateStr
        .replace(/年/g, '-')
        .replace(/月/g, '-')
        .replace(/日/g, '')
        .replace(/\//g, '-')
        .trim();
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) return date;
    } catch (e) {
      return undefined;
    }
    return undefined;
  }

  static async parseTravelApplication(filePath: string, fileType: string): Promise<ParsedTravelApp[]> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      return this.parseTravelCSV(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.parseTravelExcel(filePath);
    }

    return [];
  }

  private static parseTravelCSV(filePath: string): ParsedTravelApp[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((row: any, index: number) => ({
      appNo: row['申请单号'] || row['appNo'] || row['编号'] || `APP-${index + 1}`,
      applicant: row['申请人'] || row['applicant'] || row['姓名'] || '',
      department: row['部门'] || row['department'] || '',
      travelStart: this.parseDate(row['开始日期'] || row['travelStart'] || row['出发日期']) || new Date(),
      travelEnd: this.parseDate(row['结束日期'] || row['travelEnd'] || row['返回日期']) || new Date(),
      destination: row['目的地'] || row['destination'] || '',
      purpose: row['事由'] || row['purpose'] || row['出差原因'],
      travelers: row['同行人'] || row['travelers'],
      estimatedAccommodation: parseFloat(row['住宿费预估'] || row['estimatedAccommodation'] || '0'),
      estimatedTransport: parseFloat(row['交通费预估'] || row['estimatedTransport'] || '0'),
      estimatedOther: parseFloat(row['其他费用预估'] || row['estimatedOther'] || '0'),
      estimatedTotal: parseFloat(row['总预估'] || row['estimatedTotal'] || '0'),
      rawData: row,
    }));
  }

  private static parseTravelExcel(filePath: string): ParsedTravelApp[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(sheet);

    return records.map((row: any, index: number) => ({
      appNo: row['申请单号'] || row['appNo'] || row['编号'] || `APP-${index + 1}`,
      applicant: row['申请人'] || row['applicant'] || row['姓名'] || '',
      department: row['部门'] || row['department'] || '',
      travelStart: this.parseDate(row['开始日期'] || row['travelStart'] || row['出发日期']) || new Date(),
      travelEnd: this.parseDate(row['结束日期'] || row['travelEnd'] || row['返回日期']) || new Date(),
      destination: row['目的地'] || row['destination'] || '',
      purpose: row['事由'] || row['purpose'] || row['出差原因'],
      travelers: row['同行人'] || row['travelers'],
      estimatedAccommodation: parseFloat(row['住宿费预估'] || row['estimatedAccommodation'] || '0'),
      estimatedTransport: parseFloat(row['交通费预估'] || row['estimatedTransport'] || '0'),
      estimatedOther: parseFloat(row['其他费用预估'] || row['estimatedOther'] || '0'),
      estimatedTotal: parseFloat(row['总预估'] || row['estimatedTotal'] || '0'),
      rawData: row,
    }));
  }

  static async parsePaymentRecord(filePath: string): Promise<ParsedPayment[]> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.csv') {
      return this.parsePaymentCSV(filePath);
    } else if (ext === '.xlsx' || ext === '.xls') {
      return this.parsePaymentExcel(filePath);
    }

    return [];
  }

  private static parsePaymentCSV(filePath: string): ParsedPayment[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((row: any, index: number) => ({
      paymentNo: row['付款单号'] || row['paymentNo'] || row['流水号'] || `PAY-${index + 1}`,
      paymentDate: this.parseDate(row['付款日期'] || row['paymentDate'] || row['日期']) || new Date(),
      payee: row['收款方'] || row['payee'] || row['收款人'],
      amount: parseFloat(row['金额'] || row['amount'] || row['付款金额'] || '0'),
      paymentMethod: row['付款方式'] || row['paymentMethod'],
      remark: row['备注'] || row['remark'],
      relatedInvoiceNo: row['关联发票号'] || row['relatedInvoiceNo'],
      relatedAppNo: row['关联申请单号'] || row['relatedAppNo'],
      rawData: row,
    }));
  }

  private static parsePaymentExcel(filePath: string): ParsedPayment[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const records = XLSX.utils.sheet_to_json(sheet);

    return records.map((row: any, index: number) => ({
      paymentNo: row['付款单号'] || row['paymentNo'] || row['流水号'] || `PAY-${index + 1}`,
      paymentDate: this.parseDate(row['付款日期'] || row['paymentDate'] || row['日期']) || new Date(),
      payee: row['收款方'] || row['payee'] || row['收款人'],
      amount: parseFloat(row['金额'] || row['amount'] || row['付款金额'] || '0'),
      paymentMethod: row['付款方式'] || row['paymentMethod'],
      remark: row['备注'] || row['remark'],
      relatedInvoiceNo: row['关联发票号'] || row['relatedInvoiceNo'],
      relatedAppNo: row['关联申请单号'] || row['relatedAppNo'],
      rawData: row,
    }));
  }
}
