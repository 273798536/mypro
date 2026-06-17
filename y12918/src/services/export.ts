import { run, get, all } from '../database';
import { getReportById } from './report';
import { AppError } from '../utils/response';
import { stringify } from 'csv-stringify/sync';

export function exportReportToCSV(reportId: number): string {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const items = all(
    `SELECT question_id, question_text, is_covered, hit_terms, annotation_status, annotation_note,
            reviewed_by, reviewed_at, review_comment
     FROM report_items
     WHERE report_id = ?
     ORDER BY id ASC`,
    [reportId]
  ) as Array<{
    question_id: string;
    question_text: string;
    is_covered: number;
    hit_terms: string;
    annotation_status: string;
    annotation_note: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    review_comment: string | null;
  }>;

  const statusMap: Record<string, string> = {
    none: '未标注',
    partial: '部分标注',
    full: '已完成',
  };

  const rows = items.map((item) => {
    let hitTermsArray: string[] = [];
    try {
      hitTermsArray = JSON.parse(item.hit_terms);
    } catch {
      // ignore
    }

    return {
      题目ID: item.question_id,
      题目内容: item.question_text,
      是否覆盖: item.is_covered ? '是' : '否',
      命中级词: hitTermsArray.join('、'),
      标注状态: statusMap[item.annotation_status] || item.annotation_status,
      标注说明: item.annotation_note || '',
      复核人: item.reviewed_by || '',
      复核时间: item.reviewed_at || '',
      复核意见: item.review_comment || '',
    };
  });

  const summaryRows = [
    {
      题目ID: '=== 报告摘要 ===',
      题目内容: '',
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '报告名称',
      题目内容: report.name,
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '总题数',
      题目内容: String(report.total_questions),
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '覆盖题数',
      题目内容: String(report.covered_questions),
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '覆盖率',
      题目内容: `${report.coverage_rate}%`,
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '报告状态',
      题目内容: report.status,
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '生成时间',
      题目内容: report.created_at,
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '',
      题目内容: '',
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
    {
      题目ID: '=== 详细数据 ===',
      题目内容: '',
      是否覆盖: '',
      命中级词: '',
      标注状态: '',
      标注说明: '',
      复核人: '',
      复核时间: '',
      复核意见: '',
    },
  ];

  const allRows = [...summaryRows, ...rows];

  return stringify(allRows, {
    header: true,
    columns: [
      '题目ID',
      '题目内容',
      '是否覆盖',
      '命中级词',
      '标注状态',
      '标注说明',
      '复核人',
      '复核时间',
      '复核意见',
    ],
    encoding: 'utf-8',
    bom: true,
  });
}

export function exportReportToJson(reportId: number): string {
  const report = getReportById(reportId);
  if (!report) {
    throw new AppError(`报告 #${reportId} 不存在`, 404);
  }

  const items = all(
    `SELECT question_id, question_text, is_covered, hit_terms, annotation_status, annotation_note,
            reviewed_by, reviewed_at, review_comment
     FROM report_items
     WHERE report_id = ?
     ORDER BY id ASC`,
    [reportId]
  );

  const processedItems = items.map((item: any) => ({
    ...item,
    hit_terms: JSON.parse(item.hit_terms || '[]'),
  }));

  const result = {
    report: {
      id: report.id,
      name: report.name,
      status: report.status,
      total_questions: report.total_questions,
      covered_questions: report.covered_questions,
      coverage_rate: report.coverage_rate,
      total_terms: report.total_terms,
      hit_terms: report.hit_terms,
      summary: report.summary,
      created_at: report.created_at,
      updated_at: report.updated_at,
    },
    items: processedItems,
  };

  return JSON.stringify(result, null, 2);
}

export function getExportFileName(
  reportId: number,
  format: 'csv' | 'json'
): string {
  const report = getReportById(reportId);
  if (!report) {
    return `report_${reportId}.${format}`;
  }
  const safeName = report.name.replace(/[\\/:*?"<>|]/g, '_');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${safeName}_${date}.${format}`;
}
