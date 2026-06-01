class HeatmapGenerator {
  constructor(options = {}) {
    this.options = {
      gridSize: options.gridSize || 2,
      radius: options.radius || 5,
      intensityScale: options.intensityScale || 'linear',
      filterDrift: options.filterDrift !== false
    };
    this.heatmapData = null;
    this.colliderHeat = new Map();
    this.positionIndex = new Map();
  }

  generate(level, trajectories, options = {}) {
    const filterDrift = options.filterDrift ?? this.options.filterDrift;
    
    const validPoints = this._collectValidPoints(trajectories, filterDrift);
    const collisionPoints = this._collectCollisionPoints(trajectories);
    
    this._buildGridIndex(level, validPoints);
    this._calculateColliderHeat(level, collisionPoints, trajectories);
    this._buildPositionIndex();

    return {
      gridData: this.heatmapData,
      colliderHeat: Array.from(this.colliderHeat.entries()).map(([id, data]) => ({
        colliderId: id,
        ...data
      })),
      stats: this._calculateStats(validPoints, collisionPoints),
      rawPoints: {
        trajectory: validPoints,
        collision: collisionPoints
      }
    };
  }

  getObjectInfo(colliderIdOrName, level) {
    let collider = level.getColliderById(colliderIdOrName);
    if (!collider) {
      collider = level.getColliderByName(colliderIdOrName);
    }
    
    if (!collider) {
      return null;
    }

    const heatData = this.colliderHeat.get(collider.id) || {
      collisionCount: 0,
      intensity: 0,
      rank: 'N/A',
      percentile: 0
    };

    const nearbyAnomalies = this._findNearbyAnomalies(collider);

    return {
      collider: {
        id: collider.id,
        name: collider.name,
        position: collider.position,
        size: collider.size,
        type: collider.type,
        material: collider.material,
        materialInfo: level.getMaterialInfo(collider.material),
        notes: collider.notes,
        isActive: collider.isActive
      },
      heatmap: {
        collisionCount: heatData.collisionCount,
        intensity: heatData.intensity,
        intensityLevel: this._getIntensityLevel(heatData.intensity),
        rank: heatData.rank,
        percentile: heatData.percentile,
        color: this._intensityToColor(heatData.intensity)
      },
      levelSource: {
        levelName: level.name,
        levelVersion: level.version,
        sourceFile: level.sourceFile,
        levelNotes: level.notes
      },
      anomalies: nearbyAnomalies
    };
  }

  compareObjects(colliderIds, level) {
    return colliderIds.map(id => this.getObjectInfo(id, level)).filter(Boolean);
  }

  findHotspots(threshold = 0.7, limit = 10) {
    const hotspots = [];
    
    this.colliderHeat.forEach((data, colliderId) => {
      if (data.intensity >= threshold) {
        hotspots.push({
          colliderId,
          ...data
        });
      }
    });

    return hotspots
      .sort((a, b) => b.intensity - a.intensity)
      .slice(0, limit);
  }

  _collectValidPoints(trajectories, filterDrift) {
    const points = [];
    
    trajectories.forEach(traj => {
      const validPoints = filterDrift ? traj.getValidPoints() : traj.points;
      validPoints.forEach(p => {
        if (p.position) {
          points.push({
            x: p.position.x,
            y: p.position.y,
            z: p.position.z,
            trajectoryId: traj.id,
            playerId: traj.playerId
          });
        }
      });
    });

    return points;
  }

  _collectCollisionPoints(trajectories) {
    const points = [];
    
    trajectories.forEach(traj => {
      traj.collisions.forEach(coll => {
        points.push({
          ...coll,
          trajectoryId: traj.id,
          playerId: traj.playerId,
          levelVersion: traj.levelVersion
        });
      });
    });

    return points;
  }

  _buildGridIndex(level, points) {
    const bounds = this._calculateBounds(level, points);
    const gridSize = this.options.gridSize;
    const radius = this.options.radius;
    
    const grid = {};
    const key = (x, z) => `${Math.floor(x/gridSize)},${Math.floor(z/gridSize)}`;

    points.forEach(point => {
      const gridX = Math.floor(point.x / gridSize);
      const gridZ = Math.floor(point.z / gridSize);
      
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist <= radius) {
            const k = key(gridX + dx * gridSize, gridZ + dz * gridSize);
            const intensity = 1 - (dist / radius);
            grid[k] = (grid[k] || 0) + intensity;
          }
        }
      }
    });

    this.heatmapData = {
      grid,
      bounds,
      gridSize,
      radius
    };
  }

  _calculateColliderHeat(level, collisionPoints, trajectories) {
    const colliderCollisions = new Map();
    const colliderVersions = new Map();

    collisionPoints.forEach(coll => {
      const id = coll.colliderId;
      if (!colliderCollisions.has(id)) {
        colliderCollisions.set(id, []);
        colliderVersions.set(id, new Set());
      }
      colliderCollisions.get(id).push(coll);
      colliderVersions.get(id).add(coll.levelVersion);
    });

    let maxCollisions = 0;
    colliderCollisions.forEach(colls => {
      maxCollisions = Math.max(maxCollisions, colls.length);
    });

    const allColliders = Array.from(colliderCollisions.entries())
      .sort((a, b) => b[1].length - a[1].length);

    level.colliders.forEach(collider => {
      const collisions = colliderCollisions.get(collider.id) || [];
      const versions = colliderVersions.get(collider.id) || new Set();
      const rankIndex = allColliders.findIndex(c => c[0] === collider.id);
      
      const intensity = maxCollisions > 0 ? (collisions.length / maxCollisions) : 0;
      const percentile = allColliders.length > 0 
        ? Math.round(((allColliders.length - rankIndex) / allColliders.length) * 100)
        : 0;

      this.colliderHeat.set(collider.id, {
        collisionCount: collisions.length,
        intensity,
        rank: rankIndex >= 0 ? rankIndex + 1 : 'N/A',
        percentile,
        versions: Array.from(versions),
        topForces: this._getTopForces(collisions, 5),
        playerDistribution: this._getPlayerDistribution(collisions)
      });
    });
  }

  _buildPositionIndex() {
    this.positionIndex.clear();
  }

  _calculateBounds(level, points) {
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    level.colliders.forEach(c => {
      if (c.position) {
        minX = Math.min(minX, c.position.x - (c.size?.x || 0) / 2);
        maxX = Math.max(maxX, c.position.x + (c.size?.x || 0) / 2);
        minZ = Math.min(minZ, c.position.z - (c.size?.z || 0) / 2);
        maxZ = Math.max(maxZ, c.position.z + (c.size?.z || 0) / 2);
      }
    });

    points.forEach(p => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    });

    return { minX, maxX, minZ, maxZ };
  }

  _getTopForces(collisions, limit) {
    return collisions
      .filter(c => c.force > 0)
      .sort((a, b) => b.force - a.force)
      .slice(0, limit)
      .map(c => ({
        force: c.force,
        playerId: c.playerId,
        timestamp: c.timestamp
      }));
  }

  _getPlayerDistribution(collisions) {
    const dist = new Map();
    collisions.forEach(c => {
      dist.set(c.playerId, (dist.get(c.playerId) || 0) + 1);
    });
    return Array.from(dist.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([playerId, count]) => ({ playerId, count }));
  }

  _findNearbyAnomalies(collider) {
    return [];
  }

  _getIntensityLevel(intensity) {
    if (intensity >= 0.8) return '极高';
    if (intensity >= 0.6) return '高';
    if (intensity >= 0.4) return '中';
    if (intensity >= 0.2) return '低';
    return '极低';
  }

  _intensityToColor(intensity) {
    const colors = [
      { val: 0, rgb: [0, 0, 255] },
      { val: 0.25, rgb: [0, 255, 255] },
      { val: 0.5, rgb: [0, 255, 0] },
      { val: 0.75, rgb: [255, 255, 0] },
      { val: 1, rgb: [255, 0, 0] }
    ];

    for (let i = 0; i < colors.length - 1; i++) {
      if (intensity >= colors[i].val && intensity <= colors[i + 1].val) {
        const t = (intensity - colors[i].val) / (colors[i + 1].val - colors[i].val);
        const r = Math.round(colors[i].rgb[0] + t * (colors[i + 1].rgb[0] - colors[i].rgb[0]));
        const g = Math.round(colors[i].rgb[1] + t * (colors[i + 1].rgb[1] - colors[i].rgb[1]));
        const b = Math.round(colors[i].rgb[2] + t * (colors[i + 1].rgb[2] - colors[i].rgb[2]));
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
    return 'rgb(255, 0, 0)';
  }

  _calculateStats(trajectoryPoints, collisionPoints) {
    const uniquePlayers = new Set(trajectoryPoints.map(p => p.playerId)).size;
    
    return {
      totalTrajectoryPoints: trajectoryPoints.length,
      totalCollisions: collisionPoints.length,
      uniquePlayers,
      avgCollisionsPerPlayer: uniquePlayers > 0 
        ? (collisionPoints.length / uniquePlayers).toFixed(1) 
        : 0
    };
  }
}

module.exports = HeatmapGenerator;
