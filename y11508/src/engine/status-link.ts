import dayjs from 'dayjs';
import { DatabaseService } from '../db/service';
import { DeviceStatus, RecordStatus } from '../types';

export interface StatusLinkResult {
  deviceId: string;
  deviceCode: string;
  oldStatus: DeviceStatus;
  newStatus: DeviceStatus;
  reason: string;
  triggeredBy: string;
}

export class StatusLinkEngine {
  private dbService: DatabaseService;
  private systemUser = 'system_engine';

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async checkAndUpdateExpiredCertificates(): Promise<StatusLinkResult[]> {
    const results: StatusLinkResult[] = [];
    const expiredCerts = await this.dbService.getExpiredCertificates();

    for (const cert of expiredCerts) {
      const device = await this.dbService.findDeviceByCode(cert.deviceCode);
      if (!device) continue;

      if (device.status === DeviceStatus.NORMAL || device.status === DeviceStatus.MAINTENANCE) {
        const oldStatus = device.status;
        const reason = `校准证书过期: ${cert.certificateNo}, 过期日期: ${dayjs(cert.expiryDate).format('YYYY-MM-DD')}`;

        await this.dbService.updateDeviceStatus(
          device.id,
          DeviceStatus.CERT_EXPIRED,
          this.systemUser,
          reason
        );

        results.push({
          deviceId: device.id,
          deviceCode: device.deviceCode,
          oldStatus,
          newStatus: DeviceStatus.CERT_EXPIRED,
          reason,
          triggeredBy: this.systemUser
        });
      }
    }

    return results;
  }

  async checkCertificateRenewal(deviceCode: string): Promise<StatusLinkResult | null> {
    const device = await this.dbService.findDeviceByCode(deviceCode);
    if (!device) return null;

    if (device.status !== DeviceStatus.CERT_EXPIRED) {
      return null;
    }

    const now = new Date();
    const validCerts = await this.dbService.getCalibrationRepository()
      .createQueryBuilder('cert')
      .where('cert.deviceCode = :deviceCode', { deviceCode })
      .andWhere('cert.expiryDate > :now', { now })
      .andWhere('cert.status = :status', { status: RecordStatus.CONFIRMED })
      .andWhere('cert.conclusion = :conclusion', { conclusion: 'pass' })
      .getMany();

    if (validCerts.length > 0) {
      const oldStatus = device.status;
      const reason = `证书已更新，最新有效证书: ${validCerts[0].certificateNo}`;

      await this.dbService.updateDeviceStatus(
        device.id,
        DeviceStatus.NORMAL,
        this.systemUser,
        reason
      );

      return {
        deviceId: device.id,
        deviceCode: device.deviceCode,
        oldStatus,
        newStatus: DeviceStatus.NORMAL,
        reason,
        triggeredBy: this.systemUser
      };
    }

    return null;
  }

  async deactivateDevice(
    deviceCode: string,
    operator: string,
    reason: string
  ): Promise<StatusLinkResult | null> {
    const device = await this.dbService.findDeviceByCode(deviceCode);
    if (!device) return null;

    const oldStatus = device.status;
    const fullReason = `设备停用: ${reason}`;

    await this.dbService.updateDeviceStatus(
      device.id,
      DeviceStatus.DEACTIVATED,
      operator,
      fullReason
    );

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      oldStatus,
      newStatus: DeviceStatus.DEACTIVATED,
      reason: fullReason,
      triggeredBy: operator
    };
  }

  async activateDevice(
    deviceCode: string,
    operator: string,
    reason: string
  ): Promise<StatusLinkResult | null> {
    const device = await this.dbService.findDeviceByCode(deviceCode);
    if (!device) return null;

    if (device.status !== DeviceStatus.DEACTIVATED) {
      return null;
    }

    const oldStatus = device.status;
    const fullReason = `设备重新启用: ${reason}`;

    const renewalResult = await this.checkCertificateRenewal(deviceCode);
    const newStatus = renewalResult ? DeviceStatus.NORMAL : device.status;

    if (!renewalResult) {
      await this.dbService.updateDeviceStatus(
        device.id,
        DeviceStatus.NORMAL,
        operator,
        fullReason
      );
    }

    return {
      deviceId: device.id,
      deviceCode: device.deviceCode,
      oldStatus,
      newStatus: DeviceStatus.NORMAL,
      reason: fullReason,
      triggeredBy: operator
    };
  }

  async runFullStatusCheck(): Promise<StatusLinkResult[]> {
    const results: StatusLinkResult[] = [];

    const expiredResults = await this.checkAndUpdateExpiredCertificates();
    results.push(...expiredResults);

    const devices = await this.dbService.getDevices();
    for (const device of devices) {
      if (device.status === DeviceStatus.CERT_EXPIRED) {
        const renewalResult = await this.checkCertificateRenewal(device.deviceCode);
        if (renewalResult) {
          results.push(renewalResult);
        }
      }
    }

    return results;
  }

  getDeviceStatusSummary(): Promise<{ status: DeviceStatus; count: number }[]> {
    return this.dbService.getDeviceRepository()
      .createQueryBuilder('device')
      .select('device.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.status')
      .getRawMany();
  }
}