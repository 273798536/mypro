"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEXT_ACTIONS = exports.ANOMALY_STATUS_LABELS = exports.MIGRATION_STATUS_LABELS = exports.ANOMALY_TYPE_LABELS = void 0;
exports.ANOMALY_TYPE_LABELS = {
    backup_gap: '备份缺口',
    permission_missing: '权限缺失',
    compression_abnormal: '压缩率异常',
    caliber_inconsistent: '口径不一致',
    other: '其他异常'
};
exports.MIGRATION_STATUS_LABELS = {
    not_started: '未开始',
    in_progress: '进行中',
    completed: '已完成',
    blocked: '已阻塞'
};
exports.ANOMALY_STATUS_LABELS = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决'
};
exports.NEXT_ACTIONS = ['补材料', '改口径', '待确认'];
