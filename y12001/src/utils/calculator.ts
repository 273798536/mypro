
import { Transaction, Store, StoreSettlement, BalanceLayer } from '../types';

export const BONUS_COST_RATE = 0.3;

export const calculateSettlement = (
  transaction: Transaction,
  stores: Store[]
): StoreSettlement | null => {
  if (transaction.type !== 'consume') return null;

  const fromStore = stores.find(s => s.storeId === transaction.rechargeStoreId);
  const toStore = stores.find(s => s.storeId === transaction.consumeStoreId);

  if (!fromStore || !toStore) return null;

  const bonusCost = transaction.bonusUsed * BONUS_COST_RATE;
  const totalSettlement = transaction.principalUsed + bonusCost;

  return {
    settlementId: `STL-${transaction.txId}`,
    txId: transaction.txId,
    fromStoreId: fromStore.storeId,
    fromStoreName: fromStore.storeName,
    toStoreId: toStore.storeId,
    toStoreName: toStore.storeName,
    principalAmount: transaction.principalUsed,
    bonusAmount: transaction.bonusUsed,
    bonusCostRate: BONUS_COST_RATE,
    totalSettlement,
    status: transaction.status === 'exception' ? 'exception' : 'pending',
    traceSource: transaction.source,
    createdAt: transaction.createdAt,
  };
};

export const detectException = (
  transaction: Transaction,
  stores: Store[],
  balance: BalanceLayer
): { hasException: boolean; type?: string; note?: string } => {
  const rechargeStore = stores.find(s => s.storeId === transaction.rechargeStoreId);

  if (rechargeStore?.status === 'closed') {
    return {
      hasException: true,
      type: 'store_closed',
      note: `充值门店【${rechargeStore.storeName}】已撤店，本金需原路退回，赠金清零`,
    };
  }

  if (transaction.type === 'refund' && transaction.bonusUsed > 0) {
    return {
      hasException: true,
      type: 'bonus_refund',
      note: `退款包含赠金 ¥${transaction.bonusUsed.toFixed(2)}，赠金不可退，已自动扣除`,
    };
  }

  const totalAvailable = balance.principal + balance.bonus;
  if (transaction.totalAmount > totalAvailable) {
    return {
      hasException: true,
      type: 'over_consume',
      note: `消费金额 ¥${transaction.totalAmount.toFixed(2)} 超过可用余额 ¥${totalAvailable.toFixed(2)}`,
    };
  }

  return { hasException: false };
};

export const calculateBalanceAfterTransaction = (
  balance: BalanceLayer,
  transaction: Transaction
): BalanceLayer => {
  let newPrincipal = balance.principal;
  let newBonus = balance.bonus;
  let newFrozen = balance.frozen;

  if (transaction.type === 'recharge') {
    newPrincipal += transaction.principalUsed;
    newBonus += transaction.bonusUsed;
  } else if (transaction.type === 'consume') {
    newBonus = Math.max(0, newBonus - transaction.bonusUsed);
    newPrincipal = Math.max(0, newPrincipal - transaction.principalUsed);
  } else if (transaction.type === 'refund') {
    newPrincipal += transaction.principalUsed;
  }

  return {
    ...balance,
    principal: newPrincipal,
    bonus: newBonus,
    frozen: newFrozen,
    lastUpdatedSource: transaction.source,
    updatedAt: transaction.createdAt,
  };
};

export const handleStoreClosure = (
  balance: BalanceLayer,
  closedStoreId: string,
  transactionSource: string
): { refundAmount: number; clearedBonus: number; newBalance: BalanceLayer } => {
  const refundAmount = balance.principal;
  const clearedBonus = balance.bonus;

  return {
    refundAmount,
    clearedBonus,
    newBalance: {
      ...balance,
      principal: 0,
      bonus: 0,
      frozen: refundAmount,
      lastUpdatedSource: transactionSource,
      updatedAt: new Date(),
    },
  };
};
