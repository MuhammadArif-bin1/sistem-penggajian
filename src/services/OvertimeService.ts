import { overtimeRepository, OvertimeFilters } from "@/repositories/OvertimeRepository";
import { employeeRepository } from "@/repositories/EmployeeRepository";
import { createOvertimeSchema, CreateOvertimeInput, updateOvertimeStatusSchema, UpdateOvertimeStatusInput } from "@/schemas/overtime.schema";
import { activityLogService } from "./ActivityLogService";
import { prisma } from "@/lib/prisma";
import { OvertimeStatus } from "@prisma/client";

export class OvertimeService {
  /**
   * Calculate total hours from jamMulai and jamSelesai in HH:mm
   */
  calculateTotalJam(jamMulai: string, jamSelesai: string): number {
    const [startH, startM] = jamMulai.split(":").map(Number);
    const [endH, endM] = jamSelesai.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      throw new Error("Jam selesai harus lebih besar dari jam mulai.");
    }

    const diffMinutes = endMinutes - startMinutes;
    const hours = Math.round((diffMinutes / 60) * 10) / 10; // 1 decimal precision, e.g. 4.5

    if (hours < 1.0) {
      throw new Error("Minimal durasi lembur adalah 1 jam.");
    }

    if (hours > 6.0) {
      throw new Error("Maksimal durasi lembur adalah 6 jam.");
    }

    return hours;
  }

  /**
   * Verify employee has clocked out on date (YYYY-MM-DD)
   */
  async verifyAttendanceClockOut(employeeId: string, dateStr: string, isManager = false) {
    let attendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: dateStr,
        },
      },
    });

    if (!attendance || !attendance.clockOut) {
      if (isManager) {
        const now = new Date();
        attendance = await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId, date: dateStr } },
          update: { clockOut: now },
          create: {
            employeeId,
            date: dateStr,
            clockIn: new Date(now.getTime() - 8 * 3600000),
            clockOut: now,
            status: "PRESENT",
          },
        });
      } else {
        throw new Error("Anda belum melakukan absensi pulang pada tanggal ini.");
      }
    }

    return attendance;
  }

  async getOvertimes(filters?: OvertimeFilters, actor?: { role: string; employeeId?: string }) {
    // If actor is KARYAWAN, enforce filtering by their own employeeId
    const effectiveFilters = { ...filters };
    if (actor && actor.role === "EMPLOYEE") {
      if (!actor.employeeId) {
        throw new Error("Akun Karyawan tidak terhubung dengan data karyawan.");
      }
      effectiveFilters.employeeId = actor.employeeId;
    }

    return overtimeRepository.findAll(effectiveFilters);
  }

  async getOvertimeById(id: string, actor?: { role: string; employeeId?: string }) {
    const overtime = await overtimeRepository.findById(id);
    if (!overtime) {
      throw new Error("Data lembur tidak ditemukan.");
    }

    if (actor && actor.role === "EMPLOYEE" && overtime.employeeId !== actor.employeeId) {
      throw new Error("Anda tidak berhak melihat pengajuan lembur karyawan lain.");
    }

    return overtime;
  }

  async createOvertime(input: CreateOvertimeInput, actor: { userId: string; role: string; employeeId?: string }) {
    const validated = createOvertimeSchema.parse(input);
    const isManager = actor.role === "ADMIN" || actor.role === "HR";

    // Determine target employeeId
    let employeeId = validated.employeeId;
    if (actor.role === "EMPLOYEE" || !employeeId) {
      if (!actor.employeeId) {
        const firstEmp = await employeeRepository.findAll();
        if (firstEmp.length > 0) {
          employeeId = firstEmp[0].id;
        } else {
          throw new Error("Data karyawan tidak ditemukan untuk pengajuan lembur.");
        }
      } else {
        employeeId = actor.employeeId;
      }
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      throw new Error("Data karyawan tidak ditemukan.");
    }

    // 1. Check Date is not in future
    const targetDate = new Date(validated.tanggal);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (targetDate > today) {
      throw new Error("Tidak boleh memilih tanggal masa depan untuk pengajuan lembur.");
    }

    // 2. Format date string YYYY-MM-DD
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // 3. Verify Attendance Clock-Out
    await this.verifyAttendanceClockOut(employeeId, dateStr, isManager);

    // 4. Calculate totalJam
    const totalJam = this.calculateTotalJam(validated.jamMulai, validated.jamSelesai);

    // 5. Check Duplicate / Overlapping Overtime on same date
    const existing = await overtimeRepository.findExistingOnDate(employeeId, targetDate);
    if (existing) {
      throw new Error(`Anda sudah memiliki pengajuan lembur (${existing.jamMulai} - ${existing.jamSelesai}) pada tanggal ${dateStr}.`);
    }

    // 6. Check Maximum 5 Overtime Submissions per Month
    const monthlyCount = await overtimeRepository.countMonthlySubmissions(employeeId, targetDate);
    if (monthlyCount >= 5) {
      throw new Error(`Batas maksimal pengajuan lembur adalah 5 kali per bulan. Anda sudah memiliki ${monthlyCount} pengajuan pada bulan ${mm}/${yyyy}.`);
    }

    // 7. Calculate Nominal
    const tarifPerJam = validated.tarifPerJam || 35000;
    const nominalLembur = totalJam * tarifPerJam;

    // 8. Save to DB
    const overtime = await overtimeRepository.create({
      employee: { connect: { id: employeeId } },
      tanggal: targetDate,
      jamMulai: validated.jamMulai,
      jamSelesai: validated.jamSelesai,
      totalJam,
      tarifPerJam,
      nominalLembur,
      alasan: validated.alasan,
      catatan: validated.catatan || null,
      status: OvertimeStatus.PENDING,
    });

    await activityLogService.log(
      actor.userId,
      `Pengajuan lembur ${totalJam} jam (Rp ${nominalLembur.toLocaleString("id-ID")}) untuk ${employee.name} pada ${dateStr}`,
      "CREATE_OVERTIME"
    );

    return overtime;
  }

  async approveOvertime(id: string, actor: { userId: string; role: string }) {
    if (actor.role !== "ADMIN" && actor.role !== "HR") {
      throw new Error("Hanya Admin atau HR yang berhak menyetujui lembur.");
    }

    const current = await this.getOvertimeById(id);
    if (current.status === OvertimeStatus.APPROVED || current.status === OvertimeStatus.COMPLETED) {
      throw new Error("Lembur ini sudah disetujui sebelumnya.");
    }

    const updated = await overtimeRepository.update(id, {
      status: OvertimeStatus.APPROVED,
      approvedBy: actor.userId,
      approvedAt: new Date(),
    });

    await activityLogService.log(
      actor.userId,
      `Lembur telah disetujui: ${updated.employee.name} (${updated.totalJam} jam - Rp ${updated.nominalLembur.toLocaleString("id-ID")})`,
      "APPROVE_OVERTIME"
    );

    return updated;
  }

  async rejectOvertime(id: string, catatan: string | undefined, actor: { userId: string; role: string }) {
    if (actor.role !== "ADMIN" && actor.role !== "HR") {
      throw new Error("Hanya Admin atau HR yang berhak menolak lembur.");
    }

    const current = await this.getOvertimeById(id);
    if (current.status === OvertimeStatus.COMPLETED) {
      throw new Error("Lembur yang sudah masuk payroll tidak dapat ditolak.");
    }

    const updated = await overtimeRepository.update(id, {
      status: OvertimeStatus.REJECTED,
      catatan: catatan || "Pengajuan lembur ditolak oleh atasan/HR.",
      approvedBy: actor.userId,
      approvedAt: new Date(),
    });

    await activityLogService.log(
      actor.userId,
      `Pengajuan lembur ditolak: ${updated.employee.name}`,
      "REJECT_OVERTIME"
    );

    return updated;
  }

  async deleteOvertime(id: string, actor: { userId: string; role: string }) {
    if (actor.role !== "ADMIN") {
      throw new Error("Hanya Admin yang dapat menghapus data lembur.");
    }

    const current = await this.getOvertimeById(id);
    if (current.status === OvertimeStatus.COMPLETED) {
      throw new Error("Tidak dapat menghapus lembur yang sudah terproses dalam Payroll.");
    }

    const deleted = await overtimeRepository.delete(id);

    await activityLogService.log(
      actor.userId,
      `Menghapus data lembur Karyawan ID: ${current.employeeId}`,
      "DELETE_OVERTIME"
    );

    return deleted;
  }

  async getSummaryStats(actor?: { role: string; employeeId?: string }, filters?: { month?: number; year?: number }) {
    let employeeId: string | undefined = undefined;
    if (actor && actor.role === "EMPLOYEE") {
      employeeId = actor.employeeId;
    }
    return overtimeRepository.getSummaryStats({ employeeId, month: filters?.month, year: filters?.year });
  }
}

export const overtimeService = new OvertimeService();
