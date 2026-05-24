import { Transaction } from 'sequelize';
import sequelize from '../database/connection';
import { WaveOrder, PickingDifference, ReviewScan } from '../models';
import {
  DataSourceType,
  WaveOrderData,
  PickingDifferenceData,
  ReviewScanData,
  SourceData,
} from '../types';
import logger from '../utils/logger';

class DataProcessingService {
  async processWaveOrder(
    data: WaveOrderData,
    batchId?: string
  ): Promise<WaveOrder> {
    const t = await sequelize.transaction();
    
    try {
      const existing = await WaveOrder.findOne({
        where: {
          waveNo: data.waveNo,
          warehouseCode: data.warehouseCode,
        },
        transaction: t,
      });

      const waveData = {
        waveNo: data.waveNo,
        warehouseCode: data.warehouseCode,
        waveType: data.waveType,
        pickerId: data.pickerId,
        pickerName: data.pickerName,
        totalOrders: data.totalOrders,
        totalSkus: data.totalSkus,
        totalQty: data.totalQty,
        pickedQty: data.pickedQty,
        status: data.status,
        waveStartTime: data.waveStartTime ? new Date(data.waveStartTime) : undefined,
        waveEndTime: data.waveEndTime ? new Date(data.waveEndTime) : undefined,
        performanceData: data.performanceData,
        inventoryData: data.inventoryData,
        extra: data.extra,
        batchId,
      };

      let result: WaveOrder;
      if (existing) {
        await existing.update(waveData, { transaction: t });
        result = existing;
        logger.info(`更新波次单: ${data.waveNo}`);
      } else {
        result = await WaveOrder.create(waveData, { transaction: t });
        logger.info(`创建波次单: ${data.waveNo}`);
      }

      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      logger.error(`处理波次单失败: ${data.waveNo}`, error);
      throw error;
    }
  }

  async processPickingDifference(
    data: PickingDifferenceData,
    batchId?: string
  ): Promise<PickingDifference> {
    const t = await sequelize.transaction();
    
    try {
      const existing = await PickingDifference.findOne({
        where: {
          differenceNo: data.differenceNo,
          warehouseCode: data.warehouseCode,
        },
        transaction: t,
      });

      const diffData = {
        differenceNo: data.differenceNo,
        waveNo: data.waveNo,
        warehouseCode: data.warehouseCode,
        orderNo: data.orderNo,
        skuCode: data.skuCode,
        expectedQty: data.expectedQty,
        actualQty: data.actualQty,
        differenceQty: data.differenceQty,
        differenceType: data.differenceType,
        differenceReason: data.differenceReason,
        handlerId: data.handlerId,
        handlerName: data.handlerName,
        isResolved: data.isResolved,
        resolution: data.resolution,
        extra: data.extra,
        batchId,
      };

      let result: PickingDifference;
      if (existing) {
        await existing.update(diffData, { transaction: t });
        result = existing;
        logger.info(`更新拣货差异: ${data.differenceNo}`);
      } else {
        result = await PickingDifference.create(diffData, { transaction: t });
        logger.info(`创建拣货差异: ${data.differenceNo}`);
      }

      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      logger.error(`处理拣货差异失败: ${data.differenceNo}`, error);
      throw error;
    }
  }

  async processReviewScan(
    data: ReviewScanData,
    batchId?: string
  ): Promise<ReviewScan> {
    const t = await sequelize.transaction();
    
    try {
      const existing = await ReviewScan.findOne({
        where: {
          scanNo: data.scanNo,
          warehouseCode: data.warehouseCode,
        },
        transaction: t,
      });

      const scanData = {
        scanNo: data.scanNo,
        waveNo: data.waveNo,
        warehouseCode: data.warehouseCode,
        orderNo: data.orderNo,
        skuCode: data.skuCode,
        scannedQty: data.scannedQty,
        scannerId: data.scannerId,
        scannerName: data.scannerName,
        scanTime: new Date(data.scanTime),
        isAnomaly: data.isAnomaly,
        anomalyType: data.anomalyType,
        extra: data.extra,
        batchId,
      };

      let result: ReviewScan;
      if (existing) {
        await existing.update(scanData, { transaction: t });
        result = existing;
        logger.info(`更新复核扫描: ${data.scanNo}`);
      } else {
        result = await ReviewScan.create(scanData, { transaction: t });
        logger.info(`创建复核扫描: ${data.scanNo}`);
      }

      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      logger.error(`处理复核扫描失败: ${data.scanNo}`, error);
      throw error;
    }
  }

  async processData(
    sourceType: DataSourceType,
    sourceData: SourceData,
    batchId?: string
  ): Promise<WaveOrder | PickingDifference | ReviewScan> {
    switch (sourceType) {
      case DataSourceType.WAVE_ORDER:
        return this.processWaveOrder(sourceData as WaveOrderData, batchId);
      case DataSourceType.PICKING_DIFFERENCE:
        return this.processPickingDifference(sourceData as PickingDifferenceData, batchId);
      case DataSourceType.REVIEW_SCAN:
        return this.processReviewScan(sourceData as ReviewScanData, batchId);
      default:
        throw new Error(`不支持的数据源类型: ${sourceType}`);
    }
  }
}

export const dataProcessingService = new DataProcessingService();
