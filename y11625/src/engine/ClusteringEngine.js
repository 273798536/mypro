const Address = require('../models/Address');
const Task = require('../models/Task');
const Cluster = require('../models/Cluster');
const AuditLog = require('../models/AuditLog');
const db = require('../db');

class ClusteringEngine {
  static async runClustering(options = {}) {
    const { 
      similarityThreshold = 0.7,
      minClusterSize = 2,
      clusterByTasks = true,
      clusterByMetadata = true
    } = options;

    const addresses = Address.findAll();
    const clusters = [];
    const addressToCluster = {};

    if (clusterByTasks) {
      const taskClusters = this.clusterByTaskPatterns(addresses, similarityThreshold);
      taskClusters.forEach(cluster => {
        if (cluster.addresses.length >= minClusterSize) {
          cluster.addresses.forEach(addr => {
            if (!addressToCluster[addr]) {
              addressToCluster[addr] = [];
            }
            addressToCluster[addr].push(cluster);
          });
          clusters.push(cluster);
        }
      });
    }

    if (clusterByMetadata) {
      const metaClusters = this.clusterByMetadata(addresses, similarityThreshold);
      metaClusters.forEach(cluster => {
        if (cluster.addresses.length >= minClusterSize) {
          cluster.addresses.forEach(addr => {
            if (!addressToCluster[addr]) {
              addressToCluster[addr] = [];
            }
            addressToCluster[addr].push(cluster);
          });
          clusters.push(cluster);
        }
      });
    }

    const mergedClusters = this.mergeOverlappingClusters(clusters, similarityThreshold);
    
    Cluster.clearAll();
    const savedClusters = [];
    
    for (const clusterData of mergedClusters) {
      if (clusterData.addresses.length >= minClusterSize) {
        const cluster = Cluster.create({
          name: `Cluster_${savedClusters.length + 1}`,
          addresses: clusterData.addresses,
          similarityScore: clusterData.similarityScore,
          clusterType: clusterData.type || 'mixed',
          notes: `基于${clusterData.features.join(', ')}的地址聚类`
        });
        
        clusterData.addresses.forEach(addr => {
          const address = Address.findByAddress(addr);
          if (address) {
            Address.setCluster(address.id, cluster.id);
          }
        });
        
        savedClusters.push(cluster);
      }
    }

    AuditLog.create({
      action: 'cluster_run',
      entityType: 'cluster',
      oldValue: null,
      newValue: { clusterCount: savedClusters.length },
      reason: '执行地址聚类分析'
    });

    return {
      totalAddresses: addresses.length,
      clusterCount: savedClusters.length,
      clusteredAddresses: Object.keys(addressToCluster).length,
      clusters: savedClusters
    };
  }

  static clusterByTaskPatterns(addresses, similarityThreshold) {
    const clusters = [];
    const addressTasks = Task.getTaskStats();
    const processed = new Set();

    for (const addr1 of addresses) {
      if (processed.has(addr1.address)) continue;
      
      const tasks1 = addressTasks[addr1.address];
      if (!tasks1 || tasks1.count === 0) continue;

      const cluster = {
        addresses: [addr1.address],
        similarityScore: 1.0,
        type: 'task_pattern',
        features: ['task_pattern']
      };

      processed.add(addr1.address);

      for (const addr2 of addresses) {
        if (addr1.address === addr2.address || processed.has(addr2.address)) continue;
        
        const tasks2 = addressTasks[addr2.address];
        if (!tasks2 || tasks2.count === 0) continue;

        const similarity = this.calculateTaskSimilarity(tasks1, tasks2);
        if (similarity >= similarityThreshold) {
          cluster.addresses.push(addr2.address);
          processed.add(addr2.address);
          cluster.similarityScore = Math.min(cluster.similarityScore, similarity);
        }
      }

      if (cluster.addresses.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  static clusterByMetadata(addresses, similarityThreshold) {
    const clusters = [];
    const processed = new Set();

    for (const addr1 of addresses) {
      if (processed.has(addr1.address)) continue;
      if (!addr1.metadata || Object.keys(addr1.metadata).length === 0) continue;

      const cluster = {
        addresses: [addr1.address],
        similarityScore: 1.0,
        type: 'metadata',
        features: ['metadata']
      };

      processed.add(addr1.address);

      for (const addr2 of addresses) {
        if (addr1.address === addr2.address || processed.has(addr2.address)) continue;
        
        const similarity = this.calculateMetadataSimilarity(addr1.metadata, addr2.metadata || {});
        if (similarity >= similarityThreshold) {
          cluster.addresses.push(addr2.address);
          processed.add(addr2.address);
          cluster.similarityScore = Math.min(cluster.similarityScore, similarity);
        }
      }

      if (cluster.addresses.length > 1) {
        clusters.push(cluster);
      }
    }

    return clusters;
  }

  static calculateTaskSimilarity(tasks1, tasks2) {
    if (!tasks1 || !tasks2) return 0;
    
    const type1 = tasks1.types;
    const type2 = tasks2.types;
    
    if (type1.size === 0 && type2.size === 0) return 1;
    if (type1.size === 0 || type2.size === 0) return 0;

    let intersection = 0;
    type1.forEach(t => {
      if (type2.has(t)) intersection++;
    });

    const union = type1.size + type2.size - intersection;
    const typeSimilarity = intersection / union;

    const countDiff = Math.abs(tasks1.count - tasks2.count);
    const countSimilarity = 1 - (countDiff / Math.max(tasks1.count, tasks2.count, 1));

    const suspRatio1 = tasks1.suspicious / Math.max(tasks1.count, 1);
    const suspRatio2 = tasks2.suspicious / Math.max(tasks2.count, 1);
    const suspSimilarity = 1 - Math.abs(suspRatio1 - suspRatio2);

    return (typeSimilarity * 0.5 + countSimilarity * 0.3 + suspSimilarity * 0.2);
  }

  static calculateMetadataSimilarity(meta1, meta2) {
    const keys1 = new Set(Object.keys(meta1));
    const keys2 = new Set(Object.keys(meta2));

    if (keys1.size === 0 && keys2.size === 0) return 1;
    if (keys1.size === 0 || keys2.size === 0) return 0;

    let matchCount = 0;
    let totalComparisons = 0;

    keys1.forEach(key => {
      if (keys2.has(key)) {
        totalComparisons++;
        if (meta1[key] === meta2[key]) {
          matchCount++;
        } else if (typeof meta1[key] === 'string' && typeof meta2[key] === 'string') {
          if (meta1[key].toLowerCase() === meta2[key].toLowerCase()) {
            matchCount += 0.5;
          }
        }
      }
    });

    return totalComparisons > 0 ? matchCount / totalComparisons : 0;
  }

  static mergeOverlappingClusters(clusters, threshold) {
    if (clusters.length <= 1) return clusters;

    const merged = [...clusters];
    let changed = true;

    while (changed) {
      changed = false;
      for (let i = 0; i < merged.length; i++) {
        for (let j = i + 1; j < merged.length; j++) {
          const overlap = this.calculateClusterOverlap(merged[i], merged[j]);
          if (overlap >= threshold) {
            const mergedCluster = {
              addresses: [...new Set([...merged[i].addresses, ...merged[j].addresses])],
              similarityScore: Math.min(merged[i].similarityScore, merged[j].similarityScore),
              type: 'merged',
              features: [...new Set([...(merged[i].features || []), ...(merged[j].features || [])])]
            };
            merged.splice(j, 1);
            merged[i] = mergedCluster;
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }

    return merged;
  }

  static calculateClusterOverlap(cluster1, cluster2) {
    const set1 = new Set(cluster1.addresses);
    const set2 = new Set(cluster2.addresses);
    
    let intersection = 0;
    set1.forEach(addr => {
      if (set2.has(addr)) intersection++;
    });

    const union = set1.size + set2.size - intersection;
    return union > 0 ? intersection / union : 0;
  }
}

module.exports = ClusteringEngine;
