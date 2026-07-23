import { prisma } from "@/lib/prisma";

export class ActivityLogRepository {
  async create(userId: string | null, description: string, actionType: string) {
    try {
      if (userId) {
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) {
          userId = null;
        }
      }
      return await prisma.activityLog.create({
        data: {
          userId,
          description,
          actionType,
        },
      });
    } catch (error) {
      console.warn("[ACTIVITYLOG WARNING] Could not write activity log:", error);
      return null;
    }
  }

  async findAll(limit: number = 50) {
    return prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            role: true,
            employee: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }
}

export const activityLogRepository = new ActivityLogRepository();
