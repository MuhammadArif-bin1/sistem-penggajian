import { activityLogRepository } from "@/repositories/ActivityLogRepository";

export class ActivityLogService {
  async log(userId: string | null, description: string, actionType: string) {
    return activityLogRepository.create(userId, description, actionType);
  }

  async getLogs(limit?: number) {
    return activityLogRepository.findAll(limit);
  }
}

export const activityLogService = new ActivityLogService();
