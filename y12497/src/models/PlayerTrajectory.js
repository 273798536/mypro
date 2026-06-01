class PlayerTrajectory {
  constructor(rawData) {
    this.id = rawData.id || this._generateId();
    this.playerId = rawData.playerId || rawData.player_id || 'unknown';
    this.sessionId = rawData.sessionId || rawData.session_id || 'unknown';
    this.levelVersion = rawData.levelVersion || rawData.level_version || this._extractVersion(rawData);
    this.levelVersionSource = this._determineVersionSource(rawData);
    this.points = [];
    this.collisions = [];
    this.startTime = rawData.startTime || null;
    this.endTime = rawData.endTime || null;
    this.dataQuality = {
      hasMissingPoints: false,
      hasDrift: false,
      missingCount: 0,
      driftCount: 0,
      completeness: 100
    };
    
    this._parsePoints(rawData.points || rawData.trajectory || []);
    this._parseCollisions(rawData.collisions || []);
    this._assessDataQuality();
  }

  _generateId() {
    return 'traj_' + Math.random().toString(36).substr(2, 9);
  }

  _extractVersion(rawData) {
    if (rawData.levelVersion) return rawData.levelVersion;
    if (rawData.level_version) return rawData.level_version;
    const filename = rawData.sourceFile || '';
    const match = filename.match(/v(\d+\.?\d*)/);
    return match ? 'v' + match[1] : 'unknown';
  }

  _determineVersionSource(rawData) {
    if (rawData.levelVersion || rawData.level_version) return 'explicit';
    if ((rawData.sourceFile || '').match(/v\d+\.?\d*/)) return 'filename';
    return 'inferred';
  }

  _parsePoints(rawPoints) {
    let lastValidPoint = null;
    let expectedTimeGap = null;

    rawPoints.forEach((raw, index) => {
      if (!raw || (!raw.position && !raw.pos && !raw.x)) {
        this.dataQuality.missingCount++;
        return;
      }

      const point = {
        index,
        position: this._extractPosition(raw),
        timestamp: raw.timestamp || raw.time || raw.t || null,
        velocity: raw.velocity || raw.vel || null
      };

      if (lastValidPoint && point.timestamp && lastValidPoint.timestamp) {
        const gap = point.timestamp - lastValidPoint.timestamp;
        if (expectedTimeGap && gap > expectedTimeGap * 3) {
          point.flag = 'gap_detected';
          this.dataQuality.hasMissingPoints = true;
        }
        expectedTimeGap = expectedTimeGap ? Math.min(expectedTimeGap, gap) : gap;
      }

      if (lastValidPoint) {
        const drift = this._calculateDrift(lastValidPoint, point);
        if (drift > 50) {
          point.flag = point.flag || 'drift';
          point.driftValue = drift;
          this.dataQuality.hasDrift = true;
          this.dataQuality.driftCount++;
        }
      }

      this.points.push(point);
      if (!point.flag || point.flag === 'gap_detected') {
        lastValidPoint = point;
      }
    });
  }

  _extractPosition(raw) {
    if (raw.position) return raw.position;
    if (raw.pos) return raw.pos;
    if (raw.x !== undefined) {
      return {
        x: raw.x,
        y: raw.y || 0,
        z: raw.z !== undefined ? raw.z : 0
      };
    }
    return { x: 0, y: 0, z: 0 };
  }

  _calculateDrift(pointA, pointB) {
    if (!pointA.position || !pointB.position) return 0;
    const dx = pointB.position.x - pointA.position.x;
    const dy = pointB.position.y - pointA.position.y;
    const dz = pointB.position.z - pointA.position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  _parseCollisions(rawCollisions) {
    rawCollisions.forEach((raw, index) => {
      this.collisions.push({
        id: raw.id || `collision_${this.id}_${index}`,
        colliderId: raw.colliderId || raw.collider_id || raw.objectId || 'unknown',
        colliderName: raw.colliderName || raw.objectName || '',
        position: this._extractPosition(raw),
        timestamp: raw.timestamp || raw.time || null,
        force: raw.force || raw.impactForce || 0,
        material: raw.material || 'unknown',
        isResolved: raw.resolved !== false
      });
    });
  }

  _assessDataQuality() {
    const total = this.points.length + this.dataQuality.missingCount;
    if (total > 0) {
      this.dataQuality.completeness = Math.round((this.points.length / total) * 100);
    }
  }

  getCollisionPoints() {
    return this.collisions;
  }

  getValidPoints() {
    return this.points.filter(p => !p.flag || p.flag === 'gap_detected');
  }

  getDriftPoints() {
    return this.points.filter(p => p.flag === 'drift');
  }

  toJSON() {
    return {
      id: this.id,
      playerId: this.playerId,
      sessionId: this.sessionId,
      levelVersion: this.levelVersion,
      levelVersionSource: this.levelVersionSource,
      points: this.points,
      collisions: this.collisions,
      startTime: this.startTime,
      endTime: this.endTime,
      dataQuality: this.dataQuality
    };
  }
}

module.exports = PlayerTrajectory;
