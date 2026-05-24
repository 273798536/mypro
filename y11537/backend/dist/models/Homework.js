"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class Homework extends sequelize_1.Model {
    id;
    homeworkNo;
    employeeId;
    employeeName;
    department;
    trainingId;
    trainingName;
    trainingDate;
    submitTime;
    homeworkTitle;
    homeworkContent;
    score;
    grade;
    source;
    sourceFile;
    remark;
    createdBy;
    createdAt;
    updatedAt;
}
Homework.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    homeworkNo: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        field: 'homework_no'
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
    submitTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'submit_time'
    },
    homeworkTitle: {
        type: sequelize_1.DataTypes.STRING(200),
        allowNull: false,
        field: 'homework_title'
    },
    homeworkContent: {
        type: sequelize_1.DataTypes.TEXT,
        field: 'homework_content'
    },
    score: {
        type: sequelize_1.DataTypes.DECIMAL(5, 2)
    },
    grade: {
        type: sequelize_1.DataTypes.STRING(20)
    },
    source: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.DataSource)),
        allowNull: false
    },
    sourceFile: {
        type: sequelize_1.DataTypes.STRING(255),
        field: 'source_file'
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
    modelName: 'Homework',
    tableName: 'homeworks',
    timestamps: true,
    indexes: [
        { fields: ['homework_no'], unique: true },
        { fields: ['employee_id'] },
        { fields: ['training_id'] },
        { fields: ['training_date'] },
        { fields: ['department'] },
        { fields: ['source'] }
    ]
});
exports.default = Homework;
//# sourceMappingURL=Homework.js.map