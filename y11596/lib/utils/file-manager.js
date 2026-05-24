const fs = require('fs');
const path = require('path');

const WORKSPACE_CONFIG = '.kbase-audit';
const DATA_DIR = 'data';
const HISTORY_DIR = 'history';
const REPORTS_DIR = 'reports';
const EXPORTS_DIR = 'exports';
const CONFIG_FILE = 'config.json';
const STATE_FILE = 'state.json';

function getWorkspaceRoot(cwd = process.cwd()) {
  let current = cwd;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, WORKSPACE_CONFIG))) {
      return current;
    }
    current = path.dirname(current);
  }
  return null;
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

function getWorkspacePaths(root) {
  return {
    root,
    config: path.join(root, WORKSPACE_CONFIG, CONFIG_FILE),
    state: path.join(root, WORKSPACE_CONFIG, STATE_FILE),
    data: path.join(root, DATA_DIR),
    history: path.join(root, HISTORY_DIR),
    reports: path.join(root, REPORTS_DIR),
    exports: path.join(root, EXPORTS_DIR),
    source: path.join(root, DATA_DIR, 'source'),
    parsed: path.join(root, DATA_DIR, 'parsed'),
    check: path.join(root, DATA_DIR, 'check')
  };
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function appendJson(filePath, entry) {
  let existing = [];
  if (fs.existsSync(filePath)) {
    existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(existing)) {
      existing = [existing];
    }
  }
  existing.push(entry);
  writeJson(filePath, existing);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function getTimestamp() {
  return new Date().toISOString();
}

function readState(root) {
  const paths = getWorkspacePaths(root);
  return readJson(paths.state) || {
    version: '1.0.0',
    status: 'active',
    frozen: false,
    currentBatch: null,
    batches: [],
    lastCheck: null,
    lastExport: null
  };
}

function writeState(root, state) {
  const paths = getWorkspacePaths(root);
  writeJson(paths.state, state);
}

module.exports = {
  WORKSPACE_CONFIG,
  DATA_DIR,
  HISTORY_DIR,
  REPORTS_DIR,
  EXPORTS_DIR,
  getWorkspaceRoot,
  ensureDir,
  getWorkspacePaths,
  readJson,
  writeJson,
  appendJson,
  generateId,
  getTimestamp,
  readState,
  writeState
};
