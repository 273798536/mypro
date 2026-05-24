"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class FailedRecord extends sequelize_1.Model {
    id;
    failureNo;
    source;
    recordType;
    recordId;
    recordNo;
    queueId;
    queueNo;
    retryCategory;
    errorCode;
    errorMessage;
    errorDetail;
    originalData;
    validationErrors;
    isResolved;
    resolvedAt;
    resolvedBy;
    resolutionMethod;
    resolutionRemark;
    affectedReportFields;
    excludedFromReport;
    createdBy;
    createdAt;
    updatedAt;
}
FailedRecord.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    failureNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'failure_no'
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
    retryCategory: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.RetryCategory)),
        allowNull: false,
        field: 'retry_category'
    },
    errorCode: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'error_code'
    },
    errorMessage: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        field: 'error_message'
    },
    errorDetail: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'error_detail'
    },
    originalData: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'original_data'
    },
    validationErrors: {
        type: sequelize_1.DataTypes.JSONB,
        field: 'validation_errors'
    },
    isResolved: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_resolved'
    },
    resolvedAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'resolved_at'
    },
    resolvedBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'resolved_by'
    },
    resolutionMethod: {
        type: sequelize_1.DataTypes.STRING(100),
        field: 'resolution_method'
    },
    resolutionRemark: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'resolution_remark'
    },
    affectedReportFields: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        field: 'affected_report_fields'
    },
    excludedFromReport: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'excluded_from_report'
    },
    createdBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'created_by'
    }
}, {
    sequelize: db_1.default,
    modelName: 'FailedRecord',
    tableName: 'failed_records',
    timestamps: true,
    indexes: [
        { fields: ['failure_no'], unique: true },
        { fields: ['source'] },
        { fields: ['retry_category'] },
        { fields: ['is_resolved'] },
        { fields: ['excluded_from_report'] },
        { fields: ['created_at'] }
    ]
});
exports.default = FailedRecord;
//# sourceMappingURL=FailedRecord.js.map