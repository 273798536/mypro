const { v4: uuidv4 } = require('uuid');
const { BAY_STATUS, MATERIAL_SOURCE, HISTORY_ACTION } = require('./constants');

function createBay(data = {}) {
  const now = new Date().toISOString();
  const materials = (data.materials || []).map(m => createMaterial(m));
  const photos = (data.photos || []).map(p => createPhoto(p));
  const history = (data.history || []).map(h => createHistoryRecord(h));
  return {
    id: data.id || uuidv4(),
    name: data.name || '',
    road: data.road || '',
    direction: data.direction || '',
    location: data.location || '',
    coordinates: data.coordinates || { lat: 0, lng: 0 },
    status: data.status || BAY_STATUS.DRAFT,
    remark: data.remark || '',
    materials,
    photos,
    history,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now
  };
}

function createMaterial(data = {}) {
  return {
    id: data.id || uuidv4(),
    name: data.name || '',
    source: data.source || MATERIAL_SOURCE.GIS,
    isNameConsistent: data.isNameConsistent !== undefined ? data.isNameConsistent : true,
    nameRemark: data.nameRemark || '',
    description: data.description || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

function createPhoto(data = {}) {
  return {
    id: data.id || uuidv4(),
    url: data.url || '',
    thumbnail: data.thumbnail || '',
    uploader: data.uploader || '',
    description: data.description || '',
    changes: data.changes || '',
    createdAt: data.createdAt || new Date().toISOString()
  };
}

function createHistoryRecord(data = {}) {
  return {
    id: data.id || uuidv4(),
    action: data.action || '',
    operator: data.operator || '',
    beforeStatus: data.beforeStatus || null,
    afterStatus: data.afterStatus || null,
    remark: data.remark || '',
    changes: data.changes || null,
    timestamp: data.timestamp || new Date().toISOString()
  };
}

module.exports = {
  createBay,
  createMaterial,
  createPhoto,
  createHistoryRecord
};
