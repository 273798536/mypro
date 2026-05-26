import {
  checkNameChange,
  checkCrossDate,
  checkAmountConflict,
  checkQuantityConflict,
  checkMissingFields,
  validateRecord
} from '../services/dataValidator'
import { CONFIG } from '../config'

function runTests() {
  console.log('=== 🧪 数据校验单元测试 ===\n')

  let passed = 0
  let failed = 0

  function test(name: string, fn: () => boolean) {
    try {
      const result = fn()
      if (result) {
        console.log(`✅ ${name}`)
        passed++
      } else {
        console.log(`❌ ${name}`)
        failed++
      }
    } catch (e: any) {
      console.log(`❌ ${name} - ${e.message}`)
      failed++
    }
  }

  test('checkNameChange: 张三 -> 李四 应返回 true', () => {
    return checkNameChange('张三', '李四') === true
  })

  test('checkNameChange: 张三 -> 张三 应返回 false', () => {
    return checkNameChange('张三', '张三') === false
  })

  test('checkNameChange: 空值比较应返回 false', () => {
    return checkNameChange(undefined, '李四') === false &&
           checkNameChange('张三', undefined) === false
  })

  test('checkCrossDate: 不同日期应返回 true', () => {
    return checkCrossDate(new Date('2026-05-20'), new Date('2026-05-24')) === true
  })

  test('checkCrossDate: 相同日期应返回 false', () => {
    return checkCrossDate(new Date('2026-05-24'), new Date('2026-05-24')) === false
  })

  test('checkAmountConflict: 金额差异大于0.01应返回 true', () => {
    return checkAmountConflict(100, 100.02) === true
  })

  test('checkAmountConflict: 金额差异小于等于0.01应返回 false', () => {
    return checkAmountConflict(100, 100.005) === false
  })

  test('checkQuantityConflict: 数量不同应返回 true', () => {
    return checkQuantityConflict(1, 2) === true
  })

  test('checkQuantityConflict: 数量相同应返回 false', () => {
    return checkQuantityConflict(5, 5) === false
  })

  test('checkMissingFields: recharge类型缺memberId应检测到', () => {
    const missing = checkMissingFields({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: '',
      amount: 100,
      transactionDate: new Date()
    } as any)
    return missing.includes('memberId')
  })

  console.log('\n=== 集成测试: validateRecord 带上下文 ===\n')

  test('validateRecord: 无上下文时跨日数据应返回 valid=true', () => {
    const result = validateRecord({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: 'M001',
      memberName: '张三',
      amount: 500,
      transactionDate: new Date('2026-05-20')
    })
    return result.isValid === true
  })

  test('validateRecord: 有批次日期上下文时跨日应检测到 cross_date', () => {
    const result = validateRecord({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: 'M001',
      memberName: '张三',
      amount: 500,
      transactionDate: new Date('2026-05-20')
    }, {
      batchDate: new Date('2026-05-24')
    })
    return result.isValid === false && result.dirtyType === CONFIG.DIRTY_TYPES.CROSS_DATE
  })

  test('validateRecord: 有历史记录时名称变更应检测到 name_changed', () => {
    const result = validateRecord({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: 'M001',
      memberName: '李四',
      amount: 500,
      transactionDate: new Date('2026-05-24')
    }, {
      batchDate: new Date('2026-05-24'),
      existingRecord: {
        memberName: '张三',
        amount: 500
      }
    })
    return result.isValid === false && result.dirtyType === CONFIG.DIRTY_TYPES.NAME_CHANGED
  })

  test('validateRecord: 有历史记录时金额冲突应检测到 amount_conflict', () => {
    const result = validateRecord({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: 'M001',
      memberName: '张三',
      amount: 1000,
      transactionDate: new Date('2026-05-24')
    }, {
      batchDate: new Date('2026-05-24'),
      existingRecord: {
        memberName: '张三',
        amount: 500
      }
    })
    return result.isValid === false && result.dirtyType === CONFIG.DIRTY_TYPES.AMOUNT_CONFLICT
  })

  test('validateRecord: 缺失必填字段应检测到 missing_fields', () => {
    const result = validateRecord({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: '',
      amount: 500,
      transactionDate: new Date('2026-05-24')
    } as any, {
      batchDate: new Date('2026-05-24')
    })
    return result.isValid === false && result.dirtyType === CONFIG.DIRTY_TYPES.MISSING_FIELDS
  })

  test('validateRecord: 完全正常数据应返回 valid=true', () => {
    const result = validateRecord({
      recordType: CONFIG.RECORD_TYPES.RECHARGE,
      storeId: 'store-001',
      memberId: 'M001',
      memberName: '张三',
      amount: 500,
      transactionDate: new Date('2026-05-24')
    }, {
      batchDate: new Date('2026-05-24'),
      existingRecord: {
        memberName: '张三',
        amount: 500
      }
    })
    return result.isValid === true
  })

  console.log(`\n=== 测试结果: ${passed} 通过, ${failed} 失败 ===`)
  return failed === 0
}

if (require.main === module) {
  const success = runTests()
  process.exit(success ? 0 : 1)
}

export { runTests }
