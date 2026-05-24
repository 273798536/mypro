"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class SigninRecord extends sequelize_1.Model {
    id;
    signinNo;
    employeeId;
    employeeName;
    department;
    trainingId;
    trainingName;
    trainingDate;
    signinTime;
    signinType;
    source;
    sourceFile;
    qrcodeId;
    location;
    latitude;
    longitude;
    isProxy;
    proxyEmployeeId;
    proxyEmployeeName;
    isCompensated;
    compensationSource;
    isValid;
    validationRemark;
    createdBy;
    createdAt;
    updatedAt;
}
SigninRecord.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    signinNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'signin_no'
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
        allowNull: false,
        field: 'signin_time'
    },
    signinType: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.SigninType)),
        allowNull: false,
        field: 'signin_type'
    },
    source: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DataSource)),
        allowNull: false
    },
    sourceFile: {
        type: sequelize_1.DataTypes.STRING(255),
        field: 'source_file'
    },
    qrcodeId: {
        type: sequelize_1.DataTypes.STRING(100),
        field: 'qrcode_id'
    },
    location: {
        type: sequelize_1.DataTypes.STRING(200)
    },
    latitude: {
        type: sequelize_1.DataTypes.DECIMAL(10, 6)
    },
    longitude: {
        type: sequelize_1.DataTypes.DECIMAL(10, 6)
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
    isCompensated: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_compensated'
    },
    compensationSource: {
        type: sequelize_1.DataTypes.STRING(100),
        field: 'compensation_source'
    },
    isValid: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_valid'
    },
    validationRemark: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'validation_remark'
    },
    createdBy: {
        type: sequelize_1.DataTypes.INTEGER,
        field: 'created_by'
    }
}, {
    sequelize: db_1.default,
    modelName: 'SigninRecord',
    tableName: 'signin_records',
    timestamps: true,
    indexes: [
        { fields: ['signin_no'], unique: true },
        { fields: ['employee_id', 'training_id', 'training_date'] },
        { fields: ['training_id'] },
        { fields: ['training_date'] },
        { fields: ['department'] },
        { fields: ['source'] },
        { fields: ['signin_type'] },
        { fields: ['is_valid'] },
        { fields: ['is_compensated'] }
    ]
});
exports.default = SigninRecord;
//# sourceMappingURL=SigninRecord.js.map