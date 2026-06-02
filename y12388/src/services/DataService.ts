import dayjs from 'dayjs'
import * as XLSX from 'xlsx'
import {
  Registration,
  Material,
  Repertoire,
  Payment,
  Document,
  TeacherNote,
  HistoryRecord,
  Snapshot,
  FilterOptions,
  DiffResult,
  RegistrationStatus,
  AnomalyType,
} from '@/types'
import {
  getById,
  getAll,
  add,
  put,
  update,
  getByIndex,
  bulkPut,
  count,
} from '@/db'

const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const dataService = {
  async getRegistrations(filter?: FilterOptions): Promise<Registration[]> {
    let registrations = await getAll('registrations')

    if (filter) {
      if (filter.keyword) {
        const keyword = filter.keyword.toLowerCase()
        registrations = registrations.filter(
          (r) =>
            r.studentName.toLowerCase().includes(keyword) ||
            r.idNumber.includes(keyword) ||
            r.phone.includes(keyword) ||
            r.guideTeacher.toLowerCase().includes(keyword)
        )
      }

      if (filter.status) {
        registrations = registrations.filter((r) => r.status === filter.status)
      }

      if (filter.examLevel) {
        registrations = registrations.filter((r) => r.examLevel === filter.examLevel)
      }

      if (filter.anomalyType) {
        registrations = registrations.filter((r) => r.anomalies.includes(filter.anomalyType))
      }

      if (filter.startDate) {
        registrations = registrations.filter((r) => r.createdAt >= filter.startDate)
      }

      if (filter.endDate) {
        registrations = registrations.filter((r) => r.createdAt <= filter.endDate)
      }
    }

    return registrations.sort((a, b) =>
      dayjs(b.createdAt).isAfter(dayjs(a.createdAt)) ? 1 : -1
    )
  },

  async getRegistration(id: string): Promise<Registration | null> {
    const result = await getById('registrations', id)
    return result || null
  },

  async createRegistration(data: Partial<Registration>): Promise<Registration> {
    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss')
    const registration: Registration = {
      id: generateUUID(),
      studentName: data.studentName || '',
      gender: data.gender || 'male',
      idNumber: data.idNumber || '',
      examLevel: data.examLevel || '5',
      guideTeacher: data.guideTeacher || '',
      phone: data.phone || '',
      status: data.status || RegistrationStatus.PENDING,
      anomalies: data.anomalies || [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    }

    await add('registrations', registration)

    await this.addHistoryRecord({
      registrationId: registration.id,
      operator: '系统',
      action: '创建报名记录',
      newValue: `学生：${registration.studentName}`,
    })

    await this.createSnapshot(registration.id, 1, '初始创建')

    return registration
  },

  async updateRegistration(
    id: string,
    data: Partial<Registration>,
    operator: string,
    reason: string
  ): Promise<Registration> {
    const existing = await getById('registrations', id)
    if (!existing) {
      throw new Error('报名记录不存在')
    }

    const newVersion = existing.version + 1
    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss')
    const updates: Partial<Registration> = {
      ...data,
      version: newVersion,
      updatedAt: now,
    }

    await update('registrations', id, updates)
    const updated = (await getById('registrations', id))!

    const changedFields = Object.keys(data).filter(
      (key) => JSON.stringify(existing[key as keyof Registration]) !== JSON.stringify(data[key as keyof Registration])
    )

    if (changedFields.length > 0) {
      await this.addHistoryRecord({
        registrationId: id,
        operator,
        action: reason,
        oldValue: changedFields.map((f) => `${f}: ${existing[f as keyof Registration]}`).join('; '),
        newValue: changedFields.map((f) => `${f}: ${data[f as keyof Registration]}`).join('; '),
      })

      const fullData = await this.getFullRegistrationData(id)
      await this.createSnapshotWithData(id, newVersion, reason, fullData)
    }

    return updated
  },

  async getFullRegistrationData(id: string): Promise<Record<string, unknown>> {
    const registration = await this.getRegistration(id)
    const materials = await this.getMaterials(id)
    const repertoires = await this.getRepertoires(id)
    const payment = await this.getPayment(id)
    const documents = await this.getDocuments(id)
    const teacherNotes = await this.getTeacherNotes(id)

    return {
      registration,
      materials,
      repertoires,
      payment,
      documents,
      teacherNotes,
    }
  },

  async getMaterials(registrationId: string): Promise<Material[]> {
    return getByIndex('materials', 'registrationId', registrationId)
  },

  async updateMaterial(id: string, data: Partial<Material>): Promise<Material> {
    await update('materials', id, data)
    const updated = await getById('materials', id)
    if (!updated) {
      throw new Error('材料记录不存在')
    }
    return updated
  },

  async getRepertoires(registrationId: string): Promise<Repertoire[]> {
    return getByIndex('repertoires', 'registrationId', registrationId)
  },

  async compareRepertoires(
    registrationId: string
  ): Promise<{ matched: boolean; differences: string[] }> {
    const repertoires = await this.getRepertoires(registrationId)
    const applicationRepertoires = repertoires.filter((r) => r.source === 'application')
    const actualRepertoires = repertoires.filter((r) => r.source === 'actual')
    const differences: string[] = []

    applicationRepertoires.forEach((appR, idx) => {
      const actualR = actualRepertoires[idx]
      if (!actualR) {
        differences.push(`曲目 ${idx + 1}: 缺少实际演奏版本`)
        return
      }
      if (appR.name !== actualR.name) {
        differences.push(`曲目 ${idx + 1}: 报名《${appR.name}》vs 实际《${actualR.name}》`)
      }
      if (appR.version !== actualR.version) {
        differences.push(`曲目 ${idx + 1}版本: ${appR.version} vs ${actualR.version}`)
      }
    })

    return {
      matched: differences.length === 0,
      differences,
    }
  },

  async getPayment(registrationId: string): Promise<Payment | null> {
    const results = await getByIndex('payments', 'registrationId', registrationId)
    return results[0] || null
  },

  async confirmPayment(id: string, actualDate: string): Promise<Payment> {
    const payment = await getById('payments', id)
    if (!payment) {
      throw new Error('缴费记录不存在')
    }

    const isLate = dayjs(actualDate).isAfter(dayjs(payment.expectedDate))
    const updates: Partial<Payment> = {
      actualDate,
      status: 'paid',
      isLate,
    }

    if (isLate) {
      const lateDays = dayjs(actualDate).diff(dayjs(payment.expectedDate), 'day')
      updates.lateFee = Math.floor(payment.amount * 0.05 * Math.min(lateDays / 7, 4))
    }

    await update('payments', id, updates)
    return (await getById('payments', id))!
  },

  async getDocuments(registrationId: string): Promise<Document[]> {
    return getByIndex('documents', 'registrationId', registrationId)
  },

  async getTeacherNotes(registrationId: string): Promise<TeacherNote[]> {
    const notes = await getByIndex('teacherNotes', 'registrationId', registrationId)
    return notes.sort((a, b) => (dayjs(a.createdAt).isAfter(dayjs(b.createdAt)) ? 1 : -1))
  },

  async addTeacherNote(
    registrationId: string,
    note: Omit<TeacherNote, 'id' | 'registrationId' | 'createdAt'>
  ): Promise<TeacherNote> {
    const teacherNote: TeacherNote = {
      id: generateUUID(),
      registrationId,
      teacherName: note.teacherName,
      content: note.content,
      evidenceType: note.evidenceType,
      isContradictory: note.isContradictory,
      createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    }

    await add('teacherNotes', teacherNote)

    await this.addHistoryRecord({
      registrationId,
      operator: note.teacherName,
      action: '添加老师备注',
      newValue: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
    })

    return teacherNote
  },

  async getHistory(registrationId: string): Promise<HistoryRecord[]> {
    const records = await getByIndex('historyRecords', 'registrationId', registrationId)
    return records.sort((a, b) => (dayjs(a.createdAt).isAfter(dayjs(b.createdAt)) ? 1 : -1))
  },

  async addHistoryRecord(
    record: Omit<HistoryRecord, 'id' | 'createdAt'>
  ): Promise<HistoryRecord> {
    const historyRecord: HistoryRecord = {
      id: generateUUID(),
      registrationId: record.registrationId,
      operator: record.operator,
      action: record.action,
      oldValue: record.oldValue,
      newValue: record.newValue,
      createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    }

    await add('historyRecords', historyRecord)
    return historyRecord
  },

  async getSnapshots(registrationId: string): Promise<Snapshot[]> {
    const snapshots = await getByIndex('snapshots', 'registrationId', registrationId)
    return snapshots.sort((a, b) => b.version - a.version)
  },

  async createSnapshot(
    registrationId: string,
    version: number,
    reason: string
  ): Promise<Snapshot> {
    const data = await this.getFullRegistrationData(registrationId)
    return this.createSnapshotWithData(registrationId, version, reason, data)
  },

  async createSnapshotWithData(
    registrationId: string,
    version: number,
    reason: string,
    data: Record<string, unknown>
  ): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: generateUUID(),
      registrationId,
      version,
      data,
      reason,
      createdAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
    }

    await add('snapshots', snapshot)
    return snapshot
  },

  async getSnapshotDiff(
    snapshotId1: string,
    snapshotId2: string
  ): Promise<DiffResult[]> {
    const s1 = await getById('snapshots', snapshotId1)
    const s2 = await getById('snapshots', snapshotId2)

    if (!s1 || !s2) {
      throw new Error('快照不存在')
    }

    const diffs: DiffResult[] = []
    const compareObjects = (
      obj1: Record<string, unknown>,
      obj2: Record<string, unknown>,
      prefix: string = ''
    ) => {
      const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)])

      allKeys.forEach((key) => {
        const path = prefix ? `${prefix}.${key}` : key
        const val1 = obj1[key]
        const val2 = obj2[key]

        if (val1 === undefined && val2 !== undefined) {
          diffs.push({ field: path, oldValue: undefined, newValue: val2, changeType: 'added' })
        } else if (val1 !== undefined && val2 === undefined) {
          diffs.push({ field: path, oldValue: val1, newValue: undefined, changeType: 'removed' })
        } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
          compareObjects(val1 as Record<string, unknown>, val2 as Record<string, unknown>, path)
        } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
          diffs.push({ field: path, oldValue: val1, newValue: val2, changeType: 'modified' })
        }
      })
    }

    compareObjects(s1.data, s2.data)
    return diffs
  },

  async exportToExcel(ids?: string[]): Promise<Blob> {
    let registrations = await this.getRegistrations()
    if (ids && ids.length > 0) {
      registrations = registrations.filter((r) => ids.includes(r.id))
    }

    const rows = registrations.map((r) => ({
      '学生姓名': r.studentName,
      '性别': r.gender === 'male' ? '男' : '女',
      '身份证号': r.idNumber,
      '报考级别': r.examLevel + '级',
      '指导老师': r.guideTeacher,
      '联系电话': r.phone,
      '报名状态': getStatusText(r.status),
      '异常标记': r.anomalies.map((a) => getAnomalyText(a)).join('、') || '无',
      '提交时间': dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
      '版本号': r.version,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '报名列表')

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  },

  async exportAnomalyReport(filter?: FilterOptions): Promise<Blob> {
    const registrations = await this.getRegistrations(filter)
    const anomalyRegistrations = registrations.filter((r) => r.anomalies.length > 0)

    const anomalyStats: Record<string, number> = {}
    anomalyRegistrations.forEach((r) => {
      r.anomalies.forEach((a) => {
        anomalyStats[a] = (anomalyStats[a] || 0) + 1
      })
    })

    const summaryRows = Object.entries(anomalyStats).map(([type, count]) => ({
      '异常类型': getAnomalyText(type as AnomalyType),
      '数量': count,
      '占比': ((count / anomalyRegistrations.length) * 100).toFixed(1) + '%',
    }))

    const detailRows = anomalyRegistrations.map((r) => ({
      '学生姓名': r.studentName,
      '报考级别': r.examLevel + '级',
      '指导老师': r.guideTeacher,
      '异常类型': r.anomalies.map((a) => getAnomalyText(a)).join('、'),
      '报名状态': getStatusText(r.status),
      '提交时间': dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
    }))

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(wb, ws1, '异常统计')
    const ws2 = XLSX.utils.json_to_sheet(detailRows)
    XLSX.utils.book_append_sheet(wb, ws2, '异常明细')

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    return new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  },

  async generateAuditReport(
    id: string
  ): Promise<{ html: string; plainText: string; title: string }> {
    const registration = await this.getRegistration(id)
    if (!registration) {
      throw new Error('报名记录不存在')
    }

    const repertoires = await this.getRepertoires(id)
    const payment = await this.getPayment(id)
    const documents = await this.getDocuments(id)
    const teacherNotes = await this.getTeacherNotes(id)
    const { differences: repertoireDiffs } = await this.compareRepertoires(id)

    const statusText = getStatusText(registration.status)
    const reasons: string[] = []
    const suggestions: string[] = []

    if (registration.anomalies.includes(AnomalyType.REPERTOIRE_MISMATCH)) {
      const appReps = repertoires.filter((r) => r.source === 'application')
      const actualReps = repertoires.filter((r) => r.source === 'actual')
      reasons.push(
        `【曲目版本不符】报名曲目《${appReps[0]?.name || '-'}》(${appReps[0]?.version || '-'})与实际提交《${actualReps[0]?.name || '-'}》(${actualReps[0]?.version || '-'})不一致。具体差异：${repertoireDiffs.join('；')}`
      )
      suggestions.push('请确认学生实际演奏的曲目，并与指导老师核对是否需要更换报考曲目或补充说明材料。')
    }

    if (registration.anomalies.includes(AnomalyType.PAYMENT_LATE)) {
      reasons.push(
        `【缴费未按时到账】应缴费用 ${payment?.amount || 0} 元，应到账日期为 ${payment?.expectedDate || '-'}，实际到账日期为 ${payment?.actualDate || '尚未到账'}。${payment?.lateFee ? `产生滞纳金 ${payment.lateFee} 元。` : ''}`
      )
      suggestions.push(
        '请联系学生家长确认缴费情况，如已缴费请提供缴费凭证；如未缴费请提醒尽快缴纳，避免影响考试资格。'
      )
    }

    if (registration.anomalies.includes(AnomalyType.DOCUMENT_MISSING)) {
      const missingDocs = documents.filter((d) => d.isMissing || d.status === 'missing')
      const missingNames = missingDocs
        .map((d) => getDocumentTypeName(d.type))
        .join('、')
      reasons.push(`【证件材料不完整】缺少以下证件：${missingNames}。`)
      suggestions.push('请尽快补充缺失的证件材料，所有证件必须在有效期内。')
    }

    if (registration.anomalies.includes(AnomalyType.TEACHER_CONTRADICTION)) {
      const contradictoryNotes = teacherNotes.filter((n) => n.isContradictory)
      reasons.push(
        `【存在老师补充说明】有 ${contradictoryNotes.length} 条老师备注与系统结论不一致，需要人工复核确认。`
      )
      suggestions.push('请仔细阅读老师备注内容，结合实际情况做出判断。')
    }

    const title = `考级报名审核报告 - ${registration.studentName}`

    const plainText = `
${title}
${'='.repeat(50)}

一、学生基本信息
----------------
学生姓名：${registration.studentName}
性别：${registration.gender === 'male' ? '男' : '女'}
身份证号：${registration.idNumber}
报考级别：${registration.examLevel}级
指导老师：${registration.guideTeacher}
联系电话：${registration.phone}
报名时间：${dayjs(registration.createdAt).format('YYYY年MM月DD日 HH:mm')}

二、审核结论
----------------
审核状态：${statusText}

三、问题说明
----------------
${reasons.length > 0 ? reasons.map((r, i) => `${i + 1}. ${r}`).join('\n\n') : '无异常'}

四、处理建议
----------------
${suggestions.length > 0 ? suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n\n') : '报名材料齐全，审核通过，请安排后续考试事宜。'}

五、老师备注
----------------
${teacherNotes.length > 0 ? teacherNotes.map((n, i) => `${i + 1}. [${n.teacherName}] ${dayjs(n.createdAt).format('YYYY-MM-DD HH:mm')}\n   ${n.content}`).join('\n\n') : '暂无老师备注'}

---
报告生成时间：${dayjs().format('YYYY年MM月DD日 HH:mm')}
审核系统：乐器考级报名审核工作台
`.trim()

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
    h1 { color: #1E3A5F; border-bottom: 3px solid #1E3A5F; padding-bottom: 15px; }
    h2 { color: #2D5A4C; margin-top: 30px; border-left: 4px solid #2D5A4C; padding-left: 12px; }
    .section { margin: 20px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-item { padding: 8px 0; }
    .info-label { font-weight: 600; color: #666; }
    .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; background: ${getBadgeColor(registration.status)}; color: white; }
    .reason-box { background: #FFFBEB; border-left: 4px solid #F6E05E; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .suggestion-box { background: #F0F4F8; border-left: 4px solid #1E3A5F; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .note-box { background: #F7FAFC; border: 1px solid #E2E8F0; padding: 15px; margin: 10px 0; border-radius: 4px; }
    .note-header { color: #4A5568; font-size: 14px; margin-bottom: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #718096; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${title}</h1>

  <div class="section">
    <h2>一、学生基本信息</h2>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">学生姓名：</span>${registration.studentName}</div>
      <div class="info-item"><span class="info-label">性别：</span>${registration.gender === 'male' ? '男' : '女'}</div>
      <div class="info-item"><span class="info-label">身份证号：</span>${registration.idNumber}</div>
      <div class="info-item"><span class="info-label">报考级别：</span>${registration.examLevel}级</div>
      <div class="info-item"><span class="info-label">指导老师：</span>${registration.guideTeacher}</div>
      <div class="info-item"><span class="info-label">联系电话：</span>${registration.phone}</div>
      <div class="info-item"><span class="info-label">报名时间：</span>${dayjs(registration.createdAt).format('YYYY年MM月DD日 HH:mm')}</div>
    </div>
  </div>

  <div class="section">
    <h2>二、审核结论</h2>
    <p><span class="status-badge">${statusText}</span></p>
  </div>

  <div class="section">
    <h2>三、问题说明</h2>
    ${reasons.length > 0 ? reasons.map((r) => `<div class="reason-box">${r}</div>`).join('') : '<p>无异常</p>'}
  </div>

  <div class="section">
    <h2>四、处理建议</h2>
    ${suggestions.length > 0 ? suggestions.map((s) => `<div class="suggestion-box">${s}</div>`).join('') : '<p>报名材料齐全，审核通过，请安排后续考试事宜。</p>'}
  </div>

  <div class="section">
    <h2>五、老师备注</h2>
    ${teacherNotes.length > 0 ? teacherNotes.map((n) => `
      <div class="note-box">
        <div class="note-header">
          <strong>${n.teacherName}</strong> · ${dayjs(n.createdAt).format('YYYY年MM月DD日 HH:mm')}
          ${n.isContradictory ? '<span style="color: #C53030; margin-left: 10px;">⚠ 与系统结论不一致</span>' : ''}
        </div>
        <div>${n.content}</div>
      </div>
    `).join('') : '<p>暂无老师备注</p>'}
  </div>

  <div class="footer">
    <p>报告生成时间：${dayjs().format('YYYY年MM月DD日 HH:mm')}</p>
    <p>审核系统：乐器考级报名审核工作台</p>
  </div>
</body>
</html>
`.trim()

    return { html, plainText, title }
  },

  async exportAllData(): Promise<unknown> {
    const [registrations, materials, repertoires, payments, documents, teacherNotes, historyRecords, snapshots] = await Promise.all([
      getAll('registrations'),
      getAll('materials'),
      getAll('repertoires'),
      getAll('payments'),
      getAll('documents'),
      getAll('teacherNotes'),
      getAll('historyRecords'),
      getAll('snapshots'),
    ])

    return {
      version: 1,
      exportedAt: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
      data: {
        registrations,
        materials,
        repertoires,
        payments,
        documents,
        teacherNotes,
        historyRecords,
        snapshots,
      },
    }
  },

  async importAllData(importData: unknown): Promise<void> {
    if (typeof importData !== 'object' || importData === null) {
      throw new Error('无效的备份文件格式')
    }

    const dataObj = importData as { data?: Record<string, unknown[]> }
    if (!dataObj.data) {
      throw new Error('无效的备份文件格式')
    }

    const { registrations, materials, repertoires, payments, documents, teacherNotes, historyRecords, snapshots } = dataObj.data

    await Promise.all([
      bulkPut('registrations', (registrations || []) as Registration[]),
      bulkPut('materials', (materials || []) as Material[]),
      bulkPut('repertoires', (repertoires || []) as Repertoire[]),
      bulkPut('payments', (payments || []) as Payment[]),
      bulkPut('documents', (documents || []) as Document[]),
      bulkPut('teacherNotes', (teacherNotes || []) as TeacherNote[]),
      bulkPut('historyRecords', (historyRecords || []) as HistoryRecord[]),
      bulkPut('snapshots', (snapshots || []) as Snapshot[]),
    ])
  },

  async getStats() {
    const registrations = await this.getRegistrations()
    const total = registrations.length
    const passed = registrations.filter((r) => r.status === RegistrationStatus.PASSED).length
    const hasAnomalies = registrations.filter((r) => r.anomalies.length > 0).length

    const anomalyStats: Record<string, number> = {}
    registrations.forEach((r) => {
      r.anomalies.forEach((a) => {
        anomalyStats[a] = (anomalyStats[a] || 0) + 1
      })
    })

    return {
      total,
      passed,
      pending: registrations.filter((r) => r.status === RegistrationStatus.PENDING || r.status === RegistrationStatus.REVIEWING).length,
      hasAnomalies,
      anomalyStats,
      byLevel: registrations.reduce((acc, r) => {
        acc[r.examLevel] = (acc[r.examLevel] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    }
  },
}

function getStatusText(status: RegistrationStatus): string {
  const statusMap: Record<RegistrationStatus, string> = {
    [RegistrationStatus.PENDING]: '待审核',
    [RegistrationStatus.MATERIALS_INCOMPLETE]: '材料不齐',
    [RegistrationStatus.REVIEWING]: '审核中',
    [RegistrationStatus.REPERTOIRE_MISMATCH]: '曲目不符',
    [RegistrationStatus.PAYMENT_LATE]: '缴费晚到',
    [RegistrationStatus.DOCUMENT_MISSING]: '证件缺失',
    [RegistrationStatus.PASSED]: '审核通过',
    [RegistrationStatus.REJECTED]: '审核驳回',
    [RegistrationStatus.SUPPLEMENT]: '待补充材料',
  }
  return statusMap[status] || status
}

function getAnomalyText(type: AnomalyType): string {
  const anomalyMap: Record<AnomalyType, string> = {
    [AnomalyType.REPERTOIRE_MISMATCH]: '曲目版本不符',
    [AnomalyType.PAYMENT_LATE]: '缴费晚到',
    [AnomalyType.DOCUMENT_MISSING]: '证件缺失',
    [AnomalyType.TEACHER_CONTRADICTION]: '老师补充说明',
    [AnomalyType.MATERIAL_INCOMPLETE]: '材料不完整',
  }
  return anomalyMap[type] || type
}

function getDocumentTypeName(type: string): string {
  const nameMap: Record<string, string> = {
    id_card: '身份证',
    previous_certificate: '上一级考级证书',
    photo: '证件照片',
    other: '其他证明材料',
  }
  return nameMap[type] || type
}

function getBadgeColor(status: RegistrationStatus): string {
  const colorMap: Record<RegistrationStatus, string> = {
    [RegistrationStatus.PASSED]: '#2D5A4C',
    [RegistrationStatus.PENDING]: '#D69E2E',
    [RegistrationStatus.REVIEWING]: '#334E68',
    [RegistrationStatus.REPERTOIRE_MISMATCH]: '#FF7A45',
    [RegistrationStatus.PAYMENT_LATE]: '#FF7A45',
    [RegistrationStatus.DOCUMENT_MISSING]: '#FF7A45',
    [RegistrationStatus.REJECTED]: '#C53030',
    [RegistrationStatus.MATERIALS_INCOMPLETE]: '#D69E2E',
    [RegistrationStatus.SUPPLEMENT]: '#D69E2E',
  }
  return colorMap[status] || '#666'
}
