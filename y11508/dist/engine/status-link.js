"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusLinkEngine = void 0;
const dayjs_1 = __importDefault(require("dayjs"));
const types_1 = require("../types");
class StatusLinkEngine {
    constructor(dbService) {
        this.systemUser = 'system_engine';
        this.dbService = dbService;
    }
    async checkAndUpdateExpiredCertificates() {
        const results = [];
        const expiredCerts = await this.dbService.getExpiredCertificates();
        for (const cert of expiredCerts) {
            const device = await this.dbService.findDeviceByCode(cert.deviceCode);
            if (!device)
                continue;
            if (device.status === types_1.DeviceStatus.NORMAL || device.status === types_1.DeviceStatus.MAINTENANCE) {
                const oldStatus = device.status;
                const reason = `校准证书过期: ${cert.certificateNo}, 过期日期: ${(0, dayjs_1.default)(cert.expiryDate).format('YYYY-MM-DD')}`;
                await this.dbService.updateDeviceStatus(device.id, types_1.DeviceStatus.CERT_EXPIRED, this.systemUser, reason);
                results.push({
                    deviceId: device.id,
                    deviceCode: device.deviceCode,
                    oldStatus,
                    newStatus: types_1.DeviceStatus.CERT_EXPIRED,
                    reason,
                    triggeredBy: this.systemUser
                });
            }
        }
        return results;
    }
    async checkCertificateRenewal(deviceCode) {
        const device = await this.dbService.findDeviceByCode(deviceCode);
        if (!device)
            return null;
        if (device.status !== types_1.DeviceStatus.CERT_EXPIRED) {
            return null;
        }
        const now = new Date();
        const validCerts = await this.dbService.getCalibrationRepository()
            .createQueryBuilder('cert')
            .where('cert.deviceCode = :deviceCode', { deviceCode })
            .andWhere('cert.expiryDate > :now', { now })
            .andWhere('cert.status = :status', { status: types_1.RecordStatus.CONFIRMED })
            .andWhere('cert.conclusion = :conclusion', { conclusion: 'pass' })
            .getMany();
        if (validCerts.length > 0) {
            const oldStatus = device.status;
            const reason = `证书已更新，最新有效证书: ${validCerts[0].certificateNo}`;
            await this.dbService.updateDeviceStatus(device.id, types_1.DeviceStatus.NORMAL, this.systemUser, reason);
            return {
                deviceId: device.id,
                deviceCode: device.deviceCode,
                oldStatus,
                newStatus: types_1.DeviceStatus.NORMAL,
                reason,
                triggeredBy: this.systemUser
            };
        }
        return null;
    }
    async deactivateDevice(deviceCode, operator, reason) {
        const device = await this.dbService.findDeviceByCode(deviceCode);
        if (!device)
            return null;
        const oldStatus = device.status;
        const fullReason = `设备停用: ${reason}`;
        await this.dbService.updateDeviceStatus(device.id, types_1.DeviceStatus.DEACTIVATED, operator, fullReason);
        return {
            deviceId: device.id,
            deviceCode: device.deviceCode,
            oldStatus,
            newStatus: types_1.DeviceStatus.DEACTIVATED,
            reason: fullReason,
            triggeredBy: operator
        };
    }
    async activateDevice(deviceCode, operator, reason) {
        const device = await this.dbService.findDeviceByCode(deviceCode);
        if (!device)
            return null;
        if (device.status !== types_1.DeviceStatus.DEACTIVATED) {
            return null;
        }
        const oldStatus = device.status;
        const fullReason = `设备重新启用: ${reason}`;
        const renewalResult = await this.checkCertificateRenewal(deviceCode);
        const newStatus = renewalResult ? types_1.DeviceStatus.NORMAL : device.status;
        if (!renewalResult) {
            await this.dbService.updateDeviceStatus(device.id, types_1.DeviceStatus.NORMAL, operator, fullReason);
        }
        return {
            deviceId: device.id,
            deviceCode: device.deviceCode,
            oldStatus,
            newStatus: types_1.DeviceStatus.NORMAL,
            reason: fullReason,
            triggeredBy: operator
        };
    }
    async runFullStatusCheck() {
        const results = [];
        const expiredResults = await this.checkAndUpdateExpiredCertificates();
        results.push(...expiredResults);
        const devices = await this.dbService.getDevices();
        for (const device of devices) {
            if (device.status === types_1.DeviceStatus.CERT_EXPIRED) {
                const renewalResult = await this.checkCertificateRenewal(device.deviceCode);
                if (renewalResult) {
                    results.push(renewalResult);
                }
            }
        }
        return results;
    }
    getDeviceStatusSummary() {
        return this.dbService.getDeviceRepository()
            .createQueryBuilder('device')
            .select('device.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('device.status')
            .getRawMany();
    }
}
exports.StatusLinkEngine = StatusLinkEngine;
//# sourceMappingURL=status-link.js.map