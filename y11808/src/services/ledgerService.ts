import { v4 as uuidv4 } from 'uuid';
import { insertLedger, getCurrentBalance } from '../dao/ledgerDao';
import { PrepaymentLedger } from '../types';

export type TransactionType = 'prepayment' | 'verification' | 'penalty' | 'red_flush' | 'reverse';

export interface LedgerTransaction {
  prepaymentFlowId: string;
  transactionType: TransactionType;
  transactionDate: string;
  amount: number;
  isDebit: boolean;
  referenceId: string;
  referenceType: string;
  createdBy: string;
  remark?: string;
}

export const addLedgerTransaction = async (
  transaction: LedgerTransaction
): Promise<PrepaymentLedger> => {
  const currentBalance = await getCurrentBalance(transaction.prepaymentFlowId);
  
  const debitAmount = transaction.isDebit ? transaction.amount : 0;
  const creditAmount = transaction.isDebit ? 0 : transaction.amount;
  const newBalance = currentBalance + debitAmount - creditAmount;

  const ledger: PrepaymentLedger = {
    id: uuidv4(),
    prepaymentFlowId: transaction.prepaymentFlowId,
    transactionType: transaction.transactionType,
    transactionDate: transaction.transactionDate,
    debitAmount,
    creditAmount,
    balance: newBalance,
    referenceId: transaction.referenceId,
    referenceType: transaction.referenceType,
    createdBy: transaction.createdBy,
    createdAt: new Date().toISOString(),
    remark: transaction.remark
  };

  await insertLedger(ledger);
  return ledger;
};
