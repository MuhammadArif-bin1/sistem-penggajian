import { payrollRepository } from "@/repositories/PayrollRepository";
import { employeeRepository } from "@/repositories/EmployeeRepository";
import { positionRepository } from "@/repositories/PositionRepository";
import { generatePayrollSchema, updatePayrollSchema, bulkPayPayrollSchema, GeneratePayrollInput, UpdatePayrollInput, BulkPayPayrollInput } from "@/schemas/payroll.schema";
import { activityLogService } from "./ActivityLogService";
import { prisma } from "@/lib/prisma";

export class PayrollService {
  async getPayrolls(filters?: { period?: string; employeeId?: string; status?: string; search?: string }) {
    return payrollRepository.findAll(filters);
  }

  async getPayrollById(id: string) {
    const payroll = await payrollRepository.findById(id);
    if (!payroll) {
      throw new Error("Data payroll tidak ditemukan");
    }
    return payroll;
  }

  async generatePayroll(input: GeneratePayrollInput, actorId: string) {
    const validated = generatePayrollSchema.parse(input);
    const { period, employeeIds } = validated;

    const results = [];
    const errors = [];

    for (const empId of employeeIds) {
      try {
        // Check if already exists for this period
        const existing = await payrollRepository.findByEmployeeAndPeriod(empId, period);
        if (existing) {
          errors.push(`Karyawan ID ${empId} sudah memiliki payroll untuk periode ${period}`);
          continue;
        }

        const employee = await employeeRepository.findById(empId);
        if (!employee) {
          errors.push(`Karyawan ID ${empId} tidak ditemukan`);
          continue;
        }

        if (employee.status !== "ACTIVE") {
          errors.push(`Karyawan ${employee.name} berstatus tidak aktif`);
          continue;
        }

        const baseSalary = employee.position.baseSalary;
        const allowance = employee.position.allowance;

        // Fetch APPROVED overtimes for this employee in the period
        const [yearStr, monthStr] = period.split("-");
        const periodStart = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1);
        const periodEnd = new Date(parseInt(yearStr), parseInt(monthStr), 0, 23, 59, 59, 999);

        const approvedOvertimes = await prisma.overtime.findMany({
          where: {
            employeeId: empId,
            status: "APPROVED",
            tanggal: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        });

        const overtimeNominal = approvedOvertimes.reduce((sum, item) => sum + item.nominalLembur, 0);

        // Auto calculate BPJS and Tax
        const bpjsKesehatan = baseSalary * 0.01;
        const bpjsKetenagakerjaan = baseSalary * 0.02;
        const pph21 = baseSalary * 0.05;

        // Formula: Total = Gaji Pokok + Tunjangan + Bonus + Nominal Lembur - Potongan - BPJS - PPh21
        const totalSalary = baseSalary + allowance + overtimeNominal - (bpjsKesehatan + bpjsKetenagakerjaan + pph21);

        // Start transaction for generating Payroll, linking Overtimes, and SalarySlip
        const payroll = await prisma.$transaction(async (tx) => {
          const p = await tx.payroll.create({
            data: {
              employeeId: empId,
              period,
              baseSalary,
              allowance,
              overtime: overtimeNominal,
              bonus: 0,
              deduction: 0,
              bpjsKesehatan,
              bpjsKetenagakerjaan,
              pph21,
              totalSalary,
              status: "DRAFT",
            },
          });

          // Update linked overtimes
          if (approvedOvertimes.length > 0) {
            await tx.overtime.updateMany({
              where: {
                id: { in: approvedOvertimes.map((o) => o.id) },
              },
              data: {
                payrollId: p.id,
                status: "COMPLETED",
              },
            });
          }

          const qrCodeText = `PAYROLL-SLIP-${p.id}-${empId}-${period}`;
          await tx.salarySlip.create({
            data: {
              payrollId: p.id,
              employeeId: empId,
              qrCodeText,
            },
          });

          return p;
        });

        results.push(payroll);
      } catch (err: any) {
        errors.push(`Gagal memproses karyawan ID ${empId}: ${err.message}`);
      }
    }

    await activityLogService.log(
      actorId,
      `Generate payroll periode ${period} untuk ${results.length} karyawan`,
      "GENERATE_PAYROLL"
    );

    return {
      successCount: results.length,
      errors,
      data: results,
    };
  }

  async updatePayroll(id: string, input: UpdatePayrollInput, actorId: string) {
    const current = await this.getPayrollById(id);
    const validated = updatePayrollSchema.parse(input);

    const baseSalary = validated.baseSalary !== undefined ? validated.baseSalary : current.baseSalary;
    const allowance = validated.allowance !== undefined ? validated.allowance : current.allowance;
    const bonus = validated.bonus !== undefined ? validated.bonus : current.bonus;
    const deduction = validated.deduction !== undefined ? validated.deduction : current.deduction;

    const bpjsKesehatan = Math.round(baseSalary * 0.01);
    const bpjsKetenagakerjaan = Math.round(baseSalary * 0.02);
    const pph21 = Math.round(baseSalary * 0.05);

    const totalSalary = baseSalary + allowance + (current.overtime || 0) + bonus - (deduction + bpjsKesehatan + bpjsKetenagakerjaan + pph21);

    const payroll = await payrollRepository.update(id, {
      baseSalary,
      allowance,
      bonus,
      deduction,
      bpjsKesehatan,
      bpjsKetenagakerjaan,
      pph21,
      totalSalary,
      status: validated.status,
      paidAt: validated.status === "PAID" ? validated.paidAt || new Date() : null,
    });

    // Ensure SalarySlip exists when paid
    if (payroll.status === "PAID") {
      const existingSlip = await prisma.salarySlip.findUnique({
        where: { payrollId: payroll.id },
      });
      if (!existingSlip) {
        const qrCodeText = `PAYROLL-SLIP-${payroll.id}-${payroll.employeeId}-${payroll.period}`;
        await prisma.salarySlip.create({
          data: {
            payrollId: payroll.id,
            employeeId: payroll.employeeId,
            qrCodeText,
          },
        });
      }
    }

    await activityLogService.log(
      actorId,
      `Update payroll Karyawan: ${payroll.employee.name} (Periode: ${payroll.period}) - Total Gaji: Rp ${payroll.totalSalary.toLocaleString("id-ID")}`,
      "UPDATE_PAYROLL"
    );

    return payroll;
  }

