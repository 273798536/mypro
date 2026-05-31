import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

export const useReconciliationStore = defineStore('reconciliation', () => {
  const dataSources = ref([])
  const cardAccounts = ref([])
  const rechargeRecords = ref([])
  const consumptionRecords = ref([])
  const refundRecords = ref([])
  const cardMergeHistory = ref([])
  const fundCollectionRecords = ref([])
  const differenceExplanations = ref([])
  const reportHistory = ref([])

  const currentDataSourceVersion = computed(() => {
    const versions = dataSources.value.map(d => d.version)
    return versions.length > 0 ? Math.max(...versions) : 0
  })

  const totalRechargeAmount = computed(() => {
    return rechargeRecords.value
      .filter(r => !r.isMerged)
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  })

  const totalConsumptionAmount = computed(() => {
    return consumptionRecords.value
      .filter(r => !r.isMerged)
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  })

  const totalRefundAmount = computed(() => {
    return refundRecords.value
      .filter(r => !r.isMerged)
      .reduce((sum, r) => sum + (r.amount || 0), 0)
  })

  const accountBalance = computed(() => {
    return cardAccounts.value
      .filter(a => !a.isMerged)
      .reduce((sum, a) => sum + (a.balance || 0), 0)
  })

  const theoreticalBalance = computed(() => {
    return totalRechargeAmount.value - totalConsumptionAmount.value - totalRefundAmount.value
  })

  const currentDifference = computed(() => {
    return accountBalance.value - theoreticalBalance.value
  })

  const hasActiveCollection = computed(() => {
    return fundCollectionRecords.value.some(r => r.status === 'active')
  })

  const activeCollection = computed(() => {
    return fundCollectionRecords.value.find(r => r.status === 'active') || null
  })

  function addDataSource(type, fileName, records) {
    const version = currentDataSourceVersion.value + 1
    const source = {
      id: `ds_${Date.now()}`,
      type,
      fileName,
      version,
      importTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      recordCount: records.length
    }
    dataSources.value.push(source)

    records.forEach(r => {
      r.dataSourceId = source.id
      r.dataSourceVersion = version
      r.importTime = source.importTime
    })

    return source
  }

  function addCardAccounts(accounts, fileName) {
    const source = addDataSource('card_account', fileName, accounts)
    accounts.forEach(a => {
      a.id = a.id || `ca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      a.isMerged = false
      cardAccounts.value.push(a)
    })
    return source
  }

  function addRechargeRecords(records, fileName) {
    const source = addDataSource('recharge', fileName, records)
    records.forEach(r => {
      r.id = r.id || `rr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      r.isMerged = false
      rechargeRecords.value.push(r)
    })
    return source
  }

  function addConsumptionRecords(records, fileName) {
    const source = addDataSource('consumption', fileName, records)
    records.forEach(r => {
      r.id = r.id || `cr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      r.isMerged = false
      consumptionRecords.value.push(r)
    })
    return source
  }

  function addRefundRecords(records, fileName) {
    const source = addDataSource('refund', fileName, records)
    records.forEach(r => {
      r.id = r.id || `rf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      r.isMerged = false
      refundRecords.value.push(r)
    })
    return source
  }

  function mergeCards(targetCardNo, sourceCardNos, reason) {
    const mergeRecord = {
      id: `merge_${Date.now()}`,
      targetCardNo,
      sourceCardNos,
      reason,
      mergeTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      version: currentDataSourceVersion.value
    }
    cardMergeHistory.value.push(mergeRecord)

    sourceCardNos.forEach(cardNo => {
      const account = cardAccounts.value.find(a => a.cardNo === cardNo)
      if (account) {
        account.isMerged = true
        account.mergedTo = targetCardNo
        account.mergeId = mergeRecord.id
      }

      rechargeRecords.value
        .filter(r => r.cardNo === cardNo)
        .forEach(r => {
          r.isMerged = true
          r.mergedTo = targetCardNo
          r.mergeId = mergeRecord.id
        })

      consumptionRecords.value
        .filter(r => r.cardNo === cardNo)
        .forEach(r => {
          r.isMerged = true
          r.mergedTo = targetCardNo
          r.mergeId = mergeRecord.id
        })

      refundRecords.value
        .filter(r => r.cardNo === cardNo)
        .forEach(r => {
          r.isMerged = true
          r.mergedTo = targetCardNo
          r.mergeId = mergeRecord.id
        })
    })

    return mergeRecord
  }

  function triggerFundCollection(amount, operator, remark) {
    const collection = {
      id: `fc_${Date.now()}`,
      amount,
      operator,
      remark,
      status: 'active',
      triggerTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      balanceBefore: accountBalance.value,
      rechargeBefore: totalRechargeAmount.value,
      consumptionBefore: totalConsumptionAmount.value,
      refundBefore: totalRefundAmount.value
    }
    fundCollectionRecords.value.push(collection)
    return collection
  }

  function completeFundCollection(collectionId) {
    const collection = fundCollectionRecords.value.find(r => r.id === collectionId)
    if (collection) {
      collection.status = 'completed'
      collection.completeTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
    }
  }

  function addDifferenceExplanation(difference, explanation, operator, relatedRecords) {
    const record = {
      id: `de_${Date.now()}`,
      difference,
      explanation,
      operator,
      relatedRecords: relatedRecords || [],
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      hasCollection: hasActiveCollection.value,
      collectionId: activeCollection.value?.id || null
    }
    differenceExplanations.value.push(record)
    return record
  }

  function saveReport(report) {
    const record = {
      id: `report_${Date.now()}`,
      ...report,
      createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      hasCollection: hasActiveCollection.value,
      collectionId: activeCollection.value?.id || null
    }
    reportHistory.value.push(record)
    return record
  }

  function getMergeHistoryByCard(cardNo) {
    return cardMergeHistory.value.filter(
      m => m.targetCardNo === cardNo || m.sourceCardNos.includes(cardNo)
    )
  }

  function getDataSourceById(id) {
    return dataSources.value.find(d => d.id === id)
  }

  function clearAllData() {
    dataSources.value = []
    cardAccounts.value = []
    rechargeRecords.value = []
    consumptionRecords.value = []
    refundRecords.value = []
    cardMergeHistory.value = []
    fundCollectionRecords.value = []
    differenceExplanations.value = []
  }

  return {
    dataSources,
    cardAccounts,
    rechargeRecords,
    consumptionRecords,
    refundRecords,
    cardMergeHistory,
    fundCollectionRecords,
    differenceExplanations,
    reportHistory,
    currentDataSourceVersion,
    totalRechargeAmount,
    totalConsumptionAmount,
    totalRefundAmount,
    accountBalance,
    theoreticalBalance,
    currentDifference,
    hasActiveCollection,
    activeCollection,
    addCardAccounts,
    addRechargeRecords,
    addConsumptionRecords,
    addRefundRecords,
    mergeCards,
    triggerFundCollection,
    completeFundCollection,
    addDifferenceExplanation,
    saveReport,
    getMergeHistoryByCard,
    getDataSourceById,
    clearAllData
  }
})
