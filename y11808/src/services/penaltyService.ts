import { v4 as uuidv4 } from 'uuid';
import { beginTransaction, commit, rollback } from '../database/connection';
import { findPrepaymentFlowById } from '../dao/prepaymentFlowDao';
import { insertPenalty, getTotalPenaltyAmount } from '../dao/penaltyDao';
import { getCurrentBalance } from '../dao/ledgerDao';
import { addLedgerTransaction } from './ledgerService';
import { PenaltyRequest, PenaltyRecord, ApiResponse } from '../types';

export interface PenaltyResult {
  success: boolean;
  penalty?: PenaltyRecord;
  newBalance: number;
}

export const applyPenalty = async (
  request: PenaltyRequest
): Promise<ApiResponse<PenaltyResult>> => {
  await beginTransaction();

  try {
    const prepaymentFlow = await findPrepaymentFlowById(request.prepaymentFlowId);
    if (!prepaymentFlow) {
      await rollback();
      return { success: false, errors: ['预付款流水不存在'] };
    }

    const currentBalance = await getCurrentBalance(request.prepaymentFlowId);
    if (request.penaltyAmount > currentBalance) {
      await rollback();
      return { 
        success: false, 
        errors: [`扣罚金额(${request.penaltyAmount})超过预付款剩余额度(${currentBalance})`] 
      };
    }

    const penalty: PenaltyRecord = {
      id: uuidv4(),
      prepaymentFlowId: request.prepaymentFlowId,
      penaltyType: request.penaltyType,
      penaltyAmount: request.penaltyAmount,
      penaltyDate: new Date().toISOString().split('T')[0],
      reason: request.reason,
      createdBy: request.createdBy,
      createdAt: new Date().toISOString()
    };

    await insertPenalty(penalty);

    await addLedgerTransaction({
      prepaymentFlowId: request.prepaymentFlowId,
      transactionType: 'penalty',
      transactionDate: penalty.penaltyDate,
      amount: request.penaltyAmount,
      isDebit: false,
      referenceId: penalty.id,
      referenceType: 'penalty',
      createdBy: request.createdBy,
      remark: `扣罚: ${request.reason}`
    });

    const newBalance = currentBalance - request.penaltyAmount;

    await commit();

    return {
      success: true,
      data: {
        success: true,
        penalty,
        newBalance
      },
      message: `扣罚成功，扣除预付款余额 ${request.penaltyAmount} 元，剩余 ${newBalance} 元`
    };
  } catch (error) {
    await rollback();
    throw error;
  }
};
