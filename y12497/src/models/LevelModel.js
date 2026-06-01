class LevelModel {
  constructor(rawData) {
    this.id = rawData.id || this._generateId();
    this.name = rawData.name || '未命名关卡';
    this.version = this._parseVersion(rawData);
    this.versionAlias = rawData.versionAlias || [];
    this.colliders = [];
    this.materials = new Map();
    this.notes = rawData.notes || '';
    this.createdAt = rawData.createdAt || new Date().toISOString();
    this.sourceFile = rawData.sourceFile || 'unknown';
    this._parseColliders(rawData.colliders || []);
    this._parseMaterials(rawData.materials || []);
  }

  _generateId() {
    return 'level_' + Math.random().toString(36).substr(2, 9);
  }

  _parseVersion(rawData) {
    if (rawData.version) return rawData.version;
    const nameMatch = (rawData.name || '').match(/v(\d+\.?\d*)/);
    return nameMatch ? 'v' + nameMatch[1] : 'v1.0';
  }

  _parseColliders(rawColliders) {
    rawColliders.forEach((raw, index) => {
      if (!raw || (!raw.position && !raw.pos)) {
        console.warn(`碰撞体 ${index} 位置数据缺失，已跳过`);
        return;
      }
      
      this.colliders.push({
        id: raw.id || `collider_${index}`,
        name: raw.name || `碰撞体_${index}`,
        position: raw.position || raw.pos,
        size: raw.size || raw.extents || { x: 1, y: 1, z: 1 },
        type: raw.type || 'box',
        material: raw.material || 'default',
        isActive: raw.isActive !== false,
        isMissing: !raw.position && !raw.pos,
        notes: raw.notes || ''
      });
    });
  }

  _parseMaterials(rawMaterials) {
    if (Array.isArray(rawMaterials)) {
      rawMaterials.forEach(m => {
        if (m && m.name) {
          this.materials.set(m.name, m);
        }
      });
    }
  }

  getColliderById(id) {
    return this.colliders.find(c => c.id === id);
  }

  getColliderByName(name) {
    return this.colliders.find(c => c.name === name);
  }

  getMaterialInfo(materialName) {
    return this.materials.get(materialName) || { name: materialName, type: 'unknown' };
  }

  validate() {
    const issues = [];
    
    const missingColliders = this.colliders.filter(c => c.isMissing);
    if (missingColliders.length > 0) {
      issues.push({
        type: 'collider_missing',
        severity: 'high',
        message: `发现 ${missingColliders.length} 个碰撞体位置数据缺失`,
        details: missingColliders.map(c => c.name)
      });
    }

    const unnamedColliders = this.colliders.filter(c => c.name.startsWith('碰撞体_'));
    if (unnamedColliders.length > 0) {
      issues.push({
        type: 'collider_unnamed',
        severity: 'medium',
        message: `${unnamedColliders.length} 个碰撞体使用默认命名`,
        details: unnamedColliders.map(c => c.id)
      });
    }

    return issues;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      version: this.version,
      versionAlias: this.versionAlias,
      colliders: this.colliders,
      materials: Array.from(this.materials.values()),
      notes: this.notes,
      createdAt: this.createdAt,
      sourceFile: this.sourceFile
    };
  }
}

module.exports = LevelModel;
