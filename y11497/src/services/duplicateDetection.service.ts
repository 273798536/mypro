import dataStore from '../database/store';
import { Reimbursement, ReimbursementItem, ReimbursementStatus } from '../types';
import logger from '../utils/logger';

interface DuplicateResult {
  itemId: string;
  duplicateOf: string;
  duplicateReimbursementId: string;
  confidence: number;
  reason: string;
}

export class DuplicateDetectionService {
  static detectDuplicates(reimbursement: Reimbursement): DuplicateResult[] {
    const duplicates: DuplicateResult[] = [];
    const allReimbursements = dataStore.listReimbursements();

    for (const item of reimbursement.items) {
      const itemDuplicates = this.findDuplicateItems(
        item,
        reimbursement.id,
        allReimbursements
      );
      duplicates.push(...itemDuplicates);
    }

    if (duplicates.length > 0) {
      logger.warn(`检测到 ${duplicates.length} 条重复记录: ${reimbursement.id}`);
    }

    return duplicates;
  }

  private static findDuplicateItems(
    item: ReimbursementItem,
    currentReimbursementId: string,
    allReimbursements: Reimbursement[]
  ): DuplicateResult[] {
    const duplicates: DuplicateResult[] = [];

    for (const otherReimbursement of allReimbursements) {
      if (otherReimbursement.id === currentReimbursementId) continue;
      if (otherReimbursement.status === ReimbursementStatus.CLOSED) continue;

      for (const otherItem of otherReimbursement.items) {
        const result = this.checkItemDuplicate(item, otherItem, otherReimbursement.id);
        if (result) {
          duplicates.push(result);
        }
      }
    }

    return duplicates;
  }

  private static checkItemDuplicate(
    item: ReimbursementItem,
    otherItem: ReimbursementItem,
    otherReimbursementId: string
  ): DuplicateResult | null {
    if (item.type !== otherItem.type) return null;

    let confidence = 0;
    let reasons: string[] = [];

    if (item.date === otherItem.date) {
      confidence += 30;
      reasons.push('日期相同');
    }

    const amountDiff = Math.abs(item.amount - otherItem.amount);
    if (amountDiff < 0.01) {
      confidence += 25;
      reasons.push('金额相同');
    } else if (amountDiff / item.amount < 0.1) {
      confidence += 10;
      reasons.push('金额接近');
    }

    if (item.receiptNumber && otherItem.receiptNumber &&
        item.receiptNumber === otherItem.receiptNumber) {
      confidence += 40;
      reasons.push('发票号相同');
    }

    if (item.relatedTravelId && otherItem.relatedTravelId &&
        item.relatedTravelId === otherItem.relatedTravelId) {
      confidence += 20;
      reasons.push('关联行程相同');
    }

    if (item.type === 'accommodation' && item.date === otherItem.date) {
      confidence += 15;
      reasons.push('住宿日期重叠');
    }

    if (item.type === 'transportation') {
      if (this.isSameRoute(item.description, otherItem.description)) {
        confidence += 20;
        reasons.push('交通路线相同');
      }
    }

    if (confidence >= 50) {
      return {
        itemId: item.id,
        duplicateOf: otherItem.id,
        duplicateReimbursementId: otherReimbursementId,
        confidence,
        reason: reasons.join('; ')
      };
    }

    return null;
  }

  private static isSameRoute(desc1: string, desc2: string): boolean {
    const cities1 = this.extractCities(desc1);
    const cities2 = this.extractCities(desc2);
    
    if (cities1.length >= 2 && cities2.length >= 2) {
      const sameStartEnd = (
        (cities1[0] === cities2[0] && cities1[cities1.length - 1] === cities2[cities2.length - 1]) ||
        (cities1[0] === cities2[cities2.length - 1] && cities1[cities1.length - 1] === cities2[0])
      );
      return sameStartEnd;
    }
    
    return false;
  }

  private static extractCities(text: string): string[] {
    const cityPattern = /(北京|上海|广州|深圳|杭州|南京|成都|重庆|武汉|西安|天津|苏州)/g;
    return text.match(cityPattern) || [];
  }

  static markDuplicates(reimbursementId: string): { marked: number; details: DuplicateResult[] } {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) {
      throw new Error('报销单不存在');
    }

    const duplicates = this.detectDuplicates(reimbursement);
    
    if (duplicates.length > 0) {
      const updatedItems = reimbursement.items.map(item => {
        const duplicate = duplicates.find(d => d.itemId === item.id);
        if (duplicate) {
          return {
            ...item,
            isDuplicate: true,
            duplicateOf: duplicate.duplicateOf
          };
        }
        return item;
      });

      dataStore.updateReimbursement(reimbursementId, {
        items: updatedItems
      });
    }

    return {
      marked: duplicates.length,
      details: duplicates
    };
  }

  static resolveDuplicate(
    reimbursementId: string,
    itemId: string,
    keepOriginal: boolean,
    operatorId: string
  ): boolean {
    const reimbursement = dataStore.getReimbursement(reimbursementId);
    if (!reimbursement) return false;

    if (keepOriginal) {
      const updatedItems = reimbursement.items.filter(item => item.id !== itemId);
      const newTotal = updatedItems.reduce((sum, item) => sum + item.amount, 0);
      
      dataStore.updateReimbursement(reimbursementId, {
        items: updatedItems,
        totalAmount: newTotal
      });
      
      logger.info(`已移除重复项 ${itemId} from ${reimbursementId}`);
    } else {
      const updatedItems = reimbursement.items.map(item => {
        if (item.id === itemId) {
          return { ...item, isDuplicate: false, duplicateOf: undefined };
        }
        return item;
      });
      
      dataStore.updateReimbursement(reimbursementId, {
        items: updatedItems
      });
      
      logger.info(`已标记重复项 ${itemId} 为非重复`);
    }

    return true;
  }

  static generateConflictReport(): {
    totalChecked: number;
    withDuplicates: number;
    duplicateItems: number;
    details: Array<{
      reimbursementId: string;
      applicationNo: string;
      applicantName: string;
      duplicates: DuplicateResult[];
    }>;
  } {
    const allReimbursements = dataStore.listReimbursements();
    const details: Array<{
      reimbursementId: string;
      applicationNo: string;
      applicantName: string;
      duplicates: DuplicateResult[];
    }> = [];

    let withDuplicates = 0;
    let totalDuplicateItems = 0;

    for (const reimbursement of allReimbursements) {
      if (reimbursement.status === ReimbursementStatus.CLOSED) continue;
      
      const duplicates = this.detectDuplicates(reimbursement);
      if (duplicates.length > 0) {
        withDuplicates++;
        totalDuplicateItems += duplicates.length;
        details.push({
          reimbursementId: reimbursement.id,
          applicationNo: reimbursement.applicationNo,
          applicantName: reimbursement.applicantName,
          duplicates
        });
      }
    }

    return {
      totalChecked: allReimbursements.length,
      withDuplicates,
      duplicateItems: totalDuplicateItems,
      details
    };
  }
}
