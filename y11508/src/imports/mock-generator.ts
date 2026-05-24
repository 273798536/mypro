import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import { DatabaseService } from '../db/service';
import { DeviceStatus, RecordStatus, Role, ImportSource } from '../types';

export class MockDataGenerator {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  private randomFromArray<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  async generateUsers(): Promise<void> {
    const users = [
      { username: 'admin', role: Role.SUPERVISOR, department: '设备科' },
      { username: 'reviewer01', role: Role.REVIEWER, department: '设备科' },
      { username: 'entry01', role: Role.DATA_ENTRY, department: '设备科' },
      { username: 'entry02', role: Role.DATA_ENTRY, department: '检验科' },
      { username: 'viewer01', role: Role.READ_ONLY, department: '院感科' },
      { username: 'nurse_head', role: Role.SUPERVISOR, department: '护理部' }
    ];

    for (const user of users) {
      const existing = await this.dbService.findUserByUsername(user.username);
      if (!existing) {
        await this.dbService.createUser(user.username, user.role, user.department);
      }
    }
  }

  async generateDevices(count: number = 20): Promise<void> {
    const departments = ['内科', '外科', '检验科', '放射科', '急诊科', 'ICU'];
    const deviceTypes = [
      { name: '心电监护仪', prefix: 'ECG' },
      { name: '输液泵', prefix: 'INF' },
      { name: '呼吸机', prefix: 'VEN' },
      { name: '除颤仪', prefix: 'DEF' },
      { name: '血糖仪', prefix: 'GLU' },
      { name: '注射泵', prefix: 'SYR' }
    ];

    const existing = await this.dbService.getDevices();
    if (existing.length > 0) return;

    for (let i = 0; i < count; i++) {
      const deviceType = this.randomFromArray(deviceTypes);
      const deviceCode = `${deviceType.prefix}-${String(i + 1).padStart(4, '0')}`;
      await this.dbService.createDevice({
        deviceCode,
        deviceName: deviceType.name,
        department: this.randomFromArray(departments),
        status: DeviceStatus.NORMAL
      });
    }
  }

  async generateInspectionRecords(count: number = 50): Promise<void> {
    const devices = await this.dbService.getDevices();
    if (devices.length === 0) return;

    const inspectors = ['张三', '李四', '王五', '赵六'];
    const conclusions = ['合格', '基本合格', '待整改'];
    const items = ['外观', '功能', '清洁度', '附件完整性'];

    const existing = await this.dbService.getInspectionRecords();
    const startNo = existing.length + 1;

    for (let i = 0; i < count; i++) {
      const device = this.randomFromArray(devices);
      const inspectionItems: Record<string, string> = {};
      items.forEach(item => {
        inspectionItems[item] = this.randomFromArray(['正常', '良好', '需注意']);
      });

      await this.dbService.createInspectionRecord({
        recordNo: `INSP-${String(startNo + i).padStart(6, '0')}`,
        deviceId: device.id,
        deviceCode: device.deviceCode,
        inspector: this.randomFromArray(inspectors),
        inspectionDate: this.randomDate(
          dayjs().subtract(3, 'month').toDate(),
          new Date()
        ),
        inspectionItems,
        conclusion: this.randomFromArray(conclusions),
        remarks: Math.random() > 0.7 ? '备注信息' : '',
        status: this.randomFromArray([
          RecordStatus.DRAFT,
          RecordStatus.SUBMITTED,
          RecordStatus.REVIEWED,
          RecordStatus.CONFIRMED
        ]),
        createdBy: 'entry01'
      });
    }
  }

