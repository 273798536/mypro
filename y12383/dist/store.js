"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAnalyses = loadAnalyses;
exports.saveAnalyses = saveAnalyses;
exports.addAnalysis = addAnalysis;
exports.updateAnalysis = updateAnalysis;
exports.getAnalysisById = getAnalysisById;
exports.deleteAnalysis = deleteAnalysis;
exports.loadExports = loadExports;
exports.saveExport = saveExport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const DATA_DIR = path.join(process.cwd(), 'data');
const ANALYSIS_FILE = path.join(DATA_DIR, 'analyses.json');
const EXPORT_FILE = path.join(DATA_DIR, 'exports.json');
function ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
}
function loadAnalyses() {
    ensureDataDir();
    if (!fs.existsSync(ANALYSIS_FILE)) {
        return [];
    }
    const data = fs.readFileSync(ANALYSIS_FILE, 'utf-8');
    return JSON.parse(data);
}
function saveAnalyses(analyses) {
    ensureDataDir();
    fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(analyses, null, 2), 'utf-8');
}
function addAnalysis(analysis) {
    const analyses = loadAnalyses();
    analyses.push(analysis);
    saveAnalyses(analyses);
}
function updateAnalysis(id, analysis) {
    const analyses = loadAnalyses();
    const index = analyses.findIndex(a => a.id === id);
    if (index === -1)
        return false;
    analyses[index] = analysis;
    saveAnalyses(analyses);
    return true;
}
function getAnalysisById(id) {
    const analyses = loadAnalyses();
    return analyses.find(a => a.id === id);
}
function deleteAnalysis(id) {
    const analyses = loadAnalyses();
    const filtered = analyses.filter(a => a.id !== id);
    if (filtered.length === analyses.length)
        return false;
    saveAnalyses(filtered);
    return true;
}
function loadExports() {
    ensureDataDir();
    if (!fs.existsSync(EXPORT_FILE)) {
        return [];
    }
    const data = fs.readFileSync(EXPORT_FILE, 'utf-8');
    return JSON.parse(data);
}
function saveExport(exp) {
    const exports = loadExports();
    exports.push(exp);
    ensureDataDir();
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(exports, null, 2), 'utf-8');
}
