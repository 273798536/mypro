import { getDatabase } from '../db/init';
import type { DeliveryRecord, DataIssue, FilterCriteria } from '@shared/types';

export class RecordRepository {
  private db = getDatabase();

  findAll(filters: FilterCriteria = {}): DeliveryRecord[] {
    let sql = `
      SELECT dr.*,
             json_group_array(
               json_object(
                 'id', di.id,
                 'type', di.type,
                 'severity', di.severity,
                 'description', di.description,
                 'suggestion', di.suggestion,
                 'resolved', di.resolved
               )
             ) as issues_json
      FROM delivery_record dr
      LEFT JOIN data_issue di ON dr.id = di.record_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      sql += ' AND dr.status = ?';
      params.push(filters.status);
    }
    if (filters.source) {
      sql += ' AND dr.source = ?';
      params.push(filters.source);
    }
    if (filters.searchText) {
      sql += ' AND (dr.market_name LIKE ? OR dr.location LIKE ? OR dr.truck_number LIKE ?)';
      const search = `%${filters.searchText}%`;
      params.push(search, search, search);
    }
    if (filters.goodsType) {
      sql += ' AND dr.goods_type = ?';
      params.push(filters.goodsType);
    }

    sql += ' GROUP BY dr.id ORDER BY dr.created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(row => this.mapRowToRecord(row));
  }

  findById(id: string): DeliveryRecord | null {
    const row = this.db.prepare(`
      SELECT dr.*,
             json_group_array(
               json_object(
                 'id', di.id,
                 'type', di.type,
                 'severity', di.severity,
                 'description', di.description,
                 'suggestion', di.suggestion,
                 'resolved', di.resolved
               )
             ) as issues_json
      FROM delivery_record dr
      LEFT JOIN data_issue di ON dr.id = di.record_id
      WHERE dr.id = ?
      GROUP BY dr.id
    `).get(id) as any;

    if (!row) return null;
    return this.mapRowToRecord(row);
  }

  create(record: Omit<DeliveryRecord, 'id' | 'createdAt' | 'updatedAt' | 'issues'>): string {
    const id = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO delivery_record (
        id, record_id, market_name, market_name_raw, location, location_raw,
        coordinates_lat, coordinates_lng, coordinates_raw_lat, coordinates_raw_lng,
        delivery_time, delivery_time_raw, truck_number, truck_number_raw,
        goods_type, goods_type_raw, status, source, source_file
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      record.recordId,
      record.marketName,
      record.marketNameRaw,
      record.location,
      record.locationRaw,
      record.coordinates.lat,
      record.coordinates.lng,
      record.coordinatesRaw.lat,
      record.coordinatesRaw.lng,
      record.deliveryTime,
      record.deliveryTimeRaw,
      record.truckNumber,
      record.truckNumberRaw,
      record.goodsType,
      record.goodsTypeRaw,
      record.status,
      record.source,
      record.sourceFile
    );
    return id;
  }

  update(id: string, updates: Partial<DeliveryRecord>): void {
    const fields: string[] = [];
    const params: any[] = [];

    const fieldMap: Record<string, string> = {
      recordId: 'record_id',
      marketName: 'market_name',
      location: 'location',
      deliveryTime: 'delivery_time',
      truckNumber: 'truck_number',
      goodsType: 'goods_type',
      status: 'status',
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'coordinates') {
        fields.push('coordinates_lat = ?', 'coordinates_lng = ?');
        params.push((value as any).lat, (value as any).lng);
      } else if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = ?`);
        params.push(value);
      }
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    this.db.prepare(`
      UPDATE delivery_record SET ${fields.join(', ')} WHERE id = ?
    `).run(...params);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM delivery_record WHERE id = ?').run(id);
  }

  addIssue(recordId: string, issue: Omit<DataIssue, 'id' | 'resolved'>): string {
    const id = `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.db.prepare(`
      INSERT INTO data_issue (id, record_id, type, severity, description, suggestion)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, recordId, issue.type, issue.severity, issue.description, issue.suggestion);
    return id;
  }

  resolveIssue(issueId: string): void {
    this.db.prepare('UPDATE data_issue SET resolved = 1 WHERE id = ?').run(issueId);
  }

  getIssues(recordId: string): DataIssue[] {
    return this.db.prepare(`
      SELECT * FROM data_issue WHERE record_id = ? ORDER BY created_at DESC
    `).all(recordId) as DataIssue[];
  }

  private mapRowToRecord(row: any): DeliveryRecord {
    let issues: DataIssue[] = [];
    try {
      const parsed = JSON.parse(row.issues_json);
      if (Array.isArray(parsed) && parsed[0]?.id) {
        issues = parsed;
      }
    } catch (e) {
      // ignore parse error
    }

    return {
      id: row.id,
      recordId: row.record_id,
      marketName: row.market_name,
      marketNameRaw: row.market_name_raw,
      location: row.location,
      locationRaw: row.location_raw,
      coordinates: {
        lat: row.coordinates_lat,
        lng: row.coordinates_lng,
      },
      coordinatesRaw: {
        lat: row.coordinates_raw_lat,
        lng: row.coordinates_raw_lng,
      },
      deliveryTime: row.delivery_time || '',
      deliveryTimeRaw: row.delivery_time_raw || '',
      truckNumber: row.truck_number || '',
      truckNumberRaw: row.truck_number_raw || '',
      goodsType: row.goods_type || '',
      goodsTypeRaw: row.goods_type_raw || '',
      status: row.status as any,
      source: row.source as any,
      sourceFile: row.source_file || undefined,
      issues,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
