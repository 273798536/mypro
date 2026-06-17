import prisma from '../lib/prisma';
import { ModelType } from '@prisma/client';

export class ModelVersionService {
  static async create(data: {
    name: string;
    version: string;
    type: ModelType;
    description?: string;
  }) {
    return prisma.modelVersion.create({ data });
  }

  static async list() {
    return prisma.modelVersion.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getById(id: string) {
    return prisma.modelVersion.findUniqueOrThrow({ where: { id } });
  }

  static async getByType(type: ModelType) {
    return prisma.modelVersion.findFirst({
      where: { type },
      orderBy: { createdAt: 'desc' },
    });
  }
}
