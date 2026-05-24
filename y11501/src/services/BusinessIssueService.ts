import { Repository, EntityManager } from 'typeorm';
import dayjs from 'dayjs';
import { BusinessIssue } from '../entities/BusinessIssue';
import { RepairOrder } from '../entities/RepairOrder';
import { SparePartScan, PartActionType } from '../entities/SparePartScan';
import { AppDataSource } from '../config/database';
import { BusinessIssueType, RecordStatus } from '../types';
import { OperationLogService } from './OperationLogService';
import { OperationType } from '../entities/OperationLog';

export interface BusinessCheckResult {
  totalChecked: number;
  issueCount: number;
  issues: BusinessIssue[];
}

export class BusinessIssueService {
  private issueRepository: Repository<BusinessIssue>;
  private logService: OperationLogService;

  constructor() {
    this.issueRepository = AppDataSource.getRepository(BusinessIssue);
    this.logService = new OperationLogService();
  }

  async checkAll(operator: string): Promise<BusinessCheckResult> {
    let totalChecked = 0;
    let issueCount = 0;
    const allIssues: BusinessIssue[] = [];

    await AppDataSource.transaction(async (manager) => {
      await manager.clear(BusinessIssue);

      const lateOrderIssues = await this.checkLateOrdersAfterPickup(manager);
      allIssues.push(...lateOrderIssues);

      const scrapConfusionIssues = await this.checkReturnScrapConfusion(manager);
      allIssues.push(...scrapConfusionIssues);

      for (const issue of allIssues) {
        await manager.save(issue);
      }

      issueCount = allIssues.length;
      totalChecked = await manager.createQueryBuilder(RepairOrder, 'ro').getCount();
    });

    await this.logService.log(
      OperationType.CHECK,
      operator,
      `业务问题检查完成，发现 ${issueCount} 个问题`,
      {
        details: { totalChecked, issueCount }
      }
    );

    return {
      totalChecked,
      issueCount,
      issues: allIssues
    };
  }

  private async checkLateOrdersAfterPickup(manager: EntityManager): Promise<BusinessIssue[]> {
    const issues: BusinessIssue[] = [];

    const repairOrders = await manager.find(RepairOrder, {
      where: { status: RecordStatus.PENDING } as any
    });

    const sparePartScans = await manager.find(SparePartScan, {
      where: { actionType: PartActionType.PICKUP } as any
    });

    const scanMap = new Map<string, SparePartScan[]>();
    for (const scan of sparePartScans) {
      if (scan.repairOrderNo) {
        if (!scanMap.has(scan.repairOrderNo)) {
          scanMap.set(scan.repairOrderNo, []);
        }
        scanMap.get(scan.repairOrderNo)!.push(scan);
      }
    }

    for (const order of repairOrders) {
      const scans = scanMap.get(order.orderNo) || [];
      if (scans.length === 0) continue;

      const earliestScan = scans.reduce((earliest, scan) => {
        if (!scan.scanTime) return earliest;
        if (!earliest.scanTime) return scan;
        return dayjs(scan.scanTime).isBefore(earliest.scanTime) ? scan : earliest;
      }, scans[0]);

      if (earliestScan.scanTime && order.orderDate) {
        const scanDate = dayjs(earliestScan.scanTime);
        const orderDate = dayjs(order.orderDate);

        if (scanDate.isBefore(orderDate, 'day') || 
            (scanDate.isSame(orderDate, 'day') && scanDate.isBefore(orderDate))) {
          const relatedIds = scans.map(s => s.id).join(',');
          
          const issue = new BusinessIssue();
          issue.issueType = BusinessIssueType.LATE_ORDER_AFTER_PICKUP;
          issue.sourceType = 'repair_order';
          issue.repairOrderNo = order.orderNo;
          issue.engineerName = order.engineerName;
          issue.description = `工程师 ${order.engineerName || '未知'} 于 ${scanDate.format('YYYY-MM-DD HH:mm')} 领用备件，但工单创建时间为 ${orderDate.format('YYYY-MM-DD HH:mm')}，存在先领用后补单嫌疑`;
          issue.relatedRecordIds = relatedIds;
          issue.status = RecordStatus.PENDING;
          issue.handlingSuggestion = '请核实工单创建时间是否正确，是否存在先干活后补单情况';
          issues.push(issue);
        }
      }
    }

    return issues;
  }

