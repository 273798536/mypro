"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class CompensationQueue extends sequelize_1.Model {
    id;
    queueNo;
    source;
    sourceRecordId;
    sourceRecordNo;
    signinType;
    employeeId;
    employeeName;
    department;
    trainingId;
    trainingName;
    trainingDate;
    signinTime;
    status;
    retryCategory;
    retryCount;
    maxRetryCount;
    lastRetryTime;
    nextRetryTime;
    errorMessage;
    errorStack;
    originalData;
    correctedData;
    isProxy;
    proxyEmployeeId;
    proxyEmployeeName;
    handledBy;
    handledAt;
    handleRemark;
    compensatedRecordId;
    closedBy;
    closedAt;
    closeReason;
    createdBy;
    createdAt;
    updatedAt;
}
CompensationQueue.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    queueNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'queue_no'
    },
    source: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DataSource)),
        allowNull: false
    },
    sourceRecordId: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'source_record_id'
    },
    sourceRecordNo: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'source_record_no'
    },
    signinType: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.SigninType)),
        allowNull: false,
        field: 'signin_type'
    },
    employeeId: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        field: 'employee_id'
    },
    employeeName: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        field: 'employee_name'
    },
    department: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false
    },
    trainingId: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        field: 'training_id'
    },
    trainingName: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false,
        field: 'training_name'
    },
    trainingDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: 'training_date'
    },
    signinTime: {
        type: sequelize_1.DataTypes.DATE,
        field: 'signin_time'
    },
    status: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.QueueStatus)),
        allowNull: false,
        defaultValue: types_1.QueueStatus.PENDING
    },
    retryCategory: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.RetryCategory)),
        allowNull: false,
        field: 'retry_category'
    },
    retryCount: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
        field: 'retry_count'
    },
    maxRetryCount: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 5,
        field: 'max_retry_count'
    },
    lastRetryTime: {
        type: sequelize_1.DataTypes.DATE,
        field: 'last_retry_time'
    },
    nextRetryTime: {
        type: sequelize_1.DataTypes.DATE,
        field: 'next_retry_time'
    },
    errorMessage: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'error_message'
    },
    errorStack: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'error_stack'
    },
    originalData: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'original_data'
    },
    correctedData: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'corrected_data'
    },
    isProxy: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_proxy'
    },
    proxyEmployeeId: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'proxy_employee_id'
    },
    proxyEmployeeName: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'proxy_employee_name'
    },
    handledBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'handled_by'
    },
    handledAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'handled_at'
    },
    handleRemark: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'handle_remark'
    },
    compensatedRecordId: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'compensated_record_id'
    },
    closedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'closed_by'
    },
    closedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'closed_at'
    },
    closeReason: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'close_reason'
    },
    createdBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'created_by'
    }
}, {
    sequelize: db_1.default,
    modelName: 'CompensationQueue',
    tableName: 'compensation_queue',
    timestamps: true,
    indexes: [
        { fields: ['queue_no'], unique: true },
        { fields: ['status'] },
        { fields: ['retry_category'] },
        { fields: ['employee_id', 'training_id', 'training_date'] },
        { fields: ['training_id'] },
        { fields: ['training_date'] },
        { fields: ['department'] },
        { fields: ['source'] },
        { fields: ['next_retry_time'] },
        { fields: ['created_at'] }
    ]
});
exports.default = CompensationQueue;
//# sourceMappingURL=CompensationQueue.js.map