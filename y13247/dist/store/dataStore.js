"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStageRecords = getStageRecords;
exports.getStageRecordById = getStageRecordById;
exports.getTrackItems = getTrackItems;
exports.getTrackItemById = getTrackItemById;
exports.getArchiveItems = getArchiveItems;
exports.getArchiveItemById = getArchiveItemById;
exports.addStageRecord = addStageRecord;
exports.addTrackItem = addTrackItem;
exports.addArchiveItem = addArchiveItem;
exports.updateArchiveItem = updateArchiveItem;
exports.addHistoryLog = addHistoryLog;
exports.addAuthorizationNote = addAuthorizationNote;
exports.setStageRecords = setStageRecords;
exports.setTrackItems = setTrackItems;
exports.clearAll = clearAll;
let store = {
    stageRecords: [],
    trackItems: [],
    archiveItems: [],
};
function getStageRecords() {
    return [...store.stageRecords];
}
function getStageRecordById(id) {
    return store.stageRecords.find(r => r.id === id);
}
function getTrackItems() {
    return [...store.trackItems];
}
function getTrackItemById(id) {
    return store.trackItems.find(t => t.id === id);
}
function getArchiveItems() {
    return store.archiveItems.map(item => ({
        ...item,
        stageRecord: getStageRecordById(item.stageRecordId),
        trackItem: getTrackItemById(item.trackItemId),
    }));
}
function getArchiveItemById(id) {
    const item = store.archiveItems.find(a => a.id === id);
    if (!item)
        return undefined;
    return {
        ...item,
        stageRecord: getStageRecordById(item.stageRecordId),
        trackItem: getTrackItemById(item.trackItemId),
    };
}
function addStageRecord(record) {
    store.stageRecords.push(record);
}
function addTrackItem(item) {
    store.trackItems.push(item);
}
function addArchiveItem(item) {
    store.archiveItems.push(item);
}
function updateArchiveItem(updated) {
    const index = store.archiveItems.findIndex(a => a.id === updated.id);
    if (index !== -1) {
        const { stageRecord, trackItem, ...rest } = updated;
        store.archiveItems[index] = rest;
    }
}
function addHistoryLog(archiveItemId, log) {
    const item = store.archiveItems.find(a => a.id === archiveItemId);
    if (item) {
        item.history.push(log);
        item.updatedAt = log.timestamp;
    }
}
function addAuthorizationNote(note) {
    const item = store.archiveItems.find(a => a.id === note.archiveItemId);
    if (item) {
        item.authorizationNote = note;
    }
}
function setStageRecords(records) {
    store.stageRecords = records;
}
function setTrackItems(items) {
    store.trackItems = items;
}
function clearAll() {
    store = { stageRecords: [], trackItems: [], archiveItems: [] };
}
