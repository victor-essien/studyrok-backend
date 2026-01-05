

import { prisma } from "@/lib/prisma";
import logger from "@/utils/logger";

export class DatabaseService {
  async createTopic(data: {
    userId?: string;
    title: string;
    difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    description?: string;
    status?: 'GENERATING' | 'COMPLETED' | 'FAILED';
  }) {
    // cast prisma to any to avoid missing generated model typings in this environment
    return await prisma.topic.create({
      data: {

        userId: data.userId || undefined,
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        status: data.status || 'GENERATING',
      },
    });
  }
}