  async deletePayroll(id: string, actorId: string) {
    const payroll = await this.getPayrollById(id);
    await payrollRepository.delete(id);

    await activityLogService.log(
      actorId,
      `Menghapus payroll Karyawan: ${payroll.employee.name} (Periode: ${payroll.period})`,
      "DELETE_PAYROLL"
    );

    return payroll;
  }

  async getSalarySlipById(id: string) {
    const slip = await payrollRepository.findSalarySlipById(id);
    if (!slip) {
      throw new Error("Slip gaji tidak ditemukan");
    }
    return slip;
  }

  async getSalarySlips(filters?: { period?: string; employeeId?: string }) {
    return payrollRepository.findSalarySlips(filters);
  }

  async getDashboardStats() {
    const employeeCount = await prisma.employee.count({ where: { status: "ACTIVE" } });
    const positionCount = await prisma.position.count({ where: { status: "ACTIVE" } });
    const slipCount = await prisma.salarySlip.count();

    // Get current period (month) spent
    const currentMonth = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
    const payrollsThisMonth = await prisma.payroll.findMany({
      where: { period: currentMonth },
    });
    const totalPayrollThisMonth = payrollsThisMonth.reduce((acc, curr) => acc + curr.totalSalary, 0);

    // Get payroll history by period for Recharts Chart
    const payrollsHistory = await prisma.payroll.groupBy({
      by: ["period"],
      _sum: {
        totalSalary: true,
      },
      orderBy: {
        period: "asc",
      },
      take: 6, // Last 6 months
    });

    const chartData = payrollsHistory.map((item) => ({
      period: item.period,
      amount: item._sum.totalSalary || 0,
    }));

    return {
      employeeCount,
      positionCount,
      slipCount,
      totalPayrollThisMonth,
      chartData,
    };
  }

  async getEmployeeStats(employeeId: string) {
    const slips = await prisma.salarySlip.findMany({
      where: { employeeId },
      include: {
        payroll: true,
      },
      orderBy: {
        payroll: {
          period: "desc",
        },
      },
    });

    const totalSalaryYear = slips.reduce((sum, slip) => {
      // Simple filter for current year e.g. "2026"
      const currentYear = new Date().getFullYear().toString();
      if (slip.payroll.period.startsWith(currentYear)) {
        return sum + slip.payroll.totalSalary;
      }
      return sum;
    }, 0);

    return {
      slips,
      totalSalaryYear,
      lastSlip: slips[0] || null,
    };
  }

  async bulkPayPayrolls(input: BulkPayPayrollInput, actorId: string) {
    const validated = bulkPayPayrollSchema.parse(input);
    const { payrollIds, paidAt } = validated;

    const payrolls = await prisma.payroll.findMany({
      where: {
        id: { in: payrollIds },
        status: "DRAFT",
      },
      include: {
        employee: true,
      },
    });

    if (payrolls.length === 0) {
      throw new Error("Tidak ada payroll berstatus 'Belum Dibayar' yang dapat diproses");
    }

    const payDate = paidAt || new Date();

    // Perform bulk update & bulk slip creation in transaction with 30s timeout
    await prisma.$transaction(
      async (tx) => {
        // 1. Bulk update status to PAID
        await tx.payroll.updateMany({
          where: {
            id: { in: payrolls.map((p) => p.id) },
            status: "DRAFT",
          },
          data: {
            status: "PAID",
            paidAt: payDate,
          },
        });

        // 2. Fetch all existing salary slips for these payrolls in ONE single batch query
        const existingSlips = await tx.salarySlip.findMany({
          where: {
            payrollId: { in: payrolls.map((p) => p.id) },
          },
          select: { payrollId: true },
        });

        const existingSlipSet = new Set(existingSlips.map((s) => s.payrollId));

        // 3. Filter payrolls missing a salary slip
        const missingSlipsData = payrolls
          .filter((p) => !existingSlipSet.has(p.id))
          .map((p) => ({
            payrollId: p.id,
            employeeId: p.employeeId,
            qrCodeText: `PAYROLL-SLIP-${p.id}-${p.employeeId}-${p.period}`,
          }));

        if (missingSlipsData.length > 0) {
          await tx.salarySlip.createMany({
            data: missingSlipsData,
            skipDuplicates: true,
          });
        }
      },
      {
        timeout: 30000,
      }
    );

    const totalPaidAmount = payrolls.reduce((sum, p) => sum + p.totalSalary, 0);

    await activityLogService.log(
      actorId,
      `Pembayaran gaji sekaligus untuk ${payrolls.length} karyawan - Total Rp ${totalPaidAmount.toLocaleString("id-ID")}`,
      "BULK_PAY_PAYROLL"
    );

    return {
      successCount: payrolls.length,
      totalPaidAmount,
      payrolls,
    };
  }
}

export const payrollService = new PayrollService();
