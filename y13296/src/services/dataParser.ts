import { Material, ComplaintRecord, MaterialType, MaterialVersion, ParsedData } from '../types';

let materialCounter = 0;
let complaintCounter = 0;

export function parseMaterialContent(
  content: string,
  type: MaterialType,
  title: string,
  parkName: string,
  uploader: string,
  fileName?: string,
  isLateArrival: boolean = false
): { material: Material; parsedData: ParsedData } {
  const materialId = `material-${++materialCounter}`;
  
  const initialVersion: MaterialVersion = {
    id: `${materialId}-v1`,
    version: 1,
    content,
    uploadTime: new Date(),
    uploader,
    isLateArrival,
  };
  
  const material: Material = {
    id: materialId,
    type,
    title,
    fileName,
    parkName,
    versions: [initialVersion],
    currentVersion: 1,
    tags: generateTags(type, content),
  };
  
  const parsedData = parseComplaints(content, material.id, initialVersion.id, title);
  
  return { material, parsedData };
}

function generateTags(type: MaterialType, content: string): string[] {
  const tags: string[] = [];
  
  const typeTags: Record<MaterialType, string> = {
    'resident_feedback': '居民反馈',
    'attachment': '附件材料',
    'verbal_note': '口头说明',
  };
  tags.push(typeTags[type]);
  
  if (content.includes('座椅') || content.includes('座位')) tags.push('座椅');
  if (content.includes('投诉') || content.includes('反映')) tags.push('投诉');
  if (content.includes('路口') || content.includes('交叉口')) tags.push('路口');
  if (content.includes('容量') || content.includes('不足') || content.includes('不够')) tags.push('容量问题');
  
  return tags;
}

function parseComplaints(
  content: string, 
  materialId: string, 
  versionId: string,
  source: string
): ParsedData {
  const lines = content.split('\n');
  const complaints: ComplaintRecord[] = [];
  const parseErrors: ParsedData['parseErrors'] = [];
  
  let currentRecord: Partial<ComplaintRecord> = {};
  let recordStartLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      if (Object.keys(currentRecord).length > 0) {
        try {
          const complaint = finalizeComplaint(currentRecord, materialId, versionId, source, recordStartLine);
          complaints.push(complaint);
        } catch (e) {
          parseErrors.push({
            line: recordStartLine + 1,
            content: lines.slice(recordStartLine, i + 1).join('\n'),
            error: e instanceof Error ? e.message : '解析失败',
          });
        }
        currentRecord = {};
        recordStartLine = -1;
      }
      continue;
    }
    
    if (recordStartLine === -1) {
      recordStartLine = i;
    }
    
    parseLineToRecord(line, currentRecord, i + 1, source);
  }
  
  if (Object.keys(currentRecord).length > 0) {
    try {
      const complaint = finalizeComplaint(currentRecord, materialId, versionId, source, recordStartLine);
      complaints.push(complaint);
    } catch (e) {
      parseErrors.push({
        line: recordStartLine + 1,
        content: lines.slice(recordStartLine).join('\n'),
        error: e instanceof Error ? e.message : '解析失败',
      });
    }
  }
  
  return { complaints, rawLines: lines, parseErrors };
}

function parseLineToRecord(line: string, record: Partial<ComplaintRecord>, lineNumber: number, source: string) {
  const patterns: [RegExp, keyof ComplaintRecord][] = [
    [/^(?:街道|位置|地点)[:：]\s*(.+)$/, 'street'],
    [/^(?:路口|交叉口|转角)[:：]\s*(.+)$/, 'intersection'],
    [/^(?:类型|问题类型|投诉类型)[:：]\s*(.+)$/, 'complaintType'],
    [/^(?:描述|内容|问题描述|投诉内容)[:：]\s*(.+)$/, 'description'],
    [/^(?:座椅数量|座位数|椅子数)[:：]\s*(\d+)/, 'seatCount'],
    [/^(?:时间|日期|投诉时间)[:：]\s*(.+)$/, 'reportedTime'],
    [/^(?:投诉人|反映人|居民)[:：]\s*(.+)$/, 'reporter'],
  ];
  
  for (const [pattern, field] of patterns) {
    const match = line.match(pattern);
    if (match) {
      if (field === 'reportedTime') {
        (record as any)[field] = parseDate(match[1]);
      } else if (field === 'seatCount') {
        (record as any)[field] = parseInt(match[1], 10);
      } else {
        (record as any)[field] = match[1].trim();
      }
      
      if (!record.rawReference) {
        record.rawReference = {
          source,
          lineNumber,
          fieldName: field as string,
          originalValue: match[1].trim(),
        };
      }
      return;
    }
  }
  
  if (!record.description) {
    record.description = line;
    record.rawReference = {
      source,
      lineNumber,
      fieldName: 'description',
      originalValue: line,
    };
  } else {
    record.description += ' ' + line;
  }
}

function finalizeComplaint(
  record: Partial<ComplaintRecord>,
  materialId: string,
  versionId: string,
  source: string,
  startLine: number
): ComplaintRecord {
  if (!record.street) {
    throw new Error('缺少街道信息');
  }
  if (!record.description) {
    throw new Error('缺少投诉描述');
  }
  
  const complaintId = `complaint-${++complaintCounter}`;
  
  return {
    id: complaintId,
    materialId,
    versionId,
    street: record.street,
    intersection: record.intersection,
    complaintType: record.complaintType || '其他',
    description: record.description,
    seatCount: record.seatCount,
    reportedTime: record.reportedTime || new Date(),
    reporter: record.reporter || '匿名',
    rawReference: record.rawReference || {
      source,
      lineNumber: startLine + 1,
      originalValue: record.description || '',
    },
    isAnomaly: false,
  };
}

function parseDate(dateStr: string): Date {
  const now = new Date();
  
  const todayMatch = dateStr.match(/今天\s*(\d{1,2})[:：](\d{2})/);
  if (todayMatch) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(todayMatch[1]), parseInt(todayMatch[2]));
  }
  
  const yesterdayMatch = dateStr.match(/昨天\s*(\d{1,2})[:：](\d{2})/);
  if (yesterdayMatch) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    date.setHours(parseInt(yesterdayMatch[1]), parseInt(yesterdayMatch[2]), 0, 0);
    return date;
  }
  
  const fullMatch = dateStr.match(/(\d{4})[-年](\d{1,2})[-月](\d{1,2})[日]?\s*(\d{1,2})?[:：]?(\d{2})?/);
  if (fullMatch) {
    const year = parseInt(fullMatch[1]);
    const month = parseInt(fullMatch[2]) - 1;
    const day = parseInt(fullMatch[3]);
    const hour = fullMatch[4] ? parseInt(fullMatch[4]) : 0;
    const minute = fullMatch[5] ? parseInt(fullMatch[5]) : 0;
    return new Date(year, month, day, hour, minute);
  }
  
  const simpleMatch = dateStr.match(/(\d{1,2})[-月](\d{1,2})[日]?/);
  if (simpleMatch) {
    return new Date(now.getFullYear(), parseInt(simpleMatch[1]) - 1, parseInt(simpleMatch[2]));
  }
  
  return new Date(dateStr) || now;
}

export function parseRawText(text: string): { field: string; value: string } | null {
  const match = text.match(/^(.+?)[:：]\s*(.+)$/);
  if (!match) return null;
  return { field: match[1].trim(), value: match[2].trim() };
}

export function getMaterialTypeLabel(type: MaterialType): string {
  const labels: Record<MaterialType, string> = {
    'resident_feedback': '居民反馈',
    'attachment': '附件材料',
    'verbal_note': '口头说明',
  };
  return labels[type];
}
