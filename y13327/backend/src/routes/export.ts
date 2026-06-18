import { Router, Request, Response } from 'express';
import db from '../database';
import type { ExportPayload } from '../types';

const router = Router();

function parseJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

router.get('/ticket/:ticketId', (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const operator = req.headers['x-operator'] as string || 'system';

  const ticketRow = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId) as any;
  if (!ticketRow) {
    return res.status(404).json({ message: '工单不存在' });
  }

  const ticket = {
    ...ticketRow,
    citation_urls: parseJson<string[]>(ticketRow.citation_urls, [])
  };

  const reviewRecords = db.prepare(
    'SELECT * FROM review_records WHERE ticket_id = ? ORDER BY created_at ASC'
  ).all(ticketId);

  const historyVersions = db.prepare(`
    SELECT * FROM history_versions WHERE ticket_id = ? ORDER BY version ASC, changed_at ASC
  `).all(ticketId).map((r: any) => ({
    ...r,
    old_screenshot_refs: parseJson<string[]>(r.old_screenshot_refs, [])
  }));

  const screenshots = db.prepare(
    'SELECT * FROM screenshots WHERE ticket_id = ? ORDER BY uploaded_at ASC'
  ).all(ticketId);

  const missingCitationRow = db.prepare(`
    SELECT * FROM missing_citation_records 
    WHERE ticket_id = ? ORDER BY created_at DESC LIMIT 1
  `).get(ticketId) as any;

  const missingCitation = missingCitationRow ? {
    id: missingCitationRow.id,
    ticket_id: missingCitationRow.ticket_id,
    missing_items: parseJson(missingCitationRow.missing_items, []),
    reason: missingCitationRow.reason,
    reason_detail: missingCitationRow.reason_detail,
    impact_scope: parseJson(missingCitationRow.impact_scope, {}),
    confirmed: missingCitationRow.confirmed === 1,
    confirmed_by: missingCitationRow.confirmed_by,
    confirmed_at: missingCitationRow.confirmed_at,
    created_at: missingCitationRow.created_at
  } : null;

  const payload: ExportPayload = {
    ticket,
    review_records: reviewRecords as any[],
    history_versions: historyVersions as any[],
    screenshots: screenshots as any[],
    missing_citation: missingCitation,
    export_time: new Date().toISOString(),
    operator
  };

  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('舆情聚类人工改判 - 交付说明');
  lines.push(`导出时间: ${payload.export_time}`);
  lines.push(`操作人员: ${payload.operator}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push('【一、线上工单信息】');
  lines.push(`工单编号: ${ticket.ticket_no}`);
  lines.push(`工单标题: ${ticket.title}`);
  lines.push(`原始聚类: ${ticket.original_cluster}`);
  lines.push(`最终聚类: ${ticket.final_cluster || '(尚未确定)'}`);
  lines.push(`处理状态: ${ticket.status}`);
  lines.push(`引用状态: ${ticket.citation_status}`);
  lines.push(`引用链接数: ${ticket.citation_urls.length}`);
  ticket.citation_urls.forEach((url, i) => {
    lines.push(`  [引用${i + 1}] ${url}`);
  });
  lines.push(`创建时间: ${ticket.created_at}`);
  lines.push(`更新时间: ${ticket.updated_at}`);
  lines.push('');
  lines.push('【二、人工改判处理记录】');
  if (reviewRecords.length === 0) {
    lines.push('(暂无处理记录)');
  } else {
    reviewRecords.forEach((r: any, i) => {
      lines.push(`--- 记录 ${i + 1} ---`);
      lines.push(`处理人: ${r.reviewer}`);
      lines.push(`处理时间: ${r.created_at}`);
      lines.push(`改判前聚类: ${r.before_cluster}`);
      lines.push(`改判后聚类: ${r.after_cluster}`);
      lines.push(`改判备注: ${r.review_note || '(无)'}`);
      lines.push(`截图说明: ${r.screenshot_descriptions || '(无)'}`);
    });
  }
  lines.push('');
  lines.push('【三、历史版本变更记录】');
  if (historyVersions.length === 0) {
    lines.push('(暂无变更记录)');
  } else {
    historyVersions.forEach((v: any, i) => {
      lines.push(`--- 版本 ${v.version} (${i + 1}) ---`);
      lines.push(`变更字段: ${v.field_name}`);
      lines.push(`变更人: ${v.changed_by}`);
      lines.push(`变更时间: ${v.changed_at}`);
      lines.push(`旧值: ${v.old_value || '(空)'}`);
      lines.push(`新值: ${v.new_value || '(空)'}`);
      lines.push(`变更说明: ${v.change_note || '(无)'}`);
      if (v.old_screenshot_refs.length > 0) {
        lines.push(`关联旧截图: ${v.old_screenshot_refs.join(', ')}`);
      }
    });
  }
  lines.push('');
  lines.push('【四、截图说明清单】');
  if (screenshots.length === 0) {
    lines.push('(暂无截图)');
  } else {
    screenshots.forEach((s: any, i) => {
      lines.push(`- 截图${i + 1}: ${s.filename}`);
      lines.push(`  说明: ${s.description || '(无说明)'}`);
      lines.push(`  上传人: ${s.uploaded_by}  时间: ${s.uploaded_at}`);
      lines.push(`  类型: ${s.is_legacy ? '历史版本截图' : '当前版本截图'}`);
    });
  }
  lines.push('');
  if (missingCitation) {
    lines.push('【五、引用缺失待确认】');
    lines.push(`状态: ${missingCitation.confirmed ? '已确认' : '待确认'}`);
    lines.push(`原因类型: ${missingCitation.reason}`);
    lines.push(`原因说明: ${missingCitation.reason_detail || '(无)'}`);
    lines.push('缺失项明细:');
    missingCitation.missing_items.forEach((it: any) => {
      lines.push(`  - ${it.field}: 期望「${it.expected}」，实际「${it.actual || '缺失'}」`);
    });
    lines.push('影响范围:');
    const scope = missingCitation.impact_scope as any;
    lines.push(`  影响报告: ${(scope.affected_reports || []).join('、') || '(待评估)'}`);
    lines.push(`  影响聚类: ${(scope.affected_clusters || []).join('、') || '(待评估)'}`);
    lines.push(`  估算影响数量: ${scope.estimated_count || 0}`);
    lines.push(`  严重程度: ${scope.severity || 'medium'}`);
    if (missingCitation.confirmed_by) {
      lines.push(`确认人: ${missingCitation.confirmed_by}  时间: ${missingCitation.confirmed_at}`);
    }
    lines.push('');
  }
  lines.push('='.repeat(60));
  lines.push('*以上内容与页面显示状态保持一致');
  lines.push('='.repeat(60));

  const fileName = `交付说明_${ticket.ticket_no}_${Date.now()}.txt`;
  const content = lines.join('\n');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(content);
});

export default router;
