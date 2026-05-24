import { Database, getDatabase } from '../database';
import { FailedRecord } from '../types';

export class FailedRecordService {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || getDatabase();
  }

  async getFailedRecords(
    recordType?: string,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{
    items: FailedRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let sql = 'SELECT * FROM failed_records';
    let countSql = 'SELECT COUNT(*) as count FROM failed_records';
    const params: any[] = [];

    if (recordType) {
      sql += ' WHERE recordType = ?';
      countSql += ' WHERE recordType = ?';
      params.push(recordType);
    }

    sql += ' ORDER BY failedAt DESC LIMIT ? OFFSET ?';
    params.push(pageSize, (page - 1) * pageSize);

    const [items, countResult] = await Promise.all([
      this.db.all<FailedRecord>(sql, params),
      this.db.get<{ count: number }>(countSql, recordType ? [recordType] : [])
    ]);

    return {
      items: items.map(item => ({
        ...item,
        originalData: JSON.parse(item.originalData)
      })),
      total: countResult?.count || 0,
      page,
      pageSize
    };
  }

  async getFailedRecordStats(): Promise<{
    total: number;
    byType: { type: string; count: number }[];
  }> {
    const [totalResult, byTypeResult] = await Promise.all([
      this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM failed_records'),
      this.db.all<{ recordType: string; count: number }>(
        'SELECT recordType, COUNT(*) as count FROM failed_records GROUP BY recordType'
      )
    ]);

    return {
      total: totalResult?.count || 0,
      byType: byTypeResult.map(r => ({ type: r.recordType, count: r.count }))
    };
  }
}

export const failedRecordService = new FailedRecordService();