  private async checkReturnScrapConfusion(manager: EntityManager): Promise<BusinessIssue[]> {
    const issues: BusinessIssue[] = [];

    const returnScans = await manager.find(SparePartScan, {
      where: { actionType: PartActionType.RETURN } as any
    });

    const scrapScans = await manager.find(SparePartScan, {
      where: { actionType: PartActionType.SCRAP } as any
    });

    const allRelatedScans = [...returnScans, ...scrapScans];

    const engineerPartMap = new Map<string, SparePartScan[]>();
    for (const scan of allRelatedScans) {
      if (scan.engineerName && scan.partCode && scan.repairOrderNo) {
        const key = `${scan.engineerName}-${scan.partCode}-${scan.repairOrderNo}`;
        if (!engineerPartMap.has(key)) {
          engineerPartMap.set(key, []);
        }
        engineerPartMap.get(key)!.push(scan);
      }
    }

    for (const [key, scans] of engineerPartMap) {
      const hasReturn = scans.some(s => s.actionType === PartActionType.RETURN);
      const hasScrap = scans.some(s => s.actionType === PartActionType.SCRAP);

      if (hasReturn && hasScrap) {
        const [engineerName, partCode, repairOrderNo] = key.split('-');
        const actions = scans.map(s => `${s.actionType}(${s.quantity})`).join(', ');
        const relatedIds = scans.map(s => s.id).join(',');

        const issue = new BusinessIssue();
        issue.issueType = BusinessIssueType.RETURN_SCRAP_CONFUSION;
        issue.sourceType = 'spare_part_scan';
        issue.repairOrderNo = repairOrderNo;
        issue.engineerName = engineerName;
        issue.description = `工单 ${repairOrderNo} 中，工程师 ${engineerName} 对备件 ${partCode} 同时存在退回(${scans.find(s => s.actionType === PartActionType.RETURN)?.quantity || 0})和报废(${scans.find(s => s.actionType === PartActionType.SCRAP)?.quantity || 0})操作，存在混淆嫌疑`;
        issue.relatedRecordIds = relatedIds;
        issue.status = RecordStatus.PENDING;
        issue.handlingSuggestion = '请核实该备件最终处理方式，退回和报废只能二选一';
        issues.push(issue);
      }
    }

    return issues;
  }

  async getIssues(
    options: {
      issueType?: BusinessIssueType;
      status?: RecordStatus;
      engineerName?: string;
      repairOrderNo?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ issues: BusinessIssue[]; total: number }> {
    const queryBuilder = this.issueRepository.createQueryBuilder('bi')
      .orderBy('bi.createdAt', 'DESC');

    if (options.issueType) {
      queryBuilder.andWhere('bi.issueType = :issueType', { issueType: options.issueType });
    }

    if (options.status) {
      queryBuilder.andWhere('bi.status = :status', { status: options.status });
    }

    if (options.engineerName) {
      queryBuilder.andWhere('bi.engineerName LIKE :engineerName', { engineerName: `%${options.engineerName}%` });
    }

    if (options.repairOrderNo) {
      queryBuilder.andWhere('bi.repairOrderNo = :repairOrderNo', { repairOrderNo: options.repairOrderNo });
    }

    const total = await queryBuilder.getCount();

    if (options.page && options.pageSize) {
      queryBuilder.skip((options.page - 1) * options.pageSize).take(options.pageSize);
    }

    const issues = await queryBuilder.getMany();

    return { issues, total };
  }

  async handleIssue(
    issueId: string,
    handlingResult: string,
    operator: string
  ): Promise<BusinessIssue | null> {
    const issue = await this.issueRepository.findOne({ where: { id: issueId } });
    if (!issue) {
      return null;
    }

    issue.handlingResult = handlingResult;
    issue.handledBy = operator;
    issue.handledAt = new Date();
    issue.status = RecordStatus.APPROVED;

    await this.issueRepository.save(issue);

    return issue;
  }

  async getIssueStats(): Promise<Record<string, any>> {
    const byType = await this.issueRepository
      .createQueryBuilder('bi')
      .select('bi.issueType, COUNT(*) as count')
      .groupBy('bi.issueType')
      .getRawMany();

    const byStatus = await this.issueRepository
      .createQueryBuilder('bi')
      .select('bi.status, COUNT(*) as count')
      .groupBy('bi.status')
      .getRawMany();

    const byEngineer = await this.issueRepository
      .createQueryBuilder('bi')
      .select('bi.engineerName, COUNT(*) as count')
      .groupBy('bi.engineerName')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      byType: byType.reduce((acc, item) => ({ ...acc, [item.bi_issueType]: Number(item.count) }), {}),
      byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item.bi_status]: Number(item.count) }), {}),
      topEngineers: byEngineer.map(item => ({
        name: item.bi_engineerName || '未知',
        count: Number(item.count)
      }))
    };
  }
}
