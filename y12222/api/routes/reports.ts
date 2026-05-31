import { Router, Request, Response } from 'express'
import db from '../db/database.js'

const router = Router()

router.get('/', (req: Request, res: Response) => {
  res.json({ success: true, data: db.reports.getAll() })
})

router.post('/generate', (req: Request, res: Response) => {
  const { title, date_range_start, date_range_end, project_filter, includes, operator } = req.body
  
  const report = db.reports.create({
    title: title || '社区基金支出报告',
    date_range_start,
    date_range_end,
    project_filter: project_filter || null,
    includes: includes || {
      expenditures: true,
      invoices: true,
      duplicates: true,
      approvals: true,
      delays: true,
      disclosures: true
    }
  })
  
  db.audit_logs.create({
    entity_type: 'disclosure',
    entity_id: report.id,
    action: 'create',
    old_value: null,
    new_value: JSON.stringify(report),
    operator: operator || '系统',
    impact_description: `生成报告：${report.title}`
  })
  
  res.json({ success: true, data: report })
})

router.get('/:id/download', (req: Request, res: Response) => {
  const report = db.reports.getById(req.params.id)
  if (!report) {
    return res.status(404).json({ success: false, error: '报告不存在' })
  }
  
  const allExpenditures = db.expenditures.getAll()
  const allInvoices = db.invoices.getAll()
  const allApprovals = db.approvals.getAll()
  const allOpinions = db.opinions.getAll()
  const allDelays = db.delays.getAll()
  const allDisclosures = db.disclosures.getAll()
  
  const expenditures = allExpenditures.filter(e => {
    const createdAt = new Date(e.created_at)
    return (!report.date_range_start || createdAt >= new Date(report.date_range_start)) &&
           (!report.date_range_end || createdAt <= new Date(report.date_range_end)) &&
           (!report.project_filter || e.project_name.includes(report.project_filter))
  })
  
  const expenditureIds = expenditures.map(e => e.id)
  
  const totalAmount = expenditures.reduce((sum, e) => sum + e.amount, 0)
  const invoices = allInvoices.filter(i => expenditureIds.includes(i.expenditure_id))
  const duplicates = invoices.filter(i => i.duplicate_status === 'confirmed' || i.duplicate_status === 'suspected')
  const approvals = allApprovals.filter(a => expenditureIds.includes(a.expenditure_id))
  const missingPages = approvals.filter(a => a.status === 'page_missing')
  const delays = allDelays.filter(d => expenditureIds.includes(d.expenditure_id))
  const opinions = allOpinions.filter(o => expenditureIds.includes(o.expenditure_id))
  const disclosures = allDisclosures.filter(d => expenditureIds.includes(d.expenditure_id))
  
  let content = `═══════════════════════════════════════════════════\n`
  content += `           社区基金支出公示报告\n`
  content += `═══════════════════════════════════════════════════\n\n`
  content += `报告编号: ${report.id}\n`
  content += `报告标题: ${report.title}\n`
  content += `生成时间: ${new Date().toLocaleString('zh-CN')}\n`
  if (report.date_range_start) content += `起始日期: ${report.date_range_start}\n`
  if (report.date_range_end) content += `截止日期: ${report.date_range_end}\n`
  if (report.project_filter) content += `项目筛选: ${report.project_filter}\n`
  content += `\n`
  
  content += `───────────────────────────────────────────────────\n`
  content += `                    汇总数据\n`
  content += `───────────────────────────────────────────────────\n\n`
  content += `支出申请总数: ${expenditures.length} 项\n`
  content += `支出总金额: ¥${totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}\n`
  content += `关联发票数: ${invoices.length} 张\n`
  content += `审批记录数: ${approvals.length} 条\n`
  content += `居民意见数: ${opinions.length} 条\n`
  content += `公示记录数: ${disclosures.length} 条\n\n`
  
  content += `───────────────────────────────────────────────────\n`
  content += `                  异常情况汇总\n`
  content += `───────────────────────────────────────────────────\n\n`
  content += `重复发票: ${duplicates.length} 张\n`
  content += `审批缺页: ${missingPages.length} 条\n`
  content += `项目延期: ${delays.length} 项\n\n`
  
  if (report.includes.expenditures && expenditures.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                  支出申请明细\n`
    content += `───────────────────────────────────────────────────\n\n`
    expenditures.forEach((e, idx) => {
      content += `【${idx + 1}】${e.title}\n`
      content += `    项目名称: ${e.project_name}\n`
      content += `    申请金额: ¥${e.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}\n`
      content += `    申请人: ${e.applicant} (${e.applicant_role})\n`
      content += `    状态: ${getStatusText(e.status)}\n`
      content += `    描述: ${e.description || '无'}\n`
      content += `    创建时间: ${new Date(e.created_at).toLocaleString('zh-CN')}\n`
      content += `\n`
    })
  }
  
  if (report.includes.invoices && invoices.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                    发票记录\n`
    content += `───────────────────────────────────────────────────\n\n`
    invoices.forEach((inv, idx) => {
      const expenditure = expenditures.find(e => e.id === inv.expenditure_id)
      content += `【${idx + 1}】发票号: ${inv.invoice_number}\n`
      content += `    开票方: ${inv.vendor}\n`
      content += `    金额: ¥${inv.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}\n`
      content += `    开票日期: ${inv.invoice_date}\n`
      content += `    关联支出: ${expenditure?.title || '未知'}\n`
      content += `    重复状态: ${getDuplicateStatusText(inv.duplicate_status)}\n`
      content += `    凭证校验: ${getVerifyStatusText(inv.verification_status)}\n`
      if (inv.duplicate_of) {
        const origInv = allInvoices.find(i => i.id === inv.duplicate_of)
        content += `    原始发票: ${origInv?.invoice_number || inv.duplicate_of}\n`
      }
      content += `\n`
    })
  }
  
  if (report.includes.duplicates && duplicates.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                ⚠️  重复发票说明\n`
    content += `───────────────────────────────────────────────────\n\n`
    duplicates.forEach((inv, idx) => {
      const expenditure = expenditures.find(e => e.id === inv.expenditure_id)
      content += `【${idx + 1}】${inv.invoice_number}\n`
      content += `    状态: ${getDuplicateStatusText(inv.duplicate_status)}\n`
      content += `    金额: ¥${inv.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}\n`
      content += `    开票方: ${inv.vendor}\n`
      content += `    关联支出: ${expenditure?.title || '未知'}\n`
      if (inv.duplicate_of) {
        const origInv = allInvoices.find(i => i.id === inv.duplicate_of)
        content += `    重复于: ${origInv?.invoice_number || inv.duplicate_of}\n`
      }
      content += `\n`
    })
  }
  
  if (report.includes.approvals && approvals.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                    审批记录\n`
    content += `───────────────────────────────────────────────────\n\n`
    approvals.forEach((a, idx) => {
      const expenditure = expenditures.find(e => e.id === a.expenditure_id)
      content += `【${idx + 1}】第${a.step_order}级审批\n`
      content += `    关联支出: ${expenditure?.title || '未知'}\n`
      content += `    审批人: ${a.approver} (${a.approver_role})\n`
      content += `    状态: ${getApprovalStatusText(a.status)}\n`
      if (a.comments) content += `    意见: ${a.comments}\n`
      if (a.page_number) content += `    页码: ${a.page_number}\n`
      if (a.approved_at) content += `    审批时间: ${new Date(a.approved_at).toLocaleString('zh-CN')}\n`
      content += `\n`
    })
  }
  
  if (missingPages.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                ⚠️  审批缺页说明\n`
    content += `───────────────────────────────────────────────────\n\n`
    missingPages.forEach((a, idx) => {
      const expenditure = expenditures.find(e => e.id === a.expenditure_id)
      content += `【${idx + 1}】第${a.step_order}级审批缺页\n`
      content += `    关联支出: ${expenditure?.title || '未知'}\n`
      content += `    审批人: ${a.approver}\n`
      content += `    说明: ${a.comments || '未填写'}\n`
      content += `\n`
    })
  }
  
  if (report.includes.delays && delays.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                ⚠️  项目延期说明\n`
    content += `───────────────────────────────────────────────────\n\n`
    delays.forEach((d, idx) => {
      const expenditure = expenditures.find(e => e.id === d.expenditure_id)
      content += `【${idx + 1}】${expenditure?.title || '未知项目'}\n`
      content += `    原截止日期: ${d.original_deadline}\n`
      content += `    新截止日期: ${d.new_deadline}\n`
      content += `    延期原因: ${d.reason}\n`
      if (d.impact_description) content += `    影响说明: ${d.impact_description}\n`
      content += `\n`
    })
  }
  
  if (report.includes.disclosures && disclosures.length > 0) {
    content += `───────────────────────────────────────────────────\n`
    content += `                    公示记录\n`
    content += `───────────────────────────────────────────────────\n\n`
    disclosures.forEach((d, idx) => {
      const expenditure = expenditures.find(e => e.id === d.expenditure_id)
      content += `【${idx + 1}】${expenditure?.title || '未知'}\n`
      content += `    状态: ${getDisclosureStatusText(d.status)}\n`
      content += `    公示日期: ${d.disclosure_date} 至 ${d.end_date}\n`
      if (d.public_notice_content) content += `    公示内容: ${d.public_notice_content}\n`
      content += `\n`
    })
  }
  
  content += `═══════════════════════════════════════════════════\n`
  content += `                    报告结束\n`
  content += `═══════════════════════════════════════════════════\n`
  
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(report.title)}.txt"`)
  res.send(content)
})

function getStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    reviewing: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    delayed: '已延期'
  }
  return map[status] || status
}

function getDuplicateStatusText(status: string): string {
  const map: Record<string, string> = {
    none: '无',
    suspected: '疑似重复',
    confirmed: '确认为重复',
    dismissed: '已排除'
  }
  return map[status] || status
}

function getVerifyStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待校验',
    verified: '校验通过',
    failed: '校验失败'
  }
  return map[status] || status
}

function getApprovalStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    page_missing: '缺页待补'
  }
  return map[status] || status
}

function getDisclosureStatusText(status: string): string {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '公示中',
    ended: '已结束'
  }
  return map[status] || status
}

export default router