  async generateCalibrationCertificates(count: number = 30): Promise<void> {
    const devices = await this.dbService.getDevices();
    if (devices.length === 0) return;

    const agencies = ['市计量所', '省计量院', '第三方校准机构A', '第三方校准机构B'];

    const existing = await this.dbService.getCalibrationCertificates();
    const startNo = existing.length + 1;

    for (let i = 0; i < count; i++) {
      const device = this.randomFromArray(devices);
      const calibrationDate = this.randomDate(
        dayjs().subtract(12, 'month').toDate(),
        new Date()
      );
      const isExpired = Math.random() > 0.7;
      const expiryDate = isExpired
        ? dayjs(calibrationDate).add(6, 'month').toDate()
        : dayjs(calibrationDate).add(12, 'month').toDate();

      await this.dbService.createCalibrationCertificate({
        certificateNo: `CERT-${String(startNo + i).padStart(6, '0')}`,
        deviceId: device.id,
        deviceCode: device.deviceCode,
        calibrationAgency: this.randomFromArray(agencies),
        calibrationDate,
        expiryDate,
        calibrationItems: ['示值误差', '重复性', '稳定性'],
        conclusion: this.randomFromArray<'pass' | 'fail' | 'conditional'>(['pass', 'pass', 'pass', 'conditional']),
        fileUrl: `/uploads/cert-${startNo + i}.pdf`,
        status: this.randomFromArray([
          RecordStatus.SUBMITTED,
          RecordStatus.REVIEWED,
          RecordStatus.CONFIRMED
        ]),
        createdBy: 'entry01'
      });
    }
  }

  async generateMaintenanceQuotes(count: number = 15): Promise<void> {
    const devices = await this.dbService.getDevices();
    if (devices.length === 0) return;

    const vendors = ['维修服务商A', '维修服务商B', '原厂维修', '第三方维修'];

    const existing = await this.dbService.getMaintenanceQuotes();
    const startNo = existing.length + 1;

    for (let i = 0; i < count; i++) {
      const device = this.randomFromArray(devices);

      await this.dbService.createMaintenanceQuote({
        quoteNo: `QUOTE-${String(startNo + i).padStart(6, '0')}`,
        deviceId: device.id,
        deviceCode: device.deviceCode,
        vendor: this.randomFromArray(vendors),
        quoteDate: this.randomDate(
          dayjs().subtract(2, 'month').toDate(),
          new Date()
        ),
        estimatedCost: Math.floor(Math.random() * 5000) + 500,
        maintenanceItems: ['更换配件', '清洁保养', '功能调试', '软件升级'].slice(0, Math.floor(Math.random() * 3) + 1),
        status: this.randomFromArray([
          RecordStatus.DRAFT,
          RecordStatus.SUBMITTED,
          RecordStatus.CONFIRMED
        ]),
        approvalStatus: this.randomFromArray<'pending' | 'approved' | 'rejected'>(['pending', 'approved', 'approved']),
        createdBy: 'entry01'
      });
    }
  }

  async generateSecondaryConfirms(count: number = 20): Promise<void> {
    const devices = await this.dbService.getDevices();
    const inspections = await this.dbService.getInspectionRecords();
    if (devices.length === 0 || inspections.length === 0) return;

    const confirmers = ['王主管', '李护士长', '张主任'];

    const existing = await this.dbService.getSecondaryConfirms();
    const startNo = existing.length + 1;

    for (let i = 0; i < count; i++) {
      const device = this.randomFromArray(devices);
      const inspection = this.randomFromArray(inspections);

      await this.dbService.createSecondaryConfirm({
        confirmNo: `CONF-${String(startNo + i).padStart(6, '0')}`,
        relatedRecordType: ImportSource.INSPECTION,
        relatedRecordId: inspection.id,
        deviceId: device.id,
        deviceCode: device.deviceCode,
        confirmer: this.randomFromArray(confirmers),
        confirmDate: this.randomDate(
          dayjs().subtract(1, 'month').toDate(),
          new Date()
        ),
        confirmContent: '已复核相关记录，数据真实有效',
        status: this.randomFromArray([
          RecordStatus.SUBMITTED,
          RecordStatus.CONFIRMED
        ]),
        createdBy: 'reviewer01'
      });
    }
  }

  async generateAllMockData(): Promise<void> {
    console.log('开始生成测试数据...');

    await this.generateUsers();
    console.log('✓ 用户数据生成完成');

    await this.generateDevices(20);
    console.log('✓ 设备数据生成完成');

    await this.generateInspectionRecords(50);
    console.log('✓ 巡检记录生成完成');

    await this.generateCalibrationCertificates(30);
    console.log('✓ 校准证书生成完成');

    await this.generateMaintenanceQuotes(15);
    console.log('✓ 维修报价生成完成');

    await this.generateSecondaryConfirms(20);
    console.log('✓ 二次确认单生成完成');

    console.log('测试数据生成完成！');
  }
}