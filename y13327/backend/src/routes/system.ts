import { Router, Request, Response } from 'express';
import db from '../database';

const router = Router();

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM tickets').get() as any;
  if (count.c > 0) return;

  const insertTicket = db.prepare(`
    INSERT INTO tickets (ticket_no, title, original_cluster, final_cluster, status, citation_urls, citation_status, content)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO review_records (ticket_id, reviewer, before_cluster, after_cluster, review_note, screenshot_descriptions)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO history_versions (ticket_id, version, field_name, old_value, new_value, changed_by, change_note, old_screenshot_refs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMissing = db.prepare(`
    INSERT INTO missing_citation_records (ticket_id, missing_items, reason, reason_detail, impact_scope)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertGray = db.prepare(`
    INSERT INTO gray_results (gray_batch, report_date, sample_change, threshold_change, manual_review)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tickets = [
    {
      no: 'OC-2026-0618-001',
      title: '某平台数据安全事件舆情聚类异常',
      original: '数据安全-个人信息泄露',
      final: '数据安全-平台漏洞',
      status: 'completed',
      urls: ['https://news.example.com/a/123', 'https://news.example.com/b/456'],
      cStatus: 'complete',
      content: '用户反馈某平台数据泄露，涉及用户约10万。原归因为个人信息泄露，经核查实为平台接口漏洞导致。'
    },
    {
      no: 'OC-2026-0618-002',
      title: '消费投诉事件引用来源待核实',
      original: '消费投诉-退款纠纷',
      final: null,
      status: 'citation_missing',
      urls: ['https://example.com/placeholder'],
      cStatus: 'missing',
      content: '消费退款纠纷，但引用链接为占位符，未找到实际报道来源。【投诉内容】缺失'
    },
    {
      no: 'OC-2026-0617-003',
      title: '竞品功能对比报告聚类调整',
      original: '市场观察-竞品分析',
      final: '市场观察-产品对比',
      status: 'processing',
      urls: ['https://example.com/report-001'],
      cStatus: 'partial',
      content: '竞品功能对比，原聚类为竞品分析，需调整为产品对比并补充引用。'
    },
    {
      no: 'OC-2026-0617-004',
      title: '新版本功能舆情反馈汇总',
      original: '产品反馈-功能建议',
      final: '产品反馈-使用体验',
      status: 'completed',
      urls: ['https://example.com/feedback/1', 'https://example.com/feedback/2', 'https://example.com/feedback/3'],
      cStatus: 'complete',
      content: '用户对新版本功能的反馈汇总，涉及界面、性能、交互等方面。'
    },
    {
      no: 'OC-2026-0616-005',
      title: '活动推广效果舆情监测',
      original: '运营数据-推广活动',
      final: null,
      status: 'pending',
      urls: [],
      cStatus: 'missing',
      content: '618活动推广效果相关舆情，暂未补充引用链接。'
    }
  ];

  const tx = db.transaction(() => {
    tickets.forEach((t, idx) => {
      const info = insertTicket.run(
        t.no, t.title, t.original, t.final, t.status,
        JSON.stringify(t.urls), t.cStatus, t.content
      );
      const ticketId = info.lastInsertRowid as number;

      if (t.final) {
        insertReview.run(
          ticketId, '评测-小孟', t.original, t.final,
          idx === 0 ? '经人工核查，漏洞是根因，非个人信息泄露' : '聚类维度调整，提升分类准确性',
          idx === 0 ? '图1：接口漏洞技术分析截图；图2：数据流向示意图' : '图1：聚类前后对比图'
        );
        insertHistory.run(
          ticketId, 1, '聚类结果', t.original, t.final,
          '评测-小孟', '人工改判：聚类维度调整', JSON.stringify(['v1_original.png'])
        );
      }

      if (t.status === 'citation_missing') {
        insertMissing.run(
          ticketId,
          JSON.stringify([
            { field: '引用链接', expected: '真实有效的新闻来源', actual: '占位符URL' },
            { field: '投诉内容', expected: '包含投诉内容描述', actual: null }
          ]),
          'source_url_dead',
          '引用链接为测试占位符，未找到原始报道',
          JSON.stringify({
            affected_reports: [t.no, 'OC-2026-0618-REPORT'],
            affected_clusters: ['消费投诉-退款纠纷', '消费投诉-售后服务'],
            estimated_count: 3,
            severity: 'high'
          })
        );
      }

      if (idx >= 2) {
        insertHistory.run(
          ticketId, 1, '补充备注', '',
          idx === 2 ? '备注：后续补充第2条引用' : '备注：整理用户反馈关键词',
          '排班-小王', '工单补录备注', JSON.stringify([])
        );
      }
    });

    insertGray.run(
      'GRAY-2026-W25',
      '2026-06-18',
      JSON.stringify({
        before_count: 1280,
        after_count: 1347,
        difference: 67,
        difference_rate: '5.23%',
        details: { added: 89, removed: 22, modified: 31 }
      }),
      JSON.stringify({
        before_threshold: 0.70,
        after_threshold: 0.75,
        impact_count: 192,
        impact_details: { upgraded: 77, downgraded: 67, unchanged: 48 }
      }),
      JSON.stringify({
        total_reviewed: 256,
        total_changed: 31,
        change_rate: '12.11%',
        details: { cluster_adjusted: 16, citation_added: 9, note_appended: 6 }
      })
    );

    insertGray.run(
      'GRAY-2026-W24',
      '2026-06-11',
      JSON.stringify({
        before_count: 1150,
        after_count: 1280,
        difference: 130,
        difference_rate: '11.30%',
        details: { added: 145, removed: 15, modified: 52 }
      }),
      JSON.stringify({
        before_threshold: 0.65,
        after_threshold: 0.70,
        impact_count: 230,
        impact_details: { upgraded: 92, downgraded: 80, unchanged: 58 }
      }),
      JSON.stringify({
        total_reviewed: 230,
        total_changed: 28,
        change_rate: '12.17%',
        details: { cluster_adjusted: 14, citation_added: 8, note_appended: 6 }
      })
    );
  });

  tx();
}

seedIfEmpty();

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/stats', (_req: Request, res: Response) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM tickets) as total_tickets,
      (SELECT COUNT(*) FROM tickets WHERE status = 'pending') as pending,
      (SELECT COUNT(*) FROM tickets WHERE status = 'processing') as processing,
      (SELECT COUNT(*) FROM tickets WHERE status = 'citation_missing') as citation_missing,
      (SELECT COUNT(*) FROM tickets WHERE status = 'completed') as completed,
      (SELECT COUNT(*) FROM review_records) as total_reviews,
      (SELECT COUNT(*) FROM history_versions) as total_history,
      (SELECT COUNT(*) FROM missing_citation_records WHERE confirmed = 0) as unconfirmed_missing
  `).get() as any;
  res.json(stats);
});

export default router;
