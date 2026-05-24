"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.getCurrentUser = getCurrentUser;
exports.changePassword = changePassword;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const models_1 = require("../models");
async function login(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }
        const user = await models_1.User.findOne({ where: { username } });
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        if (!user.isActive) {
            return res.status(403).json({ error: '账户已被禁用' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        await user.update({ lastLoginAt: new Date() });
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            username: user.username,
            realName: user.realName,
            role: user.role,
            department: user.department
        }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                realName: user.realName,
                email: user.email,
                role: user.role,
                department: user.department
            }
        });
    }
    catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '登录失败' });
    }
}
async function getCurrentUser(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: '未认证' });
    }
    res.json({ user: req.user });
}
async function changePassword(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: '旧密码和新密码不能为空' });
        }
        const user = await models_1.User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '旧密码错误' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        await user.update({ password: hashedPassword });
        res.json({ message: '密码修改成功' });
    }
    catch (error) {
        console.error('修改密码错误:', error);
        res.status(500).json({ error: '修改密码失败' });
    }
}
//# sourceMappingURL=authController.js.map