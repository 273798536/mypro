import { BaseRepository } from './BaseRepository.js';
import type { VehicleRecord } from '../../shared/types/index.js';

export class VehicleRepository extends BaseRepository<VehicleRecord> {
  protected tableName = 'vehicle_record';

  protected toModel(row: Record<string, unknown>): VehicleRecord {
    const model = this.convertRowToModel(row);
    return {
      id: model.id as string,
      vin: model.vin as string,
      plateNumber: model.plateNumber as string,
      brand: model.brand as string,
      model: model.model as string,
      purchasePrice: model.purchasePrice as number,
      storePrice: model.storePrice as number,
      storePriceUpdatedAt: model.storePriceUpdatedAt as string,
      storeId: model.storeId as string,
      storeName: model.storeName as string,
      createdAt: model.createdAt as string,
      updatedAt: model.updatedAt as string,
      importBatchId: model.importBatchId as string,
    };
  }

  protected toDatabase(model: Partial<VehicleRecord>): Record<string, unknown> {
    return {
      id: model.id,
      vin: model.vin,
      plate_number: model.plateNumber,
      brand: model.brand,
      model: model.model,
      purchase_price: model.purchasePrice,
      store_price: model.storePrice,
      store_price_updated_at: model.storePriceUpdatedAt,
      store_id: model.storeId,
      store_name: model.storeName,
      import_batch_id: model.importBatchId,
    };
  }

  findByVin(vin: string): VehicleRecord | null {
    return this.findOne({ where: { vin } });
  }

  findByStoreId(storeId: string): VehicleRecord[] {
    return this.findAll({ where: { storeId } });
  }

  findByBrand(brand: string): VehicleRecord[] {
    return this.findAll({ where: { brand } });
  }

  search(keyword: string): VehicleRecord[] {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE vin LIKE ? OR plate_number LIKE ? OR brand LIKE ? OR model LIKE ?
    `;
    const searchTerm = `%${keyword}%`;
    const rows = this.query(sql, searchTerm, searchTerm, searchTerm, searchTerm);
    return rows.map(row => this.toModel(row));
  }
}

export default VehicleRepository;
