import { AppDataSource } from '../config/database';
import {
  SampleLabel,
  TemperatureRecord,
  TemperatureStatus,
  StoreComplaint,
  ComplaintType,
  ComplaintStatus,
  StoreHandover,
  HandoverStatus,
} from '../entities';
import { SampleLabelService } from './SampleLabelService';

export interface GenerateDataOptions {
  batchNo: string;
  potNo: string;
  productName?: string;
  storeCount?: number;
  hasAbnormalTemp?: boolean;
  hasComplaint?: boolean;
  operator: string;
}

const STORES = [
  { code: 'ST001', name: '中心店' },
  { code: 'ST002', name: '东区店' },
  { code: 'ST003', name: '西区店' },
  { code: 'ST004', name: '南区店' },
  { code: 'ST005', name: '北区店' },
  { code: 'ST006', name: '科技园店' },
  { code: 'ST007', name: '商业街店' },
  { code: 'ST008', name: '大学城店' },
];

export class DataGenerator {
  private sampleService: SampleLabelService;

  constructor() {
    this.sampleService = new SampleLabelService();
  }

  async generateBatchData(options: GenerateDataOptions): Promise<{
    sampleLabel: SampleLabel;
    temperatureRecords: TemperatureRecord[];
    handovers: StoreHandover[];
    complaints: StoreComplaint[];
  }> {
    const {
      batchNo,
      potNo,
      productName = '招牌红烧肉',
      storeCount = 5,
      hasAbnormalTemp = false,
      hasComplaint = false,
      operator,
    } = options;

    const productionTime = new Date();

    const sampleLabel = await this.sampleService.create({
      batchNo,
      potNo,
      productName,
      productionTime,
      producer: '张师傅',
      quantity: 50,
      unit: '份',
      shelfNo: 'A-01',
      operator,
      sourceSystem: 'batch-generator',
    });

    await this.sampleService.submit(sampleLabel.id, operator);

    const tempRecords = await this.generateTemperatureRecords(
      batchNo,
      potNo,
      productionTime,
      hasAbnormalTemp,
      operator
    );

    const handovers = await this.generateHandovers(
      batchNo,
      potNo,
      productName,
      productionTime,
      storeCount,
      operator
    );

    const complaints: StoreComplaint[] = [];
    if (hasComplaint && handovers.length > 0) {
      const complaint = await this.generateComplaint(
        batchNo,
        potNo,
        handovers[0],
        operator
      );
      complaints.push(complaint);
    }

    return {
      sampleLabel,
      temperatureRecords: tempRecords,
      handovers,
      complaints,
    };
  }

  private async generateTemperatureRecords(
    batchNo: string,
    potNo: string,
    productionTime: Date,
    hasAbnormal: boolean,
    operator: string
  ): Promise<TemperatureRecord[]> {
    const tempRepo = AppDataSource.getRepository(TemperatureRecord);
    const records: TemperatureRecord[] = [];

    for (let i = 0; i < 6; i++) {
      const recordTime = new Date(productionTime.getTime() + i * 30 * 60 * 1000);
      let temp = 4.0 + Math.random() * 2;
      let status = TemperatureStatus.NORMAL;

      if (hasAbnormal && i === 3) {
        temp = 12.5;
        status = TemperatureStatus.ABNORMAL;
      }

      const record = tempRepo.create({
        batchNo,
        potNo,
        recordTime,
        temperature: temp,
        deviceId: 'TEMP-001',
        deviceLocation: '冷藏库A区',
        status,
        minThreshold: 0,
        maxThreshold: 6,
        recordedBy: operator,
        createdBy: operator,
        updatedBy: operator,
      });

      records.push(await tempRepo.save(record));
    }

    return records;
  }

  private async generateHandovers(
    batchNo: string,
    potNo: string,
    productName: string,
    productionTime: Date,
    storeCount: number,
    operator: string
  ): Promise<StoreHandover[]> {
    const handoverRepo = AppDataSource.getRepository(StoreHandover);
    const handovers: StoreHandover[] = [];

    const selectedStores = STORES.slice(0, Math.min(storeCount, STORES.length));

    for (let i = 0; i < selectedStores.length; i++) {
      const store = selectedStores[i];
      const handoverNo = `HO-${Date.now()}-${String(i + 1).padStart(3, '0')}`;
      const quantity = 5 + Math.floor(Math.random() * 10);
      const statuses = [
        HandoverStatus.RECEIVED,
        HandoverStatus.RECEIVED,
        HandoverStatus.DELIVERED,
      ];
      const status = statuses[i % statuses.length];

      const handoverData = {
        handoverNo,
        batchNo,
        potNo,
        storeName: store.name,
        storeCode: store.code,
        productName,
        deliveredQuantity: quantity,
        receivedQuantity: status === HandoverStatus.RECEIVED ? quantity : 0,
        returnedQuantity: 0,
        unit: '份',
        deliveryTime: new Date(productionTime.getTime() + 2 * 60 * 60 * 1000),
        receivedTime:
          status === HandoverStatus.RECEIVED
            ? new Date(productionTime.getTime() + 3 * 60 * 60 * 1000)
            : null,
        deliveryPerson: '李司机',
        receiver: status === HandoverStatus.RECEIVED ? `${store.name}店长` : null,
        status,
        vehicleNo: '京A12345',
        temperatureOnArrival: 5.2,
        createdBy: operator,
        updatedBy: operator,
      };

      const handover = handoverRepo.create(handoverData as any);
      const savedHandover = await handoverRepo.save(handover) as unknown as StoreHandover;
      handovers.push(savedHandover);
    }

    return handovers;
  }

  private async generateComplaint(
    batchNo: string,
    potNo: string,
    handover: StoreHandover,
    operator: string
  ): Promise<StoreComplaint> {
    const complaintRepo = AppDataSource.getRepository(StoreComplaint);
    const complaintNo = `CP-${Date.now()}`;

    const complaint = complaintRepo.create({
      complaintNo,
      batchNo,
      potNo,
      storeName: handover.storeName,
      storeCode: handover.storeCode,
      complaintType: ComplaintType.TASTE,
      incidentTime: new Date(),
      description: '顾客反映菜品口感偏咸，怀疑是调味过程出现问题。已有3位顾客反馈相同问题。',
      reporter: '王店长',
      reporterPhone: '13800138000',
      status: ComplaintStatus.INVESTIGATING,
      handler: '品控专员',
      affectedQuantity: 10,
      attachments: ['sms_screenshot_001.jpg'],
      createdBy: operator,
      updatedBy: operator,
    });

    return await complaintRepo.save(complaint);
  }
}