"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class ManualPriceAdjustment extends sequelize_1.Model {
    id;
    adjustmentNo;
    employeeId;
    employeeName;
    department;
    trainingId;
    trainingName;
    trainingDate;
    originalPrice;
    adjustedPrice;
    adjustmentReason;
    effectiveDate;
    source;
    sourceFile;
    approvedBy;
    approvalTime;
    isApproved;
    remark;
    createdBy;
    createdAt;
    updatedAt;
}
ManualPriceAdjustment.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    adjustmentNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'adjustment_no'
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
    originalPrice: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'original_price'
    },
    adjustedPrice: {
        type: sequelize_1.DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'adjusted_price'
    },
    adjustmentReason: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
        field: 'adjustment_reason'
    },
    effectiveDate: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
        field: 'effective_date'
    },
    source: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DataSource)),
        allowNull: false
    },
    sourceFile: {
        type: sequelize_1.DataTypes.STRING(255),
        field: 'source_file'
    },
    approvedBy: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'approved_by'
    },
    approvalTime: {
        type: sequelize_1.DataTypes.DATE,
        field: 'approval_time'
    },
    isApproved: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_approved'
    },
    remark: {
        type: sequelize_1.DataTypes.TEXT
    },
    createdBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'created_by'
    }
}, {
    sequelize: db_1.default,
    modelName: 'ManualPriceAdjustment',
    tableName: 'manual_price_adjustments',
    timestamps: true,
    indexes: [
        { fields: ['adjustment_no'], unique: true },
        { fields: ['employee_id'] },
        { fields: ['training_id'] },
        { fields: ['training_date'] },
        { fields: ['department'] },
        { fields: ['source'] },
        { fields: ['is_approved'] }
    ]
});
exports.default = ManualPriceAdjustment;
//# sourceMappingURL=ManualPriceAdjustment.js.map