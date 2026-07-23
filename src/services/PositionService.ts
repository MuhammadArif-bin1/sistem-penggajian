import { positionRepository } from "@/repositories/PositionRepository";
import { positionSchema, PositionInput } from "@/schemas/position.schema";
import { activityLogService } from "./ActivityLogService";

export class PositionService {
  async getPositions(filters?: { search?: string; status?: string }) {
    return positionRepository.findAll(filters);
  }

  async getPositionById(id: string) {
    const position = await positionRepository.findById(id);
    if (!position) {
      throw new Error("Jabatan tidak ditemukan");
    }
    return position;
  }

  async createPosition(input: PositionInput, actorId: string) {
    const validated = positionSchema.parse(input);

    const position = await positionRepository.create({
      name: validated.name,
      baseSalary: validated.baseSalary,
      allowance: validated.allowance,
      description: validated.description,
      status: validated.status,
    });

    await activityLogService.log(
      actorId,
      `Membuat jabatan baru: ${position.name} dengan Gaji Pokok Rp ${position.baseSalary.toLocaleString("id-ID")}`,
      "CREATE_POSITION"
    );

    return position;
  }

  async updatePosition(id: string, input: PositionInput, actorId: string) {
    await this.getPositionById(id);
    const validated = positionSchema.parse(input);

    const position = await positionRepository.update(id, {
      name: validated.name,
      baseSalary: validated.baseSalary,
      allowance: validated.allowance,
      description: validated.description,
      status: validated.status,
    });

    await activityLogService.log(
      actorId,
      `Mengubah jabatan: ${position.name}`,
      "UPDATE_POSITION"
    );

    return position;
  }

  async deletePosition(id: string, actorId: string) {
    const position = await this.getPositionById(id);
    
    // Check if position has employees
    const temp = await positionRepository.findAll();
    const withCount = temp.find(t => t.id === id);
    if (withCount && withCount._count.employees > 0) {
      throw new Error("Jabatan tidak bisa dihapus karena masih memiliki karyawan terhubung");
    }

    await positionRepository.delete(id);

    await activityLogService.log(
      actorId,
      `Menghapus jabatan: ${position.name}`,
      "DELETE_POSITION"
    );

    return position;
  }
}

export const positionService = new PositionService();
