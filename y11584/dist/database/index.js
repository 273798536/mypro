"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const dbPath = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path_1.default.join(__dirname, '../../data/ledger.db');
const db = new sqlite3_1.default.Database(dbPath, (err) => {
    if (err) {
        console.error('数据库连接失败:', err.message);
    }
    else {
        console.log('数据库连接成功');
    }
});
db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');
});
exports.default = db;
