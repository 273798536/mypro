import { v4 as uuidv4 } from 'uuid';
import { beginTransaction, commit, rollback } from '../database/connection';
import { findPrepaymentFlowById } from '../dao/prepaymentFlowDao';
import { findInvoiceById, updateInvoiceStatus, insertInvoice, findInvoicesByPrepaymentFlowId } from '../dao/invoiceDao';
import { findWarehouseReceiptById, findWarehouseReceiptsByPrepaymentFlowId } from '../dao/warehouseDao';
import { 
  insertVerification, 
  updateVerificationStatus, 
  findVerificationsByInvoiceId,
  findVerificationsByPrepaymentFlowId,
  getTotalVerifiedAmount,
  findVerificationById
} from '../dao/verificationDao';
import { getTotalPenaltyAmount } from '../dao/penaltyDao';
import { getCurrentBalance } from '../dao/ledgerDao';
import { addLedgerTransaction } from './ledgerService';
import { 
  VerificationRequest, 
  VerificationStatus, 
  InvoiceStatus,
  VerificationRecord,
  VerificationSummary,
  ApiResponse
} from '../types';

export interface VerificationResult {
  success: boolean;
  verification?: VerificationRecord;
  errors: string[];
  warnings: string[];
}

export interface VerificationContext {
  missingWarehouseReceipts: string[];
  amountMismatches: Array<{
    invoiceNo: string;
    invoiceAmount: number;
    receiptAmount: number;
    difference: number;
  }>;
  actionableHints: string[];
}

