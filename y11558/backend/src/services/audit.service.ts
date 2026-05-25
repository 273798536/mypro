import prisma from '../lib/prisma.js';
import type { ChainStatus } from '../types/index.js';

export class AuditService {
  async logStatusChange(
    chainId: string,
    fromStatus: ChainStatus | null,
    toStatus: ChainStatus,
    reason: string,
    operatorId: string,
    operatorName: string,
  ) {
    return prisma.statusHistory.create({
      data: {
        chainId,
        fromStatus,
        toStatus,
        reason,
        operatorId,
        operatorName,
      },
    });
  }

  async getStatusHistory(chainId: string) {
    return prisma.statusHistory.findMany({
      where: { chainId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async logHttp(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    requestBody?: string,
    responseBody?: string,
    chainId?: string,
  ) {
    return prisma.httpLog.create({
      data: {
        method,
        url,
        statusCode,
        duration,
        requestBody,
        responseBody,
        chainId,
      },
    });
  }

  async logSql(sql: string, params: any, duration: number, chainId?: string) {
    return prisma.sqlLog.create({
      data: {
        sql,
        params,
        duration,
        chainId,
      },
    });
  }

  async logCommand(command: string, output: string, exitCode: number) {
    return prisma.commandLog.create({
      data: {
        command,
        output,
        exitCode,
      },
    });
  }

  async getHttpLogs(chainId?: string, limit = 100) {
    return prisma.httpLog.findMany({
      where: chainId ? { chainId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getSqlLogs(chainId?: string, limit = 100) {
    return prisma.sqlLog.findMany({
      where: chainId ? { chainId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getCommands(limit = 100) {
    return prisma.commandLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}

export const auditService = new AuditService();
