import { PrismaClient } from '@prisma/client';
declare const prisma: PrismaClient<{
    log: ("query" | "warn" | "error")[];
}, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { prisma };
export declare function connectDB(): Promise<void>;
export declare function disconnectDB(): Promise<void>;