export const performVerification = async (
  request: VerificationRequest
): Promise<ApiResponse<VerificationRecord>> => {
  const errors: string[] = [];
  const warnings: string[] = [];

  await beginTransaction();

  try {
    const prepaymentFlow = await findPrepaymentFlowById(request.prepaymentFlowId);
    if (!prepaymentFlow) {
      errors.push('预付款流水不存在');
      await rollback();
      return { success: false, errors };
    }

    const invoice = await findInvoiceById(request.invoiceId);
    if (!invoice) {
      errors.push('发票不存在');
      await rollback();
      return { success: false, errors };
    }

    if (invoice.prepaymentFlowId !== request.prepaymentFlowId) {
      errors.push('发票不属于该预付款流水');
      await rollback();
      return { success: false, errors };
    }

    if (invoice.status === InvoiceStatus.RED_FLUSHED) {
      errors.push('该发票已全额红冲，无法核销');
      await rollback();
      return { success: false, errors };
    }

    const currentBalance = await getCurrentBalance(request.prepaymentFlowId);
    if (request.verifiedAmount > currentBalance) {
      errors.push(`核销金额(${request.verifiedAmount})超过预付款剩余额度(${currentBalance})`);
      await rollback();
      return { success: false, errors };
    }

    if (request.warehouseReceiptId) {
      const receipt = await findWarehouseReceiptById(request.warehouseReceiptId);
      if (!receipt) {
        warnings.push('入库单不存在，建议先录入入库单再核销');
        warnings.push('当前操作将标记为"待入库匹配"状态');
      } else if (receipt.prepaymentFlowId !== request.prepaymentFlowId) {
        errors.push('入库单不属于该预付款流水');
        await rollback();
        return { success: false, errors };
      } else {
        const diff = invoice.invoiceAmount - receipt.totalAmount;
        if (Math.abs(diff) > 0.01) {
          warnings.push(`发票金额(${invoice.invoiceAmount})与入库单金额(${receipt.totalAmount})存在差异，差额: ${diff.toFixed(2)}`);
          warnings.push('建议核对明细后再进行完全核销');
        }
      }
    } else {
      warnings.push('未关联入库单，核销后需后续补录入库信息');
      warnings.push('操作提示：可在入库单录入后调用匹配接口关联此核销记录');
    }

    const totalVerified = await getTotalVerifiedAmount(request.prepaymentFlowId);
    const remainingAfterVerification = prepaymentFlow.prepaymentAmount - totalVerified - request.verifiedAmount;

    const verification: VerificationRecord = {
      id: uuidv4(),
      prepaymentFlowId: request.prepaymentFlowId,
      invoiceId: request.invoiceId,
      warehouseReceiptId: request.warehouseReceiptId,
      verifiedAmount: request.verifiedAmount,
      verificationDate: new Date().toISOString().split('T')[0],
      status: remainingAfterVerification <= 0.01 ? VerificationStatus.VERIFIED : VerificationStatus.PARTIAL,
      createdBy: request.createdBy,
      createdAt: new Date().toISOString(),
      remark: request.remark
    };

    await insertVerification(verification);

    await addLedgerTransaction({
      prepaymentFlowId: request.prepaymentFlowId,
      transactionType: 'verification',
      transactionDate: verification.verificationDate,
      amount: request.verifiedAmount,
      isDebit: false,
      referenceId: verification.id,
      referenceType: 'verification',
      createdBy: request.createdBy,
      remark: `核销发票: ${invoice.invoiceNo}`
    });

    await commit();

    return {
      success: true,
      data: verification,
      message: '核销成功',
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    await rollback();
    throw error;
  }
};

export const getVerificationContext = async (
  prepaymentFlowId: string
): Promise<VerificationContext> => {
  const context: VerificationContext = {
    missingWarehouseReceipts: [],
    amountMismatches: [],
    actionableHints: []
  };

  const verifications = await findVerificationsByInvoiceId(prepaymentFlowId);
  
  for (const v of verifications) {
    if (!v.warehouseReceiptId) {
      context.missingWarehouseReceipts.push(v.id);
    }
  }

  if (context.missingWarehouseReceipts.length > 0) {
    context.actionableHints.push(`存在 ${context.missingWarehouseReceipts.length} 笔核销未关联入库单`);
    context.actionableHints.push('建议：1. 检查仓库是否已实际收货');
    context.actionableHints.push('建议：2. 补录入库单后调用匹配接口');
    context.actionableHints.push('建议：3. 如为服务类采购可忽略此提示');
  }

  return context;
};

export const getVerificationSummary = async (
  prepaymentFlowId: string
): Promise<ApiResponse<VerificationSummary>> => {
  const prepaymentFlow = await findPrepaymentFlowById(prepaymentFlowId);
  if (!prepaymentFlow) {
    return { success: false, errors: ['预付款流水不存在'] };
  }

  const totalVerified = await getTotalVerifiedAmount(prepaymentFlowId);
  const totalPenalty = await getTotalPenaltyAmount(prepaymentFlowId);
  const currentBalance = await getCurrentBalance(prepaymentFlowId);

  const invoices = await findInvoicesByPrepaymentFlowId(prepaymentFlowId);
  const receipts = await findWarehouseReceiptsByPrepaymentFlowId(prepaymentFlowId);

  const verifications = await findVerificationsByPrepaymentFlowId(prepaymentFlowId);
  const lastVerification = verifications[0];

  let status: VerificationStatus = VerificationStatus.PENDING;
  if (currentBalance <= 0.01) {
    status = VerificationStatus.VERIFIED;
  } else if (totalVerified > 0) {
    status = VerificationStatus.PARTIAL;
  }

  const summary: VerificationSummary = {
    prepaymentFlowId,
    supplierName: prepaymentFlow.supplierName,
    contractNo: prepaymentFlow.contractNo,
    totalPrepayment: prepaymentFlow.prepaymentAmount,
    totalVerified,
    totalPenalty,
    remainingAmount: currentBalance,
    verificationStatus: status,
    invoiceCount: invoices.length,
    warehouseReceiptCount: receipts.length,
    lastVerificationDate: lastVerification?.verificationDate
  };

  const warnings: string[] = [];
  const context = await getVerificationContext(prepaymentFlowId);
  if (context.missingWarehouseReceipts.length > 0) {
    warnings.push(`有 ${context.missingWarehouseReceipts.length} 笔核销缺少入库单关联`);
  }

  return {
    success: true,
    data: summary,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

export const reverseVerification = async (
  verificationId: string,
  reversedBy: string,
  reason: string
): Promise<ApiResponse<VerificationRecord>> => {
  await beginTransaction();

  try {
    const verification = await findVerificationById(verificationId);
    if (!verification) {
      await rollback();
      return { success: false, errors: ['核销记录不存在'] };
    }

    if (verification.status === VerificationStatus.REVERSED) {
      await rollback();
      return { success: false, errors: ['该核销记录已被冲销'] };
    }

    await updateVerificationStatus(
      verificationId,
      VerificationStatus.REVERSED,
      reversedBy,
      new Date().toISOString(),
      reason
    );

    await addLedgerTransaction({
      prepaymentFlowId: verification.prepaymentFlowId,
      transactionType: 'reverse',
      transactionDate: new Date().toISOString().split('T')[0],
      amount: verification.verifiedAmount,
      isDebit: true,
      referenceId: verificationId,
      referenceType: 'reverse_verification',
      createdBy: reversedBy,
      remark: `冲销核销: ${reason}`
    });

    await commit();

    const updated = await findVerificationById(verificationId);
    return {
      success: true,
      data: updated,
      message: '核销冲销成功，已回滚预付款余额'
    };
  } catch (error) {
    await rollback();
    throw error;
  }
};
