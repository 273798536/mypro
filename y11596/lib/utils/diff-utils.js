const diff = require('diff');

function compareObjects(oldObj, newObj, prefix = '') {
  const differences = [];
  const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

  for (const key of allKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const oldVal = oldObj?.[key];
    const newVal = newObj?.[key];

    if (oldVal === undefined && newVal !== undefined) {
      differences.push({
        path,
        type: 'added',
        oldValue: undefined,
        newValue: newVal
      });
    } else if (newVal === undefined && oldVal !== undefined) {
      differences.push({
        path,
        type: 'removed',
        oldValue: oldVal,
        newValue: undefined
      });
    } else if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
      if (Array.isArray(oldVal) && Array.isArray(newVal)) {
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          differences.push({
            path,
            type: 'changed',
            oldValue: oldVal,
            newValue: newVal
          });
        }
      } else {
        differences.push(...compareObjects(oldVal, newVal, path));
      }
    } else if (oldVal !== newVal) {
      differences.push({
        path,
        type: 'changed',
        oldValue: oldVal,
        newValue: newVal
      });
    }
  }

  return differences;
}

function formatTextDiff(oldText, newText) {
  const changes = diff.diffLines(oldText || '', newText || '');
  return changes.map(part => ({
    value: part.value,
    added: part.added || false,
    removed: part.removed || false,
    count: part.count
  }));
}

function createSnapshot(data, metadata = {}) {
  return {
    timestamp: new Date().toISOString(),
    dataHash: JSON.stringify(data),
    data: JSON.parse(JSON.stringify(data)),
    metadata
  };
}

function getChangeSummary(differences) {
  const summary = {
    total: differences.length,
    added: differences.filter(d => d.type === 'added').length,
    removed: differences.filter(d => d.type === 'removed').length,
    changed: differences.filter(d => d.type === 'changed').length
  };
  return summary;
}

module.exports = {
  compareObjects,
  formatTextDiff,
  createSnapshot,
  getChangeSummary
};
