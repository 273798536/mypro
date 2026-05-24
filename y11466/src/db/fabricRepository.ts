import Database from 'better-sqlite3';
import { BaseRepository } from './baseRepository';
import { FabricRecord, FabricTransaction, FabricInventory, ImportSource, ConflictStrategy } from '../types';

interface FabricRecordRow {
  id: string;
  fabric_code: string;
  fabric_name: string;
  color: string;
  width: number | null;
  weight: number | null;
  unit: string;
  supplier: string | null;
  purchase_order_no: string | null;
  import_source: string;
  source_row_number: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

interface FabricTransactionRow {
  id: string;
  transaction_no: string;
  fabric_code: string;
  type: string;
  quantity: number;
  unit: string;
  unit_price: number | null;
  total_amount: number | null;
  related_sample_no: string | null;
  related_style_no: string | null;
  related_department: string | null;
  operator: string;
  transaction_time: string;
  warehouse: string;
  location: string | null;
  remarks: string | null;
  reference_no: string | null;
  import_source: string;
  source_row_number: number;
  version: number;
  is_latest: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

interface FabricInventoryRow {
  id: string;
  fabric_code: string;
  warehouse: string;
  location: string | null;
  opening_quantity: number;
  in_quantity: number;
  out_quantity: number;
  closing_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  unit: string;
  inventory_date: string;
  checked_by: string | null;
  checked_at: string | null;
  remarks: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export class FabricRepository extends BaseRepository<FabricRecord> {
  protected tableName = 'fabric_records';

  constructor(db: Database.Database) {
    super(db);
  }

  private rowToEntity(row: FabricRecordRow): FabricRecord {
    return {
      id: row.id,
      fabricCode: row.fabric_code,
      fabricName: row.fabric_name,
      color: row.color,
      width: row.width ?? undefined,
      weight: row.weight ?? undefined,
      unit: row.unit,
      supplier: row.supplier || undefined,
      purchaseOrderNo: row.purchase_order_no || undefined,
      importSource: this.deserialize<ImportSource>(row.import_source)!,
      sourceRowNumber: row.source_row_number,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Partial<FabricRecord>, createdBy: string): FabricRecord {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO fabric_records (
        id, fabric_code, fabric_name, color, width, weight, unit, supplier,
        purchase_order_no, import_source, source_row_number,
        created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @fabricCode, @fabricName, @color, @width, @weight, @unit, @supplier,
        @purchaseOrderNo, @importSource, @sourceRowNumber,
        @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      fabricCode: data.fabricCode,
      fabricName: data.fabricName,
      color: data.color,
      width: data.width ?? null,
      weight: data.weight ?? null,
      unit: data.unit,
      supplier: data.supplier || null,
      purchaseOrderNo: data.purchaseOrderNo || null,
      importSource: this.serialize(data.importSource),
      sourceRowNumber: data.sourceRowNumber,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<FabricRecord>, updatedBy: string): FabricRecord | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, string> = {
      fabricCode: 'fabric_code',
      fabricName: 'fabric_name',
      color: 'color',
      width: 'width',
      weight: 'weight',
      unit: 'unit',
      supplier: 'supplier',
      purchaseOrderNo: 'purchase_order_no'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key] && value !== undefined) {
        updates.push(`${fieldMappings[key]} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE fabric_records 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): FabricRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM fabric_records WHERE id = ?'
    ).get(id) as FabricRecordRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByFabricCode(fabricCode: string): FabricRecord | null {
    const row = this.db.prepare(
      'SELECT * FROM fabric_records WHERE fabric_code = ?'
    ).get(fabricCode) as FabricRecordRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }
}

export class FabricTransactionRepository extends BaseRepository<FabricTransaction> {
  protected tableName = 'fabric_transactions';

  constructor(db: Database.Database) {
    super(db);
  }

  private rowToEntity(row: FabricTransactionRow): FabricTransaction {
    return {
      id: row.id,
      transactionNo: row.transaction_no,
      fabricCode: row.fabric_code,
      type: row.type as FabricTransaction['type'],
      quantity: row.quantity,
      unit: row.unit,
      unitPrice: row.unit_price ?? undefined,
      totalAmount: row.total_amount ?? undefined,
      relatedSampleNo: row.related_sample_no || undefined,
      relatedStyleNo: row.related_style_no || undefined,
      relatedDepartment: row.related_department || undefined,
      operator: row.operator,
      transactionTime: row.transaction_time,
      warehouse: row.warehouse,
      location: row.location || undefined,
      remarks: row.remarks || undefined,
      referenceNo: row.reference_no || undefined,
      importSource: this.deserialize<ImportSource>(row.import_source)!,
      sourceRowNumber: row.source_row_number,
      version: row.version,
      isLatest: row.is_latest === 1,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Partial<FabricTransaction>, createdBy: string): FabricTransaction {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO fabric_transactions (
        id, transaction_no, fabric_code, type, quantity, unit, unit_price, total_amount,
        related_sample_no, related_style_no, related_department, operator, transaction_time,
        warehouse, location, remarks, reference_no, import_source, source_row_number,
        version, is_latest, created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @transactionNo, @fabricCode, @type, @quantity, @unit, @unitPrice, @totalAmount,
        @relatedSampleNo, @relatedStyleNo, @relatedDepartment, @operator, @transactionTime,
        @warehouse, @location, @remarks, @referenceNo, @importSource, @sourceRowNumber,
        1, 1, @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      transactionNo: data.transactionNo,
      fabricCode: data.fabricCode,
      type: data.type,
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice ?? null,
      totalAmount: data.totalAmount ?? null,
      relatedSampleNo: data.relatedSampleNo || null,
      relatedStyleNo: data.relatedStyleNo || null,
      relatedDepartment: data.relatedDepartment || null,
      operator: data.operator,
      transactionTime: data.transactionTime,
      warehouse: data.warehouse,
      location: data.location || null,
      remarks: data.remarks || null,
      referenceNo: data.referenceNo || null,
      importSource: this.serialize(data.importSource),
      sourceRowNumber: data.sourceRowNumber,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<FabricTransaction>, updatedBy: string): FabricTransaction | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, string> = {
      transactionNo: 'transaction_no',
      fabricCode: 'fabric_code',
      type: 'type',
      quantity: 'quantity',
      unit: 'unit',
      unitPrice: 'unit_price',
      totalAmount: 'total_amount',
      relatedSampleNo: 'related_sample_no',
      relatedStyleNo: 'related_style_no',
      relatedDepartment: 'related_department',
      operator: 'operator',
      transactionTime: 'transaction_time',
      warehouse: 'warehouse',
      location: 'location',
      remarks: 'remarks',
      referenceNo: 'reference_no'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key] && value !== undefined) {
        updates.push(`${fieldMappings[key]} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE fabric_transactions 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): FabricTransaction | null {
    const row = this.db.prepare(
      'SELECT * FROM fabric_transactions WHERE id = ?'
    ).get(id) as FabricTransactionRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByTransactionNo(transactionNo: string, latestOnly = true): FabricTransaction[] {
    let sql = 'SELECT * FROM fabric_transactions WHERE transaction_no = ?';
    const params: (string | number)[] = [transactionNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY version DESC';

    const rows = this.db.prepare(sql).all(params) as FabricTransactionRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findByFabricCode(fabricCode: string, latestOnly = true): FabricTransaction[] {
    let sql = 'SELECT * FROM fabric_transactions WHERE fabric_code = ?';
    const params: (string | number)[] = [fabricCode];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY transaction_time DESC, version DESC';

    const rows = this.db.prepare(sql).all(params) as FabricTransactionRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  findBySampleNo(sampleNo: string, latestOnly = true): FabricTransaction[] {
    let sql = 'SELECT * FROM fabric_transactions WHERE related_sample_no = ?';
    const params: (string | number)[] = [sampleNo];
    
    if (latestOnly) {
      sql += ' AND is_latest = 1';
    }
    sql += ' ORDER BY transaction_time DESC, version DESC';

    const rows = this.db.prepare(sql).all(params) as FabricTransactionRow[];
    return rows.map(row => this.rowToEntity(row));
  }

  async upsertWithVersion(
    data: Omit<FabricTransaction, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'version' | 'isLatest'>,
    createdBy: string,
    strategy: ConflictStrategy
  ): Promise<{
    created: boolean;
    updated: boolean;
    skipped: boolean;
    version: number;
  }> {
    const dbData: Record<string, unknown> = {
      transaction_no: data.transactionNo,
      fabric_code: data.fabricCode,
      type: data.type,
      quantity: data.quantity,
      unit: data.unit,
      unit_price: data.unitPrice ?? null,
      total_amount: data.totalAmount ?? null,
      related_sample_no: data.relatedSampleNo || null,
      related_style_no: data.relatedStyleNo || null,
      related_department: data.relatedDepartment || null,
      operator: data.operator,
      transaction_time: data.transactionTime,
      warehouse: data.warehouse,
      location: data.location || null,
      remarks: data.remarks || null,
      reference_no: data.referenceNo || null,
      import_source: this.serialize(data.importSource),
      source_row_number: data.sourceRowNumber
    };

    return this.handleVersionedUpsert('transaction_no', data.transactionNo, dbData, createdBy, strategy);
  }
}

export class FabricInventoryRepository extends BaseRepository<FabricInventory> {
  protected tableName = 'fabric_inventory';

  constructor(db: Database.Database) {
    super(db);
  }

  private rowToEntity(row: FabricInventoryRow): FabricInventory {
    return {
      id: row.id,
      fabricCode: row.fabric_code,
      warehouse: row.warehouse,
      location: row.location || undefined,
      openingQuantity: row.opening_quantity,
      inQuantity: row.in_quantity,
      outQuantity: row.out_quantity,
      closingQuantity: row.closing_quantity,
      reservedQuantity: row.reserved_quantity,
      availableQuantity: row.available_quantity,
      unit: row.unit,
      inventoryDate: row.inventory_date,
      checkedBy: row.checked_by || undefined,
      checkedAt: row.checked_at || undefined,
      remarks: row.remarks || undefined,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  create(data: Partial<FabricInventory>, createdBy: string): FabricInventory {
    const id = this.generateId();
    const now = this.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO fabric_inventory (
        id, fabric_code, warehouse, location, opening_quantity, in_quantity, out_quantity,
        closing_quantity, reserved_quantity, available_quantity, unit, inventory_date,
        checked_by, checked_at, remarks, created_by, updated_by, created_at, updated_at
      ) VALUES (
        @id, @fabricCode, @warehouse, @location, @openingQuantity, @inQuantity, @outQuantity,
        @closingQuantity, @reservedQuantity, @availableQuantity, @unit, @inventoryDate,
        @checkedBy, @checkedAt, @remarks, @createdBy, @createdBy, @createdAt, @createdAt
      )
    `);

    stmt.run({
      id,
      fabricCode: data.fabricCode,
      warehouse: data.warehouse,
      location: data.location || null,
      openingQuantity: data.openingQuantity || 0,
      inQuantity: data.inQuantity || 0,
      outQuantity: data.outQuantity || 0,
      closingQuantity: data.closingQuantity || 0,
      reservedQuantity: data.reservedQuantity || 0,
      availableQuantity: data.availableQuantity || 0,
      unit: data.unit,
      inventoryDate: data.inventoryDate,
      checkedBy: data.checkedBy || null,
      checkedAt: data.checkedAt || null,
      remarks: data.remarks || null,
      createdBy,
      createdAt: now
    });

    return this.findById(id)!;
  }

  update(id: string, data: Partial<FabricInventory>, updatedBy: string): FabricInventory | null {
    const now = this.now();
    const updates: string[] = [];
    const params: Record<string, unknown> = { id, updatedBy, updatedAt: now };

    const fieldMappings: Record<string, string> = {
      fabricCode: 'fabric_code',
      warehouse: 'warehouse',
      location: 'location',
      openingQuantity: 'opening_quantity',
      inQuantity: 'in_quantity',
      outQuantity: 'out_quantity',
      closingQuantity: 'closing_quantity',
      reservedQuantity: 'reserved_quantity',
      availableQuantity: 'available_quantity',
      unit: 'unit',
      inventoryDate: 'inventory_date',
      checkedBy: 'checked_by',
      checkedAt: 'checked_at',
      remarks: 'remarks'
    };

    for (const [key, value] of Object.entries(data)) {
      if (fieldMappings[key] && value !== undefined) {
        updates.push(`${fieldMappings[key]} = @${key}`);
        params[key] = value;
      }
    }

    if (updates.length === 0) return this.findById(id);

    const sql = `
      UPDATE fabric_inventory 
      SET ${updates.join(', ')}, updated_by = @updatedBy, updated_at = @updatedAt 
      WHERE id = @id
    `;

    this.db.prepare(sql).run(params);
    return this.findById(id);
  }

  findById(id: string): FabricInventory | null {
    const row = this.db.prepare(
      'SELECT * FROM fabric_inventory WHERE id = ?'
    ).get(id) as FabricInventoryRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }

  findByFabricAndDate(fabricCode: string, warehouse: string, inventoryDate: string): FabricInventory | null {
    const row = this.db.prepare(`
      SELECT * FROM fabric_inventory 
      WHERE fabric_code = ? AND warehouse = ? AND inventory_date = ?
    `).get(fabricCode, warehouse, inventoryDate) as FabricInventoryRow | undefined;
    
    return row ? this.rowToEntity(row) : null;
  }
}
