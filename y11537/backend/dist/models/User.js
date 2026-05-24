"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db"));
const types_1 = require("./types");
class User extends sequelize_1.Model {
    id;
    username;
    password;
    realName;
    email;
    role;
    department;
    isActive;
    lastLoginAt;
    createdAt;
    updatedAt;
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    password: {
        type: sequelize_1.DataTypes.STRING(255),
        allowNull: false
    },
    realName: {
        type: sequelize_1.DataTypes.STRING(50),
        allowNull: false,
        field: 'real_name'
    },
    email: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    role: {
        type: sequelize_1.DataTypes.ENUM(...Object.values(types_1.UserRole)),
        allowNull: false,
        defaultValue: types_1.UserRole.READ_ONLY
    },
    department: {
        type: sequelize_1.DataTypes.STRING(100),
        allowNull: true
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active'
    },
    lastLoginAt: {
        type: sequelize_1.DataTypes.DATE,
        field: 'last_login_at'
    }
}, {
    sequelize: db_1.default,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    indexes: [
        { fields: ['username'] },
        { fields: ['role'] },
        { fields: ['department'] }
    ]
});
exports.default = User;
//# sourceMappingURL=User.js.map