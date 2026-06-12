import { Router, type Request, type Response } from 'express';
import db from '../db.js';

const CONCLUSION_LABELS: Record<string, string> = {
  pending: '待定',
  approved: '通过',
  rejected: '否决',
  revised: '改判',
};

const router = Router();

function buildMarkdown(schemes: Record<string, unknown>[], filters: Record<string, string> | null): string {
  const lines: string[] = [];

  lines.push('# 桥隧检修平台方案比选报告');
  lines.push('');
  lines.push(`生成时间：${new Date().toLocaleString('zh-CN')}`);
  lines.push('');

  if (filters && Object.keys(filters).length > 0) {
    lines.push('## 筛选条件');
    lines.push('');
    const filterParts: string[] = [];
    if (filters.bridgeTunnelName) filterParts.push(`桥隧名称：${filters.bridgeTunnelName}`);
    if (filters.schemeType) filterParts.push(`方案类型：${filters.schemeType}`);
    if (filters.conclusion) filterParts.push(`结论状态：${CONCLUSION_LABELS[filters.conclusion as keyof typeof CONCLUSION_LABELS] || filters.conclusion}`);
    if (filters.hasGap) filterParts.push(`仅显示缺段项`);
    if (filters.dateFrom) filterParts.push(`起始日期：${filters.dateFrom}`);
    if (filters.dateTo) filterParts.push(`截止日期：${filters.dateTo}`);
    filterParts.forEach(p => lines.push(`- ${p}`));
    lines.push('');
  }

  lines.push(`## 方案列表（共 ${schemes.length} 条）`);
  lines.push('');

  for (const s of schemes) {
    const conclusion = s.conclusion as string;
    const hasGap = !!s.has_gap;
    lines.push(`### ${s.scheme_no} — ${s.bridge_tunnel_name}`);
    lines.push('');
    lines.push(`| 字段 | 值 |`);
    lines.push(`|------|-----|`);
    lines.push(`| 点位坐标 | ${s.point_coord} |`);
    lines.push(`| 方案类型 | ${s.scheme_type} |`);
    lines.push(`| 结论 | ${CONCLUSION_LABELS[conclusion as keyof typeof CONCLUSION_LABELS] || conclusion} |`);
    lines.push(`| 缺段标记 | ${hasGap ? '⚠️ 存在缺段' : '无'} |`);
    if (s.supplementary_note) lines.push(`| 后补备注 | ${s.supplementary_note} |`);
    if (s.final_conclusion) lines.push(`| 最终结论 | ${s.final_conclusion} |`);
    lines.push(`| 创建时间 | ${s.created_at} |`);
    lines.push(`| 更新时间 | ${s.updated_at} |`);
    lines.push('');

    const timeline = db.prepare('SELECT * FROM timeline_entries WHERE scheme_id = ? ORDER BY sort_order').all(s.id) as Record<string, unknown>[];
    if (timeline.length > 0) {
      lines.push('**时间轴：**');
      lines.push('');
      for (const t of timeline) {
        const isGap = !!t.is_gap;
        if (isGap) {
          lines.push(`- ⚠️ ~~${t.timestamp} ${t.event}~~（缺段${t.gap_reason ? '：' + t.gap_reason : ''}）`);
        } else {
          lines.push(`- ${t.timestamp} ${t.event}`);
        }
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push('*本报告由桥隧检修平台方案比选工具自动生成*');

  return lines.join('\n');
}

router.post('/markdown', (req: Request, res: Response) => {
  const { schemeIds, filters } = req.body as { schemeIds?: string[]; filters?: Record<string, string> };

  let schemes: Record<string, unknown>[];

  if (schemeIds && schemeIds.length > 0) {
    const placeholders = schemeIds.map(() => '?').join(',');
    schemes = db.prepare(`SELECT * FROM schemes WHERE id IN (${placeholders})`).all(...schemeIds) as Record<string, unknown>[];
  } else {
    let sql = 'SELECT * FROM schemes WHERE 1=1';
    const params: unknown[] = [];

    if (filters) {
      if (filters.bridgeTunnelName) {
        sql += ' AND bridge_tunnel_name LIKE ?';
        params.push(`%${filters.bridgeTunnelName}%`);
      }
      if (filters.schemeType) {
        sql += ' AND scheme_type = ?';
        params.push(filters.schemeType);
      }
      if (filters.conclusion) {
        sql += ' AND conclusion = ?';
        params.push(filters.conclusion);
      }
      if (filters.hasGap) {
        sql += ' AND has_gap = ?';
        params.push(filters.hasGap === 'true' || filters.hasGap === '1' ? 1 : 0);
      }
      if (filters.dateFrom) {
        sql += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }
      if (filters.dateTo) {
        sql += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }
    }

    sql += ' ORDER BY updated_at DESC';
    schemes = db.prepare(sql).all(...params) as Record<string, unknown>[];
  }

  const content = buildMarkdown(schemes, filters || null);
  const filename = `方案比选报告_${new Date().toISOString().slice(0, 10)}.md`;

  res.json({ content, filename });
});

export default router;
