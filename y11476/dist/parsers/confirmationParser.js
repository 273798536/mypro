"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmationParser = void 0;
const baseParser_1 = require("./baseParser");
class ConfirmationParser extends baseParser_1.BaseParser {
    constructor() {
        super('confirmation');
    }
    parseRow(row, lineNumber) {
        const errors = [];
        const confirmId = row['确认ID'] || row['confirmId'] || row['id'] || row['单据ID'];
        if (!confirmId) {
            errors.push('缺少确认记录ID');
        }
        const bookingId = row['预约ID'] || row['bookingId'];
        if (!bookingId) {
            errors.push('缺少预约ID');
        }
        const roomName = row['会议室'] || row['roomName'] || row['room'];
        if (!roomName) {
            errors.push('缺少会议室名称');
        }
        const confirmer = row['确认人'] || row['confirmer'] || row['操作人'];
        if (!confirmer) {
            errors.push('缺少确认人');
        }
        const confirmTime = row['确认时间'] || row['confirmTime'] || row['time'];
        if (!confirmTime) {
            errors.push('缺少确认时间');
        }
        const confirmedStatusStr = (row['确认状态'] || row['confirmedStatus'] || row['status'] || 'confirmed').toLowerCase();
        const statusMap = {
            '已确认': 'confirmed',
            'confirmed': 'confirmed',
            '确认': 'confirmed',
            '已取消': 'cancelled',
            'cancelled': 'cancelled',
            '取消': 'cancelled',
            '已变更': 'changed',
            'changed': 'changed',
            '变更': 'changed'
        };
        const confirmedStatus = statusMap[confirmedStatusStr] || 'confirmed';
        const finalStartTime = row['最终开始时间'] || row['finalStartTime'] || row['startTime'];
        const finalEndTime = row['最终结束时间'] || row['finalEndTime'] || row['endTime'];
        const remarks = row['备注'] || row['remarks'];
        if (errors.length > 0) {
            return {
                success: false,
                error: errors.join('; '),
                lineNumber,
                rawData: ''
            };
        }
        return {
            success: true,
            data: {
                confirmId: confirmId,
                bookingId: bookingId,
                roomName: roomName,
                confirmer: confirmer,
                confirmTime: confirmTime,
                confirmedStatus,
                finalStartTime,
                finalEndTime,
                remarks
            },
            lineNumber,
            rawData: ''
        };
    }
}
exports.ConfirmationParser = ConfirmationParser;
//# sourceMappingURL=confirmationParser.js.map