import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import type {
  DatabaseSchema,
  ExpenditureApplication,
  Invoice,
  ApprovalRecord,
  ResidentOpinion,
  ProjectDelay,
  DisclosureRecord,
  AuditLog,
  ExportReport
} from '../../shared/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_DIR = path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DB_DIR, 'database.json')

export class Database {
  private static instance: Database
  private data: DatabaseSchema

  private constructor() {
    this.ensureDbDir()
    this.data = this.loadData()
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  private ensureDbDir(): void {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true })
    }
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8')
        return JSON.parse(raw)
      } catch (e) {
        console.error('Failed to load database, using empty:', e)
      }
    }
    return this.getEmptySchema()
  }

  private getEmptySchema(): DatabaseSchema {
    return {
      expenditures: [],
      invoices: [],
      approvals: [],
      opinions: [],
      delays: [],
      disclosures: [],
      audit_logs: [],
      reports: []
    }
  }

  private save(): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8')
  }

  public async reset(): Promise<void> {
    this.data = this.getEmptySchema()
    this.save()
  }

  public async seed(): Promise<void> {
    const now = new Date().toISOString()
    const e1: ExpenditureApplication = {
      id: uuidv4(),
      title: '小区绿化改造工程',
      amount: 58000,
      project_name: '2026年小区环境提升项目',
      applicant: '张建国',
      applicant_role: '物业主任',
      status: 'pending_review',
      description: '对小区公共绿地进行升级改造，包括苗木更新、灌溉系统安装等',
      created_at: now,
      updated_at: now
    }
    const e2: ExpenditureApplication = {
      id: uuidv4(),
      title: '健身器材采购',
      amount: 32000,
      project_name: '2026年小区环境提升项目',
      applicant: '李为民',
      applicant_role: '业委会副主任',
      status: 'approved',
      description: '为小区广场添置户外健身器材6套',
      created_at: now,
      updated_at: now
    }
    const e3: ExpenditureApplication = {
      id: uuidv4(),
      title: '监控系统升级',
      amount: 45000,
      project_name: '2026年小区安全建设项目',
      applicant: '王平安',
      applicant_role: '物业安保主管',
      status: 'delayed',
      description: '新增高清摄像头20台，升级存储设备',
      created_at: now,
      updated_at: now
    }
    this.data.expenditures = [e1, e2, e3]

    const i1: Invoice = {
      id: uuidv4(),
      invoice_number: 'INV-2026-0001',
      amount: 28000,
      vendor: '绿景园林工程有限公司',
      invoice_date: '2026-05-15',
      expenditure_id: e1.id,
      is_duplicate: false,
      duplicate_of: null,
      duplicate_status: 'none',
      verification_status: 'verified',
      created_at: now
    }
    const i2: Invoice = {
      id: uuidv4(),
      invoice_number: 'INV-2026-0002',
      amount: 30000,
      vendor: '绿景园林工程有限公司',
      invoice_date: '2026-05-18',
      expenditure_id: e1.id,
      is_duplicate: false,
      duplicate_of: null,
      duplicate_status: 'none',
      verification_status: 'pending',
      created_at: now
    }
    const i3: Invoice = {
      id: uuidv4(),
      invoice_number: 'INV-2026-0001',
      amount: 28000,
      vendor: '绿景园林工程有限公司',
      invoice_date: '2026-05-15',
      expenditure_id: e2.id,
      is_duplicate: true,
      duplicate_of: i1.id,
      duplicate_status: 'confirmed',
      verification_status: 'pending',
      created_at: now
    }
    const i4: Invoice = {
      id: uuidv4(),
      invoice_number: 'INV-2026-0003',
      amount: 32000,
      vendor: '康体健身器材厂',
      invoice_date: '2026-05-20',
      expenditure_id: e2.id,
      is_duplicate: false,
      duplicate_of: null,
      duplicate_status: 'none',
      verification_status: 'verified',
      created_at: now
    }
    const i5: Invoice = {
      id: uuidv4(),
      invoice_number: 'INV-2026-0004',
      amount: 45000,
      vendor: '安视科技有限公司',
      invoice_date: '2026-05-10',
      expenditure_id: e3.id,
      is_duplicate: false,
      duplicate_of: null,
      duplicate_status: 'none',
      verification_status: 'pending',
      created_at: now
    }
    this.data.invoices = [i1, i2, i3, i4, i5]

    const a1: ApprovalRecord = {
      id: uuidv4(),
      expenditure_id: e1.id,
      approver: '赵主任',
      approver_role: '居委会主任',
      step_order: 1,
      status: 'approved',
      comments: '同意',
      page_number: 'A001',
      is_complete: true,
      approved_at: now,
      created_at: now
    }
    const a2: ApprovalRecord = {
      id: uuidv4(),
      expenditure_id: e1.id,
      approver: '钱会计',
      approver_role: '街道财务',
      step_order: 2,
      status: 'pending',
      comments: '',
      page_number: null,
      is_complete: false,
      approved_at: null,
      created_at: now
    }
    const a3: ApprovalRecord = {
      id: uuidv4(),
      expenditure_id: e2.id,
      approver: '赵主任',
      approver_role: '居委会主任',
      step_order: 1,
      status: 'approved',
      comments: '符合采购标准',
      page_number: 'A002',
      is_complete: true,
      approved_at: now,
      created_at: now
    }
    const a4: ApprovalRecord = {
      id: uuidv4(),
      expenditure_id: e2.id,
      approver: '钱会计',
      approver_role: '街道财务',
      step_order: 2,
      status: 'approved',
      comments: '发票齐全，金额无误',
      page_number: 'A003',
      is_complete: true,
      approved_at: now,
      created_at: now
    }
    const a5: ApprovalRecord = {
      id: uuidv4(),
      expenditure_id: e3.id,
      approver: '赵主任',
      approver_role: '居委会主任',
      step_order: 1,
      status: 'page_missing',
      comments: '缺少第3页审批附件',
      page_number: 'A004',
      is_complete: false,
      approved_at: null,
      created_at: now
    }
    this.data.approvals = [a1, a2, a3, a4, a5]

    const o1: ResidentOpinion = {
      id: uuidv4(),
      expenditure_id: e1.id,
      resident_name: '孙大妈',
      opinion: '支持绿化改造，希望多种点开花的树',
      source_type: 'onsite',
      approval_id: null,
      created_at: now
    }
    const o2: ResidentOpinion = {
      id: uuidv4(),
      expenditure_id: e2.id,
      resident_name: '周大爷',
      opinion: '健身器材选得好，我们老年人很需要',
      source_type: 'written',
      approval_id: a3.id,
      created_at: now
    }
    this.data.opinions = [o1, o2]

    const d1: ProjectDelay = {
      id: uuidv4(),
      expenditure_id: e3.id,
      original_deadline: '2026-05-30',
      new_deadline: '2026-06-30',
      reason: '设备供应商产能不足，交货延期',
      impact_description: '导致监控安装整体延后，需重新协调施工时间',
      created_at: now
    }
    this.data.delays = [d1]

    const dis1: DisclosureRecord = {
      id: uuidv4(),
      expenditure_id: e2.id,
      disclosure_date: '2026-05-20',
      end_date: '2026-06-03',
      status: 'published',
      public_notice_content: '健身器材采购项目已审批通过，现公示15天。如有异议请向业委会反映。',
      created_at: now,
      updated_at: now
    }
    this.data.disclosures = [dis1]

    const al1: AuditLog = {
      id: uuidv4(),
      entity_type: 'invoice',
      entity_id: i3.id,
      action: 'duplicate_confirm',
      old_value: '{"duplicate_status":"suspected"}',
      new_value: '{"duplicate_status":"confirmed"}',
      operator: '系统自动检测',
      impact_description: '发票 INV-2026-0001 被确认为重复发票，关联原始发票记录',
      created_at: now
    }
    const al2: AuditLog = {
      id: uuidv4(),
      entity_type: 'expenditure',
      entity_id: e3.id,
      action: 'status_change',
      old_value: '{"status":"reviewing"}',
      new_value: '{"status":"delayed"}',
      operator: '张建国',
      impact_description: '项目标记为延期，原截止日期2026-05-30，新截止日期2026-06-30',
      created_at: now
    }
    const al3: AuditLog = {
      id: uuidv4(),
      entity_type: 'approval',
      entity_id: a5.id,
      action: 'status_change',
      old_value: '{"status":"pending"}',
      new_value: '{"status":"page_missing"}',
      operator: '赵主任',
      impact_description: '审批标记为缺页状态，缺少第3页审批附件',
      created_at: now
    }
    this.data.audit_logs = [al1, al2, al3]

    this.save()
  }

  get expenditures() {
    return {
      getAll: () => [...this.data.expenditures],
      getById: (id: string) => this.data.expenditures.find(e => e.id === id),
      create: (item: Omit<ExpenditureApplication, 'id' | 'created_at' | 'updated_at'>) => {
        const now = new Date().toISOString()
        const newItem: ExpenditureApplication = { ...item, id: uuidv4(), created_at: now, updated_at: now }
        this.data.expenditures.push(newItem)
        this.save()
        return newItem
      },
      update: (id: string, updates: Partial<ExpenditureApplication>) => {
        const idx = this.data.expenditures.findIndex(e => e.id === id)
        if (idx === -1) return null
        this.data.expenditures[idx] = { ...this.data.expenditures[idx], ...updates, updated_at: new Date().toISOString() }
        this.save()
        return this.data.expenditures[idx]
      },
      delete: (id: string) => {
        const idx = this.data.expenditures.findIndex(e => e.id === id)
        if (idx === -1) return false
        this.data.expenditures.splice(idx, 1)
        this.save()
        return true
      }
    }
  }

  get invoices() {
    return {
      getAll: () => [...this.data.invoices],
      getById: (id: string) => this.data.invoices.find(e => e.id === id),
      getByExpenditureId: (expId: string) => this.data.invoices.filter(e => e.expenditure_id === expId),
      findDuplicates: (invoiceNumber: string, amount: number, vendor: string) => 
        this.data.invoices.filter(i => 
          i.invoice_number === invoiceNumber && 
          Math.abs(i.amount - amount) < 0.01 && 
          i.vendor === vendor
        ),
      create: (item: Omit<Invoice, 'id' | 'created_at'>) => {
        const now = new Date().toISOString()
        const newItem: Invoice = { ...item, id: uuidv4(), created_at: now }
        this.data.invoices.push(newItem)
        this.save()
        return newItem
      },
      update: (id: string, updates: Partial<Invoice>) => {
        const idx = this.data.invoices.findIndex(e => e.id === id)
        if (idx === -1) return null
        this.data.invoices[idx] = { ...this.data.invoices[idx], ...updates }
        this.save()
        return this.data.invoices[idx]
      },
      delete: (id: string) => {
        const idx = this.data.invoices.findIndex(e => e.id === id)
        if (idx === -1) return false
        this.data.invoices.splice(idx, 1)
        this.save()
        return true
      }
    }
  }

  get approvals() {
    return {
      getAll: () => [...this.data.approvals],
      getById: (id: string) => this.data.approvals.find(e => e.id === id),
      getByExpenditureId: (expId: string) => this.data.approvals.filter(e => e.expenditure_id === expId),
      create: (item: Omit<ApprovalRecord, 'id' | 'created_at'>) => {
        const now = new Date().toISOString()
        const newItem: ApprovalRecord = { ...item, id: uuidv4(), created_at: now }
        this.data.approvals.push(newItem)
        this.save()
        return newItem
      },
      update: (id: string, updates: Partial<ApprovalRecord>) => {
        const idx = this.data.approvals.findIndex(e => e.id === id)
        if (idx === -1) return null
        this.data.approvals[idx] = { ...this.data.approvals[idx], ...updates }
        this.save()
        return this.data.approvals[idx]
      }
    }
  }

  get opinions() {
    return {
      getAll: () => [...this.data.opinions],
      getByExpenditureId: (expId: string) => this.data.opinions.filter(e => e.expenditure_id === expId),
      create: (item: Omit<ResidentOpinion, 'id' | 'created_at'>) => {
        const now = new Date().toISOString()
        const newItem: ResidentOpinion = { ...item, id: uuidv4(), created_at: now }
        this.data.opinions.push(newItem)
        this.save()
        return newItem
      }
    }
  }

  get delays() {
    return {
      getAll: () => [...this.data.delays],
      getByExpenditureId: (expId: string) => this.data.delays.filter(e => e.expenditure_id === expId),
      create: (item: Omit<ProjectDelay, 'id' | 'created_at'>) => {
        const now = new Date().toISOString()
        const newItem: ProjectDelay = { ...item, id: uuidv4(), created_at: now }
        this.data.delays.push(newItem)
        this.save()
        return newItem
      }
    }
  }

  get disclosures() {
    return {
      getAll: () => [...this.data.disclosures],
      getById: (id: string) => this.data.disclosures.find(e => e.id === id),
      getByExpenditureId: (expId: string) => this.data.disclosures.filter(e => e.expenditure_id === expId),
      create: (item: Omit<DisclosureRecord, 'id' | 'created_at' | 'updated_at'>) => {
        const now = new Date().toISOString()
        const newItem: DisclosureRecord = { ...item, id: uuidv4(), created_at: now, updated_at: now }
        this.data.disclosures.push(newItem)
        this.save()
        return newItem
      },
      update: (id: string, updates: Partial<DisclosureRecord>) => {
        const idx = this.data.disclosures.findIndex(e => e.id === id)
        if (idx === -1) return null
        this.data.disclosures[idx] = { ...this.data.disclosures[idx], ...updates, updated_at: new Date().toISOString() }
        this.save()
        return this.data.disclosures[idx]
      }
    }
  }

  get audit_logs() {
    return {
      getAll: () => [...this.data.audit_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      getByEntity: (type: string, entityId: string) => 
        this.data.audit_logs.filter(e => e.entity_type === type && e.entity_id === entityId),
      create: (item: Omit<AuditLog, 'id' | 'created_at'>) => {
        const now = new Date().toISOString()
        const newItem: AuditLog = { ...item, id: uuidv4(), created_at: now }
        this.data.audit_logs.push(newItem)
        this.save()
        return newItem
      }
    }
  }

  get reports() {
    return {
      getAll: () => [...this.data.reports],
      getById: (id: string) => this.data.reports.find(e => e.id === id),
      create: (item: Omit<ExportReport, 'id' | 'created_at'>) => {
        const now = new Date().toISOString()
        const newItem: ExportReport = { ...item, id: uuidv4(), created_at: now }
        this.data.reports.push(newItem)
        this.save()
        return newItem
      }
    }
  }
}

export default Database.getInstance()
