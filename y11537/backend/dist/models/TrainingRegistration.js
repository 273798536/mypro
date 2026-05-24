"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class TrainingRegistration extends sequelize_1.Model {
    id;
    registrationNo;
    employeeId;
    employeeName;
    department;
    trainingId;
    trainingName;
    trainingDate;
    trainingLocation;
    trainer;
    source;
    sourceFile;
    batchNo;
    remark;
    createdBy;
    createdAt;
    updatedAt;
}
TrainingRegistration.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    registrationNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'registration_no'
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
    trainingLocation: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false,
        field: 'training_location'
    },
    trainer: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false
    },
    source: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DataSource)),
        allowNull: false
    },
    sourceFile: {
        type: sequelize_1.DataTypes.STRING(255),
        field: 'source_file'
    },
    batchNo: {
        type: sequelize_1.DataTypes.STRING(50),
        field: 'batch_no'
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
    modelName: 'TrainingRegistration',
    tableName: 'training_registrations',
    timestamps: true,
    indexes: [
        { fields: ['registration_no'], unique: true },
        { fields: ['employee_id'] },
        { fields: ['training_id'] },
        { fields: ['training_date'] },
        { fields: ['department'] },
        { fields: ['source'] }
    ]
});
exports.default = TrainingRegistration;
//# sourceMappingURL=TrainingRegistration.js.map