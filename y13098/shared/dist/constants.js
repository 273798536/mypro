"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_PAGE_SIZE = exports.STORAGE_KEYS = exports.CHANGE_TYPE_LABELS = exports.MATERIAL_TYPE_LABELS = exports.STATUS_LABELS = exports.RECORD_TYPE_LABELS = void 0;
exports.RECORD_TYPE_LABELS = {
    normal: '正常记录',
    abnormal: '异常记录',
    temporary: '临时说明'
};
exports.STATUS_LABELS = {
    pending: '待确认',
    confirmed: '已确认',
    rejected: '已驳回',
    modified: '已修改'
};
exports.MATERIAL_TYPE_LABELS = {
    photo: '巡检照片',
    document: '文档材料',
    note: '人工备注',
    screenshot: '截图说明'
};
exports.CHANGE_TYPE_LABELS = {
    create: '创建记录',
    update: '更新内容',
    confirm: '人工确认',
    reject: '驳回记录',
    status_change: '状态变更'
};
exports.STORAGE_KEYS = {
    FILTER_CRITERIA: 'route_corridor_filter_criteria',
    ACTIVE_TAB: 'route_corridor_active_tab'
};
exports.DEFAULT_PAGE_SIZE = 20;
