import { v4 as uuidv4 } from 'uuid';
import { beginTransaction, commit, rollback } from '../database/connection';
import { 
  findWarehouseReceiptById, 
  findWarehouseReceiptItemsByReceiptId,
  insertWarehouseReceipt,
  insertWarehouseReceiptItem,
  updateWarehouseReceiptStatus
} from '../dao/warehouseDao';
import { WarehouseSplitRequest, WarehouseStatus, ApiResponse, WarehouseReceipt, WarehouseReceiptItem } from '../types';

export interface SplitResult {
  success: boolean;
  parentReceipt?: WarehouseReceipt;
  splitReceipts: WarehouseReceipt[];
}

export const splitWarehouseReceipt = async (
  request: WarehouseSplitRequest
): Promise<ApiResponse<SplitResult>> => {
  await beginTransaction();

  try {
    const parentReceipt = await findWarehouseReceiptById(request.parentReceiptId);
    if (!parentReceipt) {
      await rollback();
      return { success: false, errors: ['原入库单不存在'] };
    }

    if (parentReceipt.status === WarehouseStatus.SPLIT) {
      await rollback();
      return { success: false, errors: ['该入库单已拆分'] };
    }

    const originalItems = await findWarehouseReceiptItemsByReceiptId(request.parentReceiptId);
    
    const originalTotalAmount = originalItems.reduce((sum, item) => sum + item.amount, 0);
    const originalTotalQuantity = originalItems.reduce((sum, item) => sum + item.quantity, 0);

    const splitTotalAmount = request.splitItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const splitTotalQuantity = request.splitItems.reduce((sum, item) => sum + item.quantity, 0);

    if (splitTotalAmount > originalTotalAmount) {
      await rollback();
      return { 
        success: false, 
        errors: [`拆分数额(${splitTotalAmount})超过原入库单总额(${originalTotalAmount})`]
      };
    }

    if (Math.abs(splitTotalAmount - originalTotalAmount) > 0.01) {
      await rollback();
      return { 
        success: false, 
        errors: ['拆分后总金额必须与原入库单金额一致']
      };
    }

    await updateWarehouseReceiptStatus(request.parentReceiptId, WarehouseStatus.SPLIT);

    const splitReceipts: WarehouseReceipt[] = [];
    let itemIndex = 0;

    for (const splitItem of request.splitItems) {
      const splitReceipt: WarehouseReceipt = {
        id: uuidv4(),
        prepaymentFlowId: parentReceipt.prepaymentFlowId,
        receiptNo: `${parentReceipt.receiptNo}-${String.fromCharCode(65 + itemIndex)}`,
        receiptDate: new Date().toISOString().split('T')[0],
        totalAmount: splitItem.quantity * splitItem.unitPrice,
        totalQuantity: splitItem.quantity,
        status: WarehouseStatus.NORMAL,
        parentReceiptId: request.parentReceiptId,
        createdBy: request.createdBy,
        createdAt: new Date().toISOString(),
        remark: `拆分自 ${parentReceipt.receiptNo}`
      };

      await insertWarehouseReceipt(splitReceipt);

      const receiptItem: WarehouseReceiptItem = {
        id: uuidv4(),
        receiptId: splitReceipt.id,
        materialCode: splitItem.materialCode,
        materialName: splitItem.materialName,
        quantity: splitItem.quantity,
        unitPrice: splitItem.unitPrice,
        amount: splitItem.quantity * splitItem.unitPrice
      };

      await insertWarehouseReceiptItem(receiptItem);
      splitReceipts.push(splitReceipt);
      itemIndex++;
    }

    await commit();

    return {
      success: true,
      data: {
        success: true,
        parentReceipt: { ...parentReceipt, status: WarehouseStatus.SPLIT },
        splitReceipts
      },
      message: `入库单拆分成功，共拆分为 ${splitReceipts.length} 个子入库单`
    };
  } catch (error) {
    await rollback();
    throw error;
  }
};
