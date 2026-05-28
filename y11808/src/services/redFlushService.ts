import { v4 as uuidv4 } from 'uuid';
import { beginTransaction, commit, rollback } from '../database/connection';
import { findInvoiceById, updateInvoiceStatus, insertInvoice, findInvoicesByPrepaymentFlowId } from '../dao/invoiceDao';
import { findVerificationsByInvoiceId, updateVerificationStatus, findVerificationById } from '../dao/verificationDao';
import { findPrepaymentFlowById } from '../dao/prepaymentFlowDao';
import { addLedgerTransaction } from './ledgerService';
import { RedFlushRequest, InvoiceStatus, VerificationStatus, ApiResponse, Invoice } from '../types';

export interface RedFlushResult {
  success: boolean;
  redFlushInvoice?: Invoice;
  reversedVerifications: string[];
  recoveredAmount: number;
}

export const performRedFlush = async (
  request: RedFlushRequest
): Promise<ApiResponse<RedFlushResult>> => {
  await beginTransaction();

  try {
    const originalInvoice = await findInvoiceById(request.invoiceId);
    if (!originalInvoice) {
      await rollback();
      return { success: false, errors: ['原发票不存在'] };
    }

    if (originalInvoice.status === InvoiceStatus.RED_FLUSHED) {
      await rollback();
      return { success: false, errors: ['该发票已全额红冲'] };
    }

    if (request.redFlushAmount > originalInvoice.invoiceAmount) {
      await rollback();
      return { success: false, errors: ['红冲金额不能超过原发票金额'] };
    }

    const relatedVerifications = await findVerificationsByInvoiceId(request.invoiceId);
    const totalVerified = relatedVerifications
      .filter(v => v.status === VerificationStatus.VERIFIED)
      .reduce((sum, v) => sum + v.verifiedAmount, 0);

    if (request.redFlushAmount > totalVerified) {
      await rollback();
      return { 
        success: false, 
        errors: [`红冲金额(${request.redFlushAmount})不能超过该发票已核销金额(${totalVerified})`] 
      };
    }

    const reversedVerifications: string[] = [];
    let remainingToReverse = request.redFlushAmount;

    for (const verification of relatedVerifications) {
      if (remainingToReverse <= 0) break;
      if (verification.status !== VerificationStatus.VERIFIED) continue;

      const amountToReverse = Math.min(verification.verifiedAmount, remainingToReverse);
      
      if (amountToReverse >= verification.verifiedAmount) {
        await updateVerificationStatus(
          verification.id,
          VerificationStatus.REVERSED,
          request.createdBy,
          new Date().toISOString(),
          `发票红冲: ${request.reason}`
        );
        reversedVerifications.push(verification.id);
      }

      remainingToReverse -= amountToReverse;
    }

    const isFullRedFlush = Math.abs(request.redFlushAmount - originalInvoice.invoiceAmount) <= 0.01;

    const redFlushInvoice: Invoice = {
      id: uuidv4(),
      prepaymentFlowId: originalInvoice.prepaymentFlowId,
      invoiceNo: `RED-${originalInvoice.invoiceNo}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceAmount: -request.redFlushAmount,
      taxAmount: -(originalInvoice.taxAmount * (request.redFlushAmount / originalInvoice.invoiceAmount)),
      status: InvoiceStatus.RED_FLUSHED,
      originalInvoiceId: originalInvoice.id,
      redFlushDate: new Date().toISOString().split('T')[0],
      createdBy: request.createdBy,
      createdAt: new Date().toISOString(),
      remark: `红冲发票: ${request.reason}`
    };

    await insertInvoice(redFlushInvoice);

    const newStatus = isFullRedFlush ? InvoiceStatus.RED_FLUSHED : InvoiceStatus.PARTIAL_RED;
    await updateInvoiceStatus(originalInvoice.id, newStatus, redFlushInvoice.redFlushDate);

    await addLedgerTransaction({
      prepaymentFlowId: originalInvoice.prepaymentFlowId,
      transactionType: 'red_flush',
      transactionDate: redFlushInvoice.invoiceDate,
      amount: request.redFlushAmount,
      isDebit: true,
      referenceId: redFlushInvoice.id,
      referenceType: 'red_flush',
      createdBy: request.createdBy,
      remark: `发票红冲: ${originalInvoice.invoiceNo}`
    });

    await commit();

    return {
      success: true,
      data: {
        success: true,
        redFlushInvoice,
        reversedVerifications,
        recoveredAmount: request.redFlushAmount
      },
      message: `发票红冲成功，恢复预付款余额 ${request.redFlushAmount} 元，冲销 ${reversedVerifications.length} 笔核销记录`
    };
  } catch (error) {
    await rollback();
    throw error;
  }
};
