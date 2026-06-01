const fs = require('fs');
const path = require('path');
const GuaranteeCard = require('../models/GuaranteeCard');
const ProjectClue = require('../models/ProjectClue');
const CounterGuarantee = require('../models/CounterGuarantee');

class DataStore {
  constructor(dataDir = path.join(__dirname, '../data')) {
    this.dataDir = dataDir;
    this.files = {
      guarantees: path.join(dataDir, 'guarantees.json'),
      clues: path.join(dataDir, 'clues.json'),
      counterGuarantees: path.join(dataDir, 'counterGuarantees.json'),
      gameSessions: path.join(dataDir, 'gameSessions.json'),
      reports: path.join(dataDir, 'reports.json')
    };
    this.init();
  }

  init() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    
    Object.values(this.files).forEach(file => {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2));
      }
    });
  }

  readData(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content || '[]');
    } catch (error) {
      console.error(`读取文件失败 ${filePath}:`, error.message);
      return [];
    }
  }

  writeData(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`写入文件失败 ${filePath}:`, error.message);
      return false;
    }
  }

  generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  findById(filePath, id) {
    const data = this.readData(filePath);
    return data.find(item => item.id === id);
  }

  findByField(filePath, field, value) {
    const data = this.readData(filePath);
    return data.filter(item => item[field] === value);
  }

  insert(filePath, item) {
    const data = this.readData(filePath);
    const existingIndex = data.findIndex(i => i.id === item.id);
    
    if (existingIndex >= 0) {
      console.warn(`记录已存在，跳过插入: ${item.id}`);
      return { success: false, message: '记录已存在' };
    }
    
    data.push(item);
    this.writeData(filePath, data);
    return { success: true, data: item };
  }

  update(filePath, id, updates) {
    const data = this.readData(filePath);
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) {
      return { success: false, message: '记录不存在' };
    }
    
    data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
    this.writeData(filePath, data);
    return { success: true, data: data[index] };
  }

  upsert(filePath, item, uniqueField = 'id') {
    const data = this.readData(filePath);
    const existingIndex = data.findIndex(i => i[uniqueField] === item[uniqueField]);
    
    if (existingIndex >= 0) {
      data[existingIndex] = { ...data[existingIndex], ...item, updatedAt: new Date().toISOString() };
      this.writeData(filePath, data);
      return { success: true, data: data[existingIndex], action: 'updated' };
    } else {
      data.push(item);
      this.writeData(filePath, data);
      return { success: true, data: item, action: 'inserted' };
    }
  }

  delete(filePath, id) {
    const data = this.readData(filePath);
    const filtered = data.filter(item => item.id !== id);
    
    if (filtered.length === data.length) {
      return { success: false, message: '记录不存在' };
    }
    
    this.writeData(filePath, filtered);
    return { success: true };
  }

  getAll(filePath) {
    return this.readData(filePath);
  }

  clear(filePath) {
    this.writeData(filePath, []);
    return { success: true };
  }

  saveGuarantee(guaranteeData) {
    const guarantee = new GuaranteeCard({
      ...guaranteeData,
      id: guaranteeData.id || this.generateId('guar')
    });
    const errors = guarantee.validate();
    if (errors.length > 0) {
      return { success: false, errors };
    }
    return this.upsert(this.files.guarantees, guarantee.toJSON(), 'guaranteeNo');
  }

  saveClue(clueData) {
    const clue = new ProjectClue({
      ...clueData,
      id: clueData.id || this.generateId('clue')
    });
    const errors = clue.validate();
    if (errors.length > 0) {
      return { success: false, errors };
    }
    return this.upsert(this.files.clues, clue.toJSON(), 'clueNo');
  }

  saveCounterGuarantee(cgData) {
    const cg = new CounterGuarantee({
      ...cgData,
      id: cgData.id || this.generateId('cg')
    });
    const errors = cg.validate();
    if (errors.length > 0) {
      return { success: false, errors };
    }
    return this.upsert(this.files.counterGuarantees, cg.toJSON(), 'cgNo');
  }

  saveGameSession(sessionData) {
    const session = {
      ...sessionData,
      id: sessionData.id || this.generateId('session'),
      createdAt: sessionData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return this.upsert(this.files.gameSessions, session, 'id');
  }

  saveReport(reportData) {
    const report = {
      ...reportData,
      id: reportData.id || this.generateId('report'),
      createdAt: reportData.createdAt || new Date().toISOString()
    };
    return this.upsert(this.files.reports, report, 'id');
  }

  getGuarantees() {
    return this.getAll(this.files.guarantees);
  }

  getClues() {
    return this.getAll(this.files.clues);
  }

  getCounterGuarantees() {
    return this.getAll(this.files.counterGuarantees);
  }

  getGameSessions() {
    return this.getAll(this.files.gameSessions);
  }

  getReports() {
    return this.getAll(this.files.reports);
  }

  getGuaranteeByNo(guaranteeNo) {
    return this.findByField(this.files.guarantees, 'guaranteeNo', guaranteeNo)[0];
  }

  getClueByNo(clueNo) {
    return this.findByField(this.files.clues, 'clueNo', clueNo)[0];
  }

  getCounterGuaranteeByNo(cgNo) {
    return this.findByField(this.files.counterGuarantees, 'cgNo', cgNo)[0];
  }

  getGameSessionById(sessionId) {
    return this.findById(this.files.gameSessions, sessionId);
  }
}

module.exports = DataStore;
