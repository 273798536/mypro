const path = require('path');
const JsonStorage = require('../utils/jsonStorage');
const { createBay, createMaterial, createPhoto, createHistoryRecord } = require('../models/factories');
const { BAY_STATUS, HISTORY_ACTION } = require('../models/constants');

const STORAGE_FILE = path.join(__dirname, '../../storage/bus-bays.json');

class BayService {
  constructor() {
    this.storage = new JsonStorage(STORAGE_FILE);
  }

  listBays(filters = {}) {
    let bays = this.storage.getAll();
    if (filters.status) {
      bays = bays.filter(b => b.status === filters.status);
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      bays = bays.filter(b =>
        b.name.toLowerCase().includes(kw) ||
        b.road.toLowerCase().includes(kw) ||
        b.location.toLowerCase().includes(kw)
      );
    }
    return bays.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getBay(id) {
    return this.storage.getById(id);
  }

  createBay(data, operator = 'system') {
    const bay = createBay(data);
    bay.history.push(createHistoryRecord({
      action: HISTORY_ACTION.CREATE,
      operator,
      afterStatus: bay.status,
      remark: '创建公交港湾记录'
    }));
    return this.storage.add(bay);
  }

  updateBay(id, updates, operator = 'system') {
    const bay = this.storage.getById(id);
    if (!bay) return null;

    const updated = this.storage.update(id, (item) => {
      const beforeStatus = item.status;
      const newItem = { ...item, ...updates, updatedAt: new Date().toISOString() };

      if (updates.status && updates.status !== beforeStatus) {
        newItem.history = [
          ...item.history,
          createHistoryRecord({
            action: HISTORY_ACTION.STATUS_CHANGE,
            operator,
            beforeStatus,
            afterStatus: updates.status,
            remark: `状态从「${beforeStatus}」变更为「${updates.status}」`
          })
        ];
      }

      return newItem;
    });

    return updated;
  }

  updateRemark(id, remark, operator = 'system') {
    const bay = this.storage.getById(id);
    if (!bay) return null;

    return this.storage.update(id, (item) => ({
      ...item,
      remark,
      updatedAt: new Date().toISOString(),
      history: [
        ...item.history,
        createHistoryRecord({
          action: HISTORY_ACTION.REMARK_UPDATE,
          operator,
          beforeStatus: item.status,
          afterStatus: item.status,
          remark
        })
      ]
    }));
  }

  addMaterial(bayId, materialData, operator = 'system') {
    const bay = this.storage.getById(bayId);
    if (!bay) return null;

    const material = createMaterial(materialData);

    const updated = this.storage.update(bayId, (item) => {
      let newStatus = item.status;
      let statusRemark = '';

      if (!material.isNameConsistent && item.status !== BAY_STATUS.NAME_MISMATCH) {
        newStatus = BAY_STATUS.NAME_MISMATCH;
        statusRemark = `材料「${material.name}」名称与GIS点位不一致`;
      }

      const historyEntries = [
        createHistoryRecord({
          action: HISTORY_ACTION.MATERIAL_ADD,
          operator,
          beforeStatus: item.status,
          afterStatus: newStatus,
          remark: `添加材料：${material.name}（来源：${material.source}）`
        })
      ];

      if (statusRemark) {
        historyEntries.push(createHistoryRecord({
          action: HISTORY_ACTION.STATUS_CHANGE,
          operator,
          beforeStatus: item.status,
          afterStatus: newStatus,
          remark: statusRemark
        }));
      }

      return {
        ...item,
        materials: [...item.materials, material],
        status: newStatus,
        updatedAt: new Date().toISOString(),
        history: [...item.history, ...historyEntries]
      };
    });

    return { bay: updated, material };
  }

  removeMaterial(bayId, materialId, operator = 'system') {
    const bay = this.storage.getById(bayId);
    if (!bay) return null;

    const material = bay.materials.find(m => m.id === materialId);
    if (!material) return { bay, removed: false };

    return this.storage.update(bayId, (item) => ({
      ...item,
      materials: item.materials.filter(m => m.id !== materialId),
      updatedAt: new Date().toISOString(),
      history: [
        ...item.history,
        createHistoryRecord({
          action: HISTORY_ACTION.MATERIAL_REMOVE,
          operator,
          beforeStatus: item.status,
          afterStatus: item.status,
          remark: `移除材料：${material.name}`
        })
      ]
    }));
  }

  addPhoto(bayId, photoData, operator = 'system') {
    const bay = this.storage.getById(bayId);
    if (!bay) return null;

    const photo = createPhoto(photoData);

    const updated = this.storage.update(bayId, (item) => {
      let newStatus = item.status;
      if (item.status === BAY_STATUS.DRAFT || item.status === BAY_STATUS.PENDING) {
        newStatus = BAY_STATUS.PHOTO_SUPPLEMENTED;
      }

      const historyEntries = [
        createHistoryRecord({
          action: HISTORY_ACTION.PHOTO_ADD,
          operator,
          beforeStatus: item.status,
          afterStatus: newStatus,
          remark: `补录现场照片：${photo.description || photo.url}`,
          changes: photo.changes
        })
      ];

      if (newStatus !== item.status) {
        historyEntries.push(createHistoryRecord({
          action: HISTORY_ACTION.STATUS_CHANGE,
          operator,
          beforeStatus: item.status,
          afterStatus: newStatus,
          remark: '补录照片后状态更新'
        }));
      }

      return {
        ...item,
        photos: [...item.photos, photo],
        status: newStatus,
        updatedAt: new Date().toISOString(),
        history: [...item.history, ...historyEntries]
      };
    });

    return { bay: updated, photo };
  }

  changeStatus(bayId, newStatus, remark = '', operator = 'system') {
    const bay = this.storage.getById(bayId);
    if (!bay) return null;
    if (bay.status === newStatus) return bay;

    return this.storage.update(bayId, (item) => ({
      ...item,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      history: [
        ...item.history,
        createHistoryRecord({
          action: HISTORY_ACTION.STATUS_CHANGE,
          operator,
          beforeStatus: item.status,
          afterStatus: newStatus,
          remark: remark || `状态变更为「${newStatus}」`
        })
      ]
    }));
  }

  markCoordinateMismatch(bayId, remark, operator = 'system') {
    return this.changeStatus(bayId, BAY_STATUS.COORDINATE_MISMATCH, remark, operator);
  }

  markNameMismatch(bayId, remark, operator = 'system') {
    return this.changeStatus(bayId, BAY_STATUS.NAME_MISMATCH, remark, operator);
  }

  approve(bayId, remark = '', operator = 'system') {
    return this.changeStatus(bayId, BAY_STATUS.APPROVED, remark, operator);
  }

  reject(bayId, remark = '', operator = 'system') {
    return this.changeStatus(bayId, BAY_STATUS.REJECTED, remark, operator);
  }

  importBays(bays, operator = 'system') {
    const created = [];
    for (const data of bays) {
      const bay = this.createBay(data, operator);
      created.push(bay);
    }
    return created;
  }

  resetAll(bays, operator = 'system') {
    this.storage.clear();
    return this.importBays(bays, operator);
  }

  getHistory(bayId) {
    const bay = this.storage.getById(bayId);
    if (!bay) return null;
    return [...bay.history].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
}

module.exports = new BayService();
