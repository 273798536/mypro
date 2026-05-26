"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
exports.prisma = prisma;
async function connectDB() {
    try {
        await prisma.$connect();
        console.log('Database connected successfully');
    }
    catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}
async function disconnectDB() {
    await prisma.$disconnect();
}
//# sourceMappingURL=prisma.js.map