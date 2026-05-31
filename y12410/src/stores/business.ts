import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { isEqual, differenceWith } from 'lodash-es'
import type {
  UserInfo,
  RawMaterial,
  FilmContract,
  BoxOfficeFlow,
  PromoExpense,
  SettlementResult,
  SettlementException,
  GuaranteeComparison,
  OperationLog,
  ImpactTrace,
  OperationType,
  DataSource,
  ExceptionType
} from '../types'
import { saveToStorage, loadFromStorage } from './index'

const STORAGE_KEYS = {
  currentUser: 'currentUser',
  rawMaterials: 'rawMaterials',
  contracts: 'contracts',
  boxOffices: 'boxOffices',
  expenses: 'expenses',
  settlements: 'settlements',
  operationLogs: 'operationLogs',
  impactTraces: 'impactTraces'
}

export const useBusinessStore = defineStore('business', () => {
  const currentUser = ref<UserInfo>(
    loadFromStorage<UserInfo>(STORAGE_KEYS.currentUser, {
      id: 'user_001',
      name: '财务人员',
      department: '影视发行财务部'
    })
  )

  const rawMaterials = ref<RawMaterial[]>(loadFromStorage<RawMaterial[]>(STORAGE_KEYS.rawMaterials, []))
  const contracts = ref<FilmContract[]>(loadFromStorage<FilmContract[]>(STORAGE_KEYS.contracts, []))
  const boxOffices = ref<BoxOfficeFlow[]>(loadFromStorage<BoxOfficeFlow[]>(STORAGE_KEYS.boxOffices, []))
  const expenses = ref<PromoExpense[]>(loadFromStorage<PromoExpense[]>(STORAGE_KEYS.expenses, []))
  const settlements = ref<SettlementResult[]>(loadFromStorage<SettlementResult[]>(STORAGE_KEYS.settlements, []))
  const operationLogs = ref<OperationLog[]>(loadFromStorage<OperationLog[]>(STORAGE_KEYS.operationLogs, []))
  const impactTraces = ref<ImpactTrace[]>(loadFromStorage<ImpactTrace[]>(STORAGE_KEYS.impactTraces, []))

  function generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  function now(): string {
    return dayjs().format('YYYY-MM-DD HH:mm:ss')
  }

  function persistAll(): void {
    saveToStorage(STORAGE_KEYS.currentUser, currentUser.value)
    saveToStorage(STORAGE_KEYS.rawMaterials, rawMaterials.value)
    saveToStorage(STORAGE_KEYS.contracts, contracts.value)
    saveToStorage(STORAGE_KEYS.boxOffices, boxOffices.value)
    saveToStorage(STORAGE_KEYS.expenses, expenses.value)
    saveToStorage(STORAGE_KEYS.settlements, settlements.value)
    saveToStorage(STORAGE_KEYS.operationLogs, operationLogs.value)
    saveToStorage(STORAGE_KEYS.impactTraces, impactTraces.value)
  }

  function logOperation(
    operationType: OperationType,
    entityType: string,
    entityId: string,
    entityName: string,
    beforeChange: Record<string, any> | null,
    afterChange: Record<string, any> | null,
    remark: string = ''
  ): void {
    const changedFields: string[] = []
    if (beforeChange && afterChange) {
      Object.keys(afterChange).forEach(key => {
        if (!isEqual(beforeChange[key], afterChange[key])) {
          changedFields.push(key)
        }
      })
    } else if (afterChange) {
      changedFields.push(...Object.keys(afterChange))
    } else if (beforeChange) {
      changedFields.push(...Object.keys(beforeChange))
    }

    const log: OperationLog = {
      id: generateId('log'),
      operationType,
      entityType,
      entityId,
      entityName,
      beforeChange: beforeChange ? { ...beforeChange } : null,
      afterChange: afterChange ? { ...afterChange } : null,
      changedFields,
      operator: { ...currentUser.value },
      operateAt: now(),
      ipAddress: '127.0.0.1',
      remark
    }

    operationLogs.value.unshift(log)
    persistAll()
  }

  function traceImpact(
    sourceEntity: string,
    sourceId: string,
    sourceField: string,
    targetEntity: string,
    targetId: string,
    targetField: string,
    impactType: 'value_change' | 'status_change' | 'exception_trigger',
    impactDescription: string
  ): void {
    const trace: ImpactTrace = {
      id: generateId('trace'),
      sourceEntity,
      sourceId,
      sourceField,
      targetEntity,
      targetId,
      targetField,
      impactType,
      impactDescription,
      createdAt: now(),
      createdBy: { ...currentUser.value }
    }
    impactTraces.value.push(trace)
    persistAll()
  }

  function createException(
    contractId: string,
    settlementId: string,
    type: ExceptionType,
    title: string,
    description: string,
    blockingPoint: string,
    nextAction: string,
    responsiblePerson: string,
    relatedDataIds: string[] = []
  ): SettlementException {
    const exception: SettlementException = {
      id: generateId('exc'),
      contractId,
      settlementId,
      type,
      title,
      description,
      triggeredBy: { ...currentUser.value },
      triggeredAt: now(),
      blockingPoint,
      nextAction,
      responsiblePerson,
      status: 'open',
      relatedDataIds
    }
    return exception
  }

  function importRawMaterial(
    sourceType: DataSource,
    fileName: string,
    fileSize: number,
    originalData: Record<string, any>[],
    remark: string = ''
  ): RawMaterial {
    const material: RawMaterial = {
      id: generateId('raw'),
      sourceType,
      fileName,
      fileSize,
      uploadTime: now(),
      uploader: { ...currentUser.value },
      originalData,
      processedCount: 0,
      remark
    }
    rawMaterials.value.unshift(material)
    logOperation('import', 'RawMaterial', material.id, fileName, null, material, `导入${sourceType === 'contract' ? '合同' : sourceType === 'boxoffice' ? '票房流水' : '宣发费用'}原始数据`)
    persistAll()
    return material
  }

  function processRawMaterial(
    materialId: string,
    targetType: DataSource,
    mapping: Record<string, string>
  ): { success: number; failed: number; errors: string[] } {
    const material = rawMaterials.value.find(m => m.id === materialId)
    if (!material) return { success: 0, failed: 0, errors: ['原始材料不存在'] }

    const errors: string[] = []
    let success = 0
    let failed = 0
    const beforeMaterial = { ...material }

    material.originalData.forEach((row, index) => {
      try {
        if (targetType === 'contract') {
          const contract: FilmContract = {
            id: generateId('con'),
            filmName: row[mapping.filmName] || '',
            contractNo: row[mapping.contractNo] || '',
            contractDate: row[mapping.contractDate] || '',
            distributor: row[mapping.distributor] || '',
            producer: row[mapping.producer] || '',
            guaranteeAmount: Number(row[mapping.guaranteeAmount]) || 0,
            guaranteeBoxOffice: Number(row[mapping.guaranteeBoxOffice]) || 0,
            producerShareRate: Number(row[mapping.producerShareRate]) || 0,
            distributorShareRate: Number(row[mapping.distributorShareRate]) || 0,
            promoBudget: Number(row[mapping.promoBudget]) || 0,
            settlementCycle: row[mapping.settlementCycle] || '月度',
            validFrom: row[mapping.validFrom] || '',
            validTo: row[mapping.validTo] || '',
            status: 'active',
            createdAt: now(),
            createdBy: { ...currentUser.value },
            updatedAt: now(),
            updatedBy: { ...currentUser.value },
            rawMaterialId: materialId,
            remark: ''
          }
          contracts.value.push(contract)
          logOperation('create', 'FilmContract', contract.id, contract.filmName, null, contract, `从原始材料${material.fileName}导入`)
          success++
        } else if (targetType === 'boxoffice') {
          const bo: BoxOfficeFlow = {
            id: generateId('bo'),
            contractId: findContractIdByName(row[mapping.filmName] || ''),
            filmName: row[mapping.filmName] || '',
            flowDate: row[mapping.flowDate] || '',
            cinemaName: row[mapping.cinemaName] || '',
            boxOfficeAmount: Number(row[mapping.boxOfficeAmount]) || 0,
            serviceFee: Number(row[mapping.serviceFee]) || 0,
            netBoxOffice: Number(row[mapping.netBoxOffice]) || Number(row[mapping.boxOfficeAmount]) - Number(row[mapping.serviceFee]),
            settlementPeriod: row[mapping.settlementPeriod] || '',
            status: 'pending',
            createdAt: now(),
            createdBy: { ...currentUser.value },
            updatedAt: now(),
            updatedBy: { ...currentUser.value },
            rawMaterialId: materialId,
            remark: ''
          }
          boxOffices.value.push(bo)
          logOperation('create', 'BoxOfficeFlow', bo.id, `${bo.filmName}-${bo.flowDate}`, null, bo, `从原始材料${material.fileName}导入`)
          success++
        } else if (targetType === 'expense') {
          const exp: PromoExpense = {
            id: generateId('exp'),
            contractId: findContractIdByName(row[mapping.filmName] || ''),
            filmName: row[mapping.filmName] || '',
            expenseDate: row[mapping.expenseDate] || '',
            expenseType: row[mapping.expenseType] || '',
            expenseItem: row[mapping.expenseItem] || '',
            amount: Number(row[mapping.amount]) || 0,
            bearer: (row[mapping.bearer] as any) || 'shared',
            shareRate: Number(row[mapping.shareRate]) || 50,
            settlementPeriod: row[mapping.settlementPeriod] || '',
            isDeducted: false,
            deductionPeriod: '',
            status: 'pending',
            createdAt: now(),
            createdBy: { ...currentUser.value },
            updatedAt: now(),
            updatedBy: { ...currentUser.value },
            rawMaterialId: materialId,
            remark: ''
          }
          expenses.value.push(exp)
          logOperation('create', 'PromoExpense', exp.id, `${exp.filmName}-${exp.expenseItem}`, null, exp, `从原始材料${material.fileName}导入`)
          success++
        }
      } catch (e: any) {
        failed++
        errors.push(`第${index + 1}行处理失败: ${e.message}`)
      }
    })

    material.processedCount = success
    logOperation('update', 'RawMaterial', material.id, material.fileName, beforeMaterial, material, `处理完成，成功${success}条，失败${failed}条`)
    persistAll()
    return { success, failed, errors }
  }

  function findContractIdByName(filmName: string): string {
    const contract = contracts.value.find(c => c.filmName === filmName)
    return contract?.id || ''
  }

  function createContract(data: Partial<FilmContract>): FilmContract {
    const contract: FilmContract = {
      id: generateId('con'),
      filmName: '',
      contractNo: '',
      contractDate: '',
      distributor: '',
      producer: '',
      guaranteeAmount: 0,
      guaranteeBoxOffice: 0,
      producerShareRate: 43,
      distributorShareRate: 57,
      promoBudget: 0,
      settlementCycle: '月度',
      validFrom: '',
      validTo: '',
      status: 'active',
      createdAt: now(),
      createdBy: { ...currentUser.value },
      updatedAt: now(),
      updatedBy: { ...currentUser.value },
      remark: '',
      ...data
    }
    contracts.value.unshift(contract)
    logOperation('create', 'FilmContract', contract.id, contract.filmName, null, contract, '手动创建合同')
    persistAll()
    return contract
  }

  function updateContract(id: string, updates: Partial<FilmContract>): boolean {
    const index = contracts.value.findIndex(c => c.id === id)
    if (index === -1) return false

    const before = { ...contracts.value[index] }
    const after = { ...before, ...updates, updatedAt: now(), updatedBy: { ...currentUser.value } }

    contracts.value[index] = after
    logOperation('update', 'FilmContract', id, after.filmName, before, after, '更新合同信息')

    const changedFields = Object.keys(updates).filter(k => !isEqual(before[k as keyof FilmContract], after[k as keyof FilmContract]))
    changedFields.forEach(field => {
      const relatedSettlements = settlements.value.filter(s => s.contractId === id)
      relatedSettlements.forEach(s => {
        traceImpact('FilmContract', id, field, 'SettlementResult', s.id, 'status', 'value_change',
          `合同${field}字段变更，可能影响分账结果`)
        if (s.status === 'success') {
          s.status = 'pending'
          s.updatedAt = now()
          s.updatedBy = { ...currentUser.value }
        }
      })
    })

    persistAll()
    return true
  }

  function createBoxOffice(data: Partial<BoxOfficeFlow>): BoxOfficeFlow {
    const bo: BoxOfficeFlow = {
      id: generateId('bo'),
      contractId: '',
      filmName: '',
      flowDate: '',
      cinemaName: '',
      boxOfficeAmount: 0,
      serviceFee: 0,
      netBoxOffice: 0,
      settlementPeriod: '',
      status: 'pending',
      createdAt: now(),
      createdBy: { ...currentUser.value },
      updatedAt: now(),
      updatedBy: { ...currentUser.value },
      remark: '',
      ...data
    }
    if (!bo.contractId && bo.filmName) {
      bo.contractId = findContractIdByName(bo.filmName)
    }
    if (bo.netBoxOffice === 0) {
      bo.netBoxOffice = bo.boxOfficeAmount - bo.serviceFee
    }
    boxOffices.value.unshift(bo)
    logOperation('create', 'BoxOfficeFlow', bo.id, `${bo.filmName}-${bo.flowDate}`, null, bo, '手动录入票房流水')
    persistAll()
    return bo
  }

  function updateBoxOffice(id: string, updates: Partial<BoxOfficeFlow>): boolean {
    const index = boxOffices.value.findIndex(b => b.id === id)
    if (index === -1) return false

    const before = { ...boxOffices.value[index] }
    const after = { ...before, ...updates, updatedAt: now(), updatedBy: { ...currentUser.value } }
    if (updates.boxOfficeAmount !== undefined || updates.serviceFee !== undefined) {
      after.netBoxOffice = after.boxOfficeAmount - after.serviceFee
    }

    boxOffices.value[index] = after
    logOperation('update', 'BoxOfficeFlow', id, `${after.filmName}-${after.flowDate}`, before, after, '更新票房流水')

    const changedFields = Object.keys(updates).filter(k => !isEqual(before[k as keyof BoxOfficeFlow], after[k as keyof BoxOfficeFlow]))
    changedFields.forEach(field => {
      if (['boxOfficeAmount', 'serviceFee', 'netBoxOffice', 'status'].includes(field) && after.contractId) {
        const relatedSettlements = settlements.value.filter(s => s.contractId === after.contractId)
        relatedSettlements.forEach(s => {
          traceImpact('BoxOfficeFlow', id, field, 'SettlementResult', s.id, 'totalNetBoxOffice', 'value_change',
            `票房流水${field}字段变更，影响分账计算`)
          if (s.status === 'success') {
            s.status = 'pending'
            s.updatedAt = now()
            s.updatedBy = { ...currentUser.value }
          }
        })
      }
    })

    persistAll()
    return true
  }

  function createExpense(data: Partial<PromoExpense>): PromoExpense {
    const exp: PromoExpense = {
      id: generateId('exp'),
      contractId: '',
      filmName: '',
      expenseDate: '',
      expenseType: '',
      expenseItem: '',
      amount: 0,
      bearer: 'shared',
      shareRate: 50,
      settlementPeriod: '',
      isDeducted: false,
      deductionPeriod: '',
      status: 'pending',
      createdAt: now(),
      createdBy: { ...currentUser.value },
      updatedAt: now(),
      updatedBy: { ...currentUser.value },
      remark: '',
      ...data
    }
    if (!exp.contractId && exp.filmName) {
      exp.contractId = findContractIdByName(exp.filmName)
    }
    expenses.value.unshift(exp)
    logOperation('create', 'PromoExpense', exp.id, `${exp.filmName}-${exp.expenseItem}`, null, exp, '手动录入宣发费用')
    persistAll()
    return exp
  }

  function updateExpense(id: string, updates: Partial<PromoExpense>): boolean {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index === -1) return false

    const before = { ...expenses.value[index] }
    const after = { ...before, ...updates, updatedAt: now(), updatedBy: { ...currentUser.value } }

    expenses.value[index] = after
    logOperation('update', 'PromoExpense', id, `${after.filmName}-${after.expenseItem}`, before, after, '更新宣发费用')

    const changedFields = Object.keys(updates).filter(k => !isEqual(before[k as keyof PromoExpense], after[k as keyof PromoExpense]))
    changedFields.forEach(field => {
      if (['amount', 'bearer', 'shareRate', 'status', 'isDeducted'].includes(field) && after.contractId) {
        const relatedSettlements = settlements.value.filter(s => s.contractId === after.contractId)
        relatedSettlements.forEach(s => {
          traceImpact('PromoExpense', id, field, 'SettlementResult', s.id, 'totalPromoExpense', 'value_change',
            `宣发费用${field}字段变更，影响分账计算`)
          if (s.status === 'success') {
            s.status = 'pending'
            s.updatedAt = now()
            s.updatedBy = { ...currentUser.value }
          }
        })
      }
    })

    persistAll()
    return true
  }

  function calculateGuaranteeComparison(
    contract: FilmContract,
    totalNetBoxOffice: number,
    period: string
  ): GuaranteeComparison {
    const producerShare = totalNetBoxOffice * (contract.producerShareRate / 100)
    const isAbove = producerShare >= contract.guaranteeAmount
    const comparison: GuaranteeComparison = {
      id: generateId('gc'),
      contractId: contract.id,
      calculationBasis: [
        `合同保底金额: ${contract.guaranteeAmount.toLocaleString()}元`,
        `净票房总额: ${totalNetBoxOffice.toLocaleString()}元`,
        `出品方分账比例: ${contract.producerShareRate}%`,
        `计算出品方分账: ${totalNetBoxOffice.toLocaleString()} × ${contract.producerShareRate}% = ${producerShare.toLocaleString()}元`,
        `比较: ${producerShare.toLocaleString()}元 ${isAbove ? '≥' : '<'} ${contract.guaranteeAmount.toLocaleString()}元`
      ],
      actualBoxOffice: totalNetBoxOffice,
      guaranteeBoxOffice: contract.guaranteeBoxOffice,
      guaranteeAmount: contract.guaranteeAmount,
      calculatedShare: producerShare,
      guaranteeComparison: isAbove ? 'above' : (producerShare === contract.guaranteeAmount ? 'equal' : 'below'),
      difference: producerShare - contract.guaranteeAmount,
      basisEvidence: [
        `合同编号: ${contract.contractNo}`,
        `保底条款: 出品方最低收益${contract.guaranteeAmount.toLocaleString()}元`,
        `计算周期: ${period}`
      ],
      createdAt: now(),
      calculatedBy: { ...currentUser.value }
    }
    return comparison
  }

  function calculateSettlement(contractId: string, period: string): SettlementResult {
    const contract = contracts.value.find(c => c.id === contractId)
    if (!contract) {
      throw new Error('合同不存在')
    }

    const periodBO = boxOffices.value.filter(b => b.contractId === contractId && b.settlementPeriod === period && b.status !== 'rejected')
    const periodExp = expenses.value.filter(e => e.contractId === contractId && e.settlementPeriod === period && e.status === 'approved')

    const exceptions: SettlementException[] = []
    const totalBoxOffice = periodBO.reduce((sum, b) => sum + b.boxOfficeAmount, 0)
    const totalNetBoxOffice = periodBO.reduce((sum, b) => sum + b.netBoxOffice, 0)

    if (totalNetBoxOffice === 0) {
      const exc = createException(
        contractId, '', 'settlement_failed',
        '分账计算失败',
        `结算周期${period}无有效票房数据`,
        '缺少本期票房流水或票房状态未确认',
        '请导入或确认本期票房流水数据',
        '票房数据岗',
        periodBO.filter(b => b.status === 'pending').map(b => b.id)
      )
      exceptions.push(exc)
    }

    const unapprovedExpenses = expenses.value.filter(e =>
      e.contractId === contractId && e.settlementPeriod === period && e.status === 'pending'
    )
    if (unapprovedExpenses.length > 0) {
      const exc = createException(
        contractId, '', 'promo_deduction',
        '宣发费用待审批',
        `有${unapprovedExpenses.length}笔宣发费用未审批，金额${unapprovedExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}元`,
        '宣发费用未审批，无法追扣',
        '请相关人员审批宣发费用',
        '宣发费用审批人',
        unapprovedExpenses.map(e => e.id)
      )
      exceptions.push(exc)
    }

    const crossPeriodExpenses = expenses.value.filter(e =>
      e.contractId === contractId && !e.isDeducted && e.settlementPeriod < period && e.status === 'approved'
    )
    if (crossPeriodExpenses.length > 0) {
      const exc = createException(
        contractId, '', 'cross_period_adjustment',
        '跨期宣发费用追扣',
        `发现${crossPeriodExpenses.length}笔前期未追扣宣发费用，金额${crossPeriodExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}元`,
        '前期宣发费用未及时追扣，需在本期补扣',
        '确认跨期费用追扣明细后继续计算',
        '财务核算岗',
        crossPeriodExpenses.map(e => e.id)
      )
      exceptions.push(exc)
    }

    const guaranteeComp = calculateGuaranteeComparison(contract, totalNetBoxOffice, period)

    if (guaranteeComp.guaranteeComparison === 'below') {
      const exc = createException(
        contractId, '', 'guarantee_shortfall',
        '保底未达标',
        `出品方实际分账${guaranteeComp.calculatedShare.toLocaleString()}元低于保底金额${contract.guaranteeAmount.toLocaleString()}元，差额${Math.abs(guaranteeComp.difference).toLocaleString()}元`,
        '票房未达保底，需按保底金额结算',
        '确认执行保底条款，按保底金额支付',
        '财务负责人',
        [contract.id, ...periodBO.map(b => b.id)]
      )
      exceptions.push(exc)
    }

    const actualShareBase = guaranteeComp.guaranteeComparison === 'below' ? contract.guaranteeAmount : guaranteeComp.calculatedShare
    const producerShare = actualShareBase
    const distributorShare = totalNetBoxOffice - actualShareBase

    const allDeductibleExp = [...periodExp, ...crossPeriodExpenses.filter(e => e.status === 'approved')]
    const totalPromoExpense = allDeductibleExp.reduce((sum, e) => sum + e.amount, 0)

    let producerPromoShare = 0
    let distributorPromoShare = 0
    allDeductibleExp.forEach(e => {
      if (e.bearer === 'producer') {
        producerPromoShare += e.amount
      } else if (e.bearer === 'distributor') {
        distributorPromoShare += e.amount
      } else {
        producerPromoShare += e.amount * (e.shareRate / 100)
        distributorPromoShare += e.amount * ((100 - e.shareRate) / 100)
      }
    })

    const actualPayable = producerShare - producerPromoShare

    const hasBlockingException = exceptions.some(e =>
      e.type === 'guarantee_shortfall' || e.type === 'settlement_failed'
    )

    const settlement: SettlementResult = {
      id: generateId('set'),
      contractId,
      filmName: contract.filmName,
      settlementPeriod: period,
      totalBoxOffice,
      totalNetBoxOffice,
      producerShare,
      distributorShare,
      totalPromoExpense,
      producerPromoShare,
      distributorPromoShare,
      guaranteeComparison: guaranteeComp,
      actualPayable,
      status: hasBlockingException ? 'blocked' : (exceptions.length > 0 ? 'pending' : 'success'),
      failureReason: exceptions.find(e => e.type === 'settlement_failed')?.description,
      exceptions: exceptions.map(e => ({ ...e, settlementId: '' })),
      createdAt: now(),
      createdBy: { ...currentUser.value },
      updatedAt: now(),
      updatedBy: { ...currentUser.value },
      calculatedAt: now(),
      calculatedBy: { ...currentUser.value },
      remark: ''
    }

    settlement.exceptions.forEach(e => { e.settlementId = settlement.id })

    settlements.value.unshift(settlement)
    logOperation('calculate', 'SettlementResult', settlement.id, `${settlement.filmName}-${period}`, null, settlement,
      hasBlockingException ? '计算完成但存在阻断性异常' : (exceptions.length > 0 ? '计算完成存在待处理事项' : '计算完成'))

    exceptions.forEach(e => {
      traceImpact('SettlementCalculation', settlement.id, e.type, 'SettlementResult', settlement.id, 'status',
        'exception_trigger', e.title)
    })

    persistAll()
    return settlement
  }

  function resolveException(
    exceptionId: string,
    settlementId: string,
    resolution: string
  ): boolean {
    const settlement = settlements.value.find(s => s.id === settlementId)
    if (!settlement) return false

    const exc = settlement.exceptions.find(e => e.id === exceptionId)
    if (!exc) return false

    const before = { ...exc }
    exc.status = 'resolved'
    exc.resolvedAt = now()
    exc.resolvedBy = { ...currentUser.value }
    exc.resolution = resolution

    logOperation('status_change', 'SettlementException', exceptionId, exc.title, before, exc, resolution)
    traceImpact('User', currentUser.value.id, 'resolve', 'SettlementException', exceptionId, 'status',
      'status_change', `异常已处理: ${resolution}`)

    const remainingExceptions = settlement.exceptions.filter(e =>
      e.status === 'open' && (e.type === 'guarantee_shortfall' || e.type === 'settlement_failed')
    )

    if (remainingExceptions.length === 0) {
      const pendingExceptions = settlement.exceptions.filter(e => e.status === 'open')
      settlement.status = pendingExceptions.length > 0 ? 'pending' : 'success'
      settlement.updatedAt = now()
      settlement.updatedBy = { ...currentUser.value }
      logOperation('status_change', 'SettlementResult', settlementId, settlement.filmName,
        { status: before.status }, { status: settlement.status },
        `异常处理后状态变更为${settlement.status}`)
    }

    persistAll()
    return true
  }

  function recalculateSettlement(settlementId: string): SettlementResult | null {
    const settlement = settlements.value.find(s => s.id === settlementId)
    if (!settlement) return null

    const before = { ...settlement }
    const newResult = calculateSettlement(settlement.contractId, settlement.settlementPeriod)

    const index = settlements.value.findIndex(s => s.id === settlementId)
    if (index !== -1) {
      settlements.value.splice(index, 1)
    }

    logOperation('calculate', 'SettlementResult', newResult.id, `${newResult.filmName}-${newResult.settlementPeriod}`,
      before, newResult, '重新计算分账结果')

    traceImpact('User', currentUser.value.id, 'recalculate', 'SettlementResult', newResult.id, 'status',
      'value_change', '用户触发重新计算')

    return newResult
  }

  function generateSettlementLetter(settlementId: string): string {
    const s = settlements.value.find(s => s.id === settlementId)
    const contract = contracts.value.find(c => c.id === s?.contractId)
    if (!s || !contract) return ''

    const guaranteeStatus = s.guaranteeComparison.guaranteeComparison === 'below'
      ? `本期票房未达保底，按保底金额${contract.guaranteeAmount.toLocaleString()}元结算`
      : `本期票房达标，按实际分账${s.producerShare.toLocaleString()}元结算`

    const promoDetail = s.totalPromoExpense > 0
      ? `\n宣发费用追扣说明：\n- 本期宣发费用总额：${s.totalPromoExpense.toLocaleString()}元\n- 出品方承担：${s.producerPromoShare.toLocaleString()}元\n- 发行方承担：${s.distributorPromoShare.toLocaleString()}元`
      : ''

    const exceptionNotes = s.exceptions.filter(e => e.status !== 'resolved').length > 0
      ? `\n\n待处理事项：\n${s.exceptions.filter(e => e.status !== 'resolved').map((e, i) => `${i + 1}. ${e.title}：${e.description}\n   卡点：${e.blockingPoint}\n   下一步：${e.nextAction}`).join('\n')}`
      : ''

    return `
══════════════════════════════════════════════════════════════
                    电影分账结算函
══════════════════════════════════════════════════════════════

【影片信息】
影片名称：${s.filmName}
合同编号：${contract.contractNo}
签订日期：${contract.contractDate}
出品方：${contract.producer}
发行方：${contract.distributor}

【结算信息】
结算周期：${s.settlementPeriod}
核算日期：${dayjs().format('YYYY年MM月DD日')}

【票房数据】
本期总票房：${s.totalBoxOffice.toLocaleString()}元
扣除服务费后净票房：${s.totalNetBoxOffice.toLocaleString()}元

【保底条款执行说明】
${guaranteeStatus}

出品方分账比例：${contract.producerShareRate}%
发行方分账比例：${contract.distributorShareRate}%
出品方应得分账：${s.producerShare.toLocaleString()}元
发行方应得分账：${s.distributorShare.toLocaleString()}元
${promoDetail}

【最终结算】
出品方应得分账：${s.producerShare.toLocaleString()}元
减：出品方承担宣发费用：${s.producerPromoShare.toLocaleString()}元
─────────────────────────────────────
出品方实际应得款项：${s.actualPayable.toLocaleString()}元

【计算依据】
${s.guaranteeComparison.calculationBasis.map((b, i) => `${i + 1}. ${b}`).join('\n')}
${exceptionNotes}

【备注】
${s.remark || '无'}

══════════════════════════════════════════════════════════════
                    财务核算确认
══════════════════════════════════════════════════════════════

核算人：${currentUser.value.name}
部门：${currentUser.value.department}
日期：${dayjs().format('YYYY年MM月DD日')}

`.trim()
  }

  function exportLetter(settlementId: string): void {
    const letter = generateSettlementLetter(settlementId)
    const s = settlements.value.find(s => s.id === settlementId)
    if (!s) return

    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `【${s.filmName}】${s.settlementPeriod}分账结算函.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    logOperation('export', 'SettlementResult', settlementId, `${s.filmName}-${s.settlementPeriod}`,
      null, { letter }, '导出资结算函')
  }

  function getDataByRawMaterial(materialId: string): {
    contracts: FilmContract[]
    boxOffices: BoxOfficeFlow[]
    expenses: PromoExpense[]
  } {
    return {
      contracts: contracts.value.filter(c => c.rawMaterialId === materialId),
      boxOffices: boxOffices.value.filter(b => b.rawMaterialId === materialId),
      expenses: expenses.value.filter(e => e.rawMaterialId === materialId)
    }
  }

  function getEntityTraces(entityId: string): ImpactTrace[] {
    return impactTraces.value.filter(t =>
      t.sourceId === entityId || t.targetId === entityId
    ).sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf())
  }

  function getEntityLogs(entityId: string): OperationLog[] {
    return operationLogs.value.filter(l => l.entityId === entityId)
      .sort((a, b) => dayjs(b.operateAt).valueOf() - dayjs(a.operateAt).valueOf())
  }

  const pendingSettlements = computed(() =>
    settlements.value.filter(s => s.status === 'pending' || s.status === 'blocked')
  )

  const openExceptions = computed(() => {
    const result: { settlement: SettlementResult; exception: SettlementException }[] = []
    settlements.value.forEach(s => {
      s.exceptions.filter(e => e.status === 'open').forEach(e => {
        result.push({ settlement: s, exception: e })
      })
    })
    return result
  })

  const stats = computed(() => ({
    contractCount: contracts.value.length,
    boxOfficeCount: boxOffices.value.length,
    expenseCount: expenses.value.length,
    settlementCount: settlements.value.length,
    pendingSettlementCount: pendingSettlements.value.length,
    openExceptionCount: openExceptions.value.length,
    totalBoxOfficeAmount: boxOffices.value.reduce((s, b) => s + b.boxOfficeAmount, 0),
    totalPayable: settlements.value.filter(s => s.status === 'success').reduce((s, r) => s + r.actualPayable, 0)
  }))

  return {
    currentUser,
    rawMaterials,
    contracts,
    boxOffices,
    expenses,
    settlements,
    operationLogs,
    impactTraces,
    pendingSettlements,
    openExceptions,
    stats,
    importRawMaterial,
    processRawMaterial,
    createContract,
    updateContract,
    createBoxOffice,
    updateBoxOffice,
    createExpense,
    updateExpense,
    calculateSettlement,
    recalculateSettlement,
    resolveException,
    generateSettlementLetter,
    exportLetter,
    getDataByRawMaterial,
    getEntityTraces,
    getEntityLogs,
    logOperation,
    traceImpact,
    persistAll
  }
})
