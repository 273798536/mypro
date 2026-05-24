"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class AuditLog extends sequelize_1.Model {
    id;
    logNo;
    action;
    source;
    recordType;
    recordId;
    recordNo;
    queueId;
    queueNo;
    oldStatus;
    newStatus;
    retryCategory;
    beforeData;
    afterData;
    changeReason;
    operatorId;
    operatorName;
    operatorRole;
    ipAddress;
    userAgent;
    remark;
    createdAt;
}
AuditLog.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    logNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'log_no'
    },
    action: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.AuditAction)),
        allowNull: false
    },
    source: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DataSource)),
        allowNull: false
    },
    recordType: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        field: 'record_type'
    },
    recordId: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'record_id'
    },
    recordNo: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'record_no'
    },
    queueId: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'queue_id'
    },
    queueNo: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'queue_no'
    },
    oldStatus: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.QueueStatus)),
        field: 'old_status'
    },
    newStatus: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.QueueStatus)),
        field: 'new_status'
    },
    retryCategory: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.RetryCategory)),
        field: 'retry_category'
    },
    beforeData: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'before_data'
    },
    afterData: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'after_data'
    },
    changeReason: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'change_reason'
    },
    operatorId: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'operator_id'
    },
    operatorName: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'operator_name'
    },
    operatorRole: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'operator_role'
    },
    ipAddress: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'ip_address'
    },
    userAgent: {
        type: sequelize_1.DataTypes.STRING(500),
        field: 'user_agent'
    },
    remark: {
        type: sequelize_1.DataTypes.TEXT
    }
}, {
    sequelize: db_1.default,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ['log_no'], unique: true },
        { fields: ['action'] },
        { fields: ['source'] },
        { fields: ['record_type', 'record_id'] },
        { fields: ['queue_id'] },
        { fields: ['operator_id'] },
        { fields: ['created_at'] }
    ]
});
exports.default = AuditLog;
//# sourceMappingURL=AuditLog.js.map