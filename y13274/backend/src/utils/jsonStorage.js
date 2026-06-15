const fs = require('fs');
const path = require('path');

class JsonStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
    this._ensureFile();
    this._load();
  }

  _ensureFile() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  _load() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (err) {
      console.error('Failed to load storage file:', err.message);
      this.data = [];
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save storage file:', err.message);
      throw err;
    }
  }

  getAll() {
    return [...this.data];
  }

  getById(id) {
    return this.data.find(item => item.id === id) || null;
  }

  find(predicate) {
    return this.data.filter(predicate);
  }

  add(item) {
    this.data.push(item);
    this._save();
    return item;
  }

  update(id, updater) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return null;
    const updated = updater({ ...this.data[index] });
    this.data[index] = updated;
    this._save();
    return updated;
  }

  remove(id) {
    const index = this.data.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.data.splice(index, 1);
    this._save();
    return true;
  }

  replaceAll(items) {
    this.data = [...items];
    this._save();
    return this.data;
  }

  clear() {
    this.data = [];
    this._save();
  }
}

module.exports = JsonStorage;
