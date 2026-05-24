import { Repository, DataSource } from 'typeorm';
import { ChangeHistory } from '../entities/ChangeHistory';
import { ChangeAction, LedgerStatus } from '../types/enums';
import { compareObjects, FieldDiff } from '../utils/diff';

export class ChangeHistoryService {
  private repository: Repository<ChangeHistory>;

  constructor(private dataSource: DataSource) {
    this.repository = dataSource.getRepository(ChangeHistory);
  }

  async recordChange(
    ledgerId: string,
    action: ChangeAction,
    beforeData: Record<string, any> | null,
    afterData: Record<string, any>,
    options: {
      fromStatus?: LedgerStatus;
      toStatus?: LedgerStatus;
      reason?: string;
      operatorId?: string;
      operatorName?: string;
      operatorRole?: string;
      version?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<ChangeHistory> {
    const changes = beforeData ? compareObjects(beforeData, afterData) : [];

    const history = this.repository.create({
      ledgerId,
      action,
      fromStatus: options.fromStatus,
      toStatus: options.toStatus,
      beforeData: beforeData || undefined,
      afterData,
      changes,
      reason: options.reason,
      operatorId: options.operatorId,
      operatorName: options.operatorName,
      operatorRole: options.operatorRole,
      version: options.version || 1,
      metadata: options.metadata,
    });

    return this.repository.save(history);
  }

  async getLedgerHistories(
    ledgerId: string,
    options: {
      page?: number;
      pageSize?: number;
      action?: ChangeAction;
    } = {}
  ): Promise<{
    histories: ChangeHistory[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { ledgerId };
    if (options.action) {
      where.action = options.action;
    }

    const [histories, total] = await this.repository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: pageSize,
    });

    return {
      histories,
      total,
      page,
      pageSize,
    };
  }

  async getHistoryById(id: string): Promise<ChangeHistory | null> {
    return this.repository.findOne({ where: { id } });
  }

  async compareVersions(
    ledgerId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: ChangeHistory | null;
    version2: ChangeHistory | null;
    differences: FieldDiff[];
  }> {
    const h1 = await this.repository.findOne({
      where: { ledgerId, version: version1 },
    });
    const h2 = await this.repository.findOne({
      where: { ledgerId, version: version2 },
    });

    const differences = compareObjects(
      h1?.afterData || {},
      h2?.afterData || {}
    );

    return {
      version1: h1,
      version2: h2,
      differences,
    };
  }

  async getLatestVersion(ledgerId: string): Promise<number> {
    const latest = await this.repository.findOne({
      where: { ledgerId },
      order: { version: 'DESC' },
    });
    return latest?.version || 0;
  }

  async getChangeByVersion(
    ledgerId: string,
    version: number
  ): Promise<ChangeHistory | null> {
    return this.repository.findOne({
      where: { ledgerId, version },
    });
  }
}
