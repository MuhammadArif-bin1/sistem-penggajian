import { employeeRepository } from "@/repositories/EmployeeRepository";
import { userRepository } from "@/repositories/UserRepository";
import { employeeSchema, EmployeeInput } from "@/schemas/employee.schema";
import { activityLogService } from "./ActivityLogService";
import bcrypt from "bcryptjs";

export class EmployeeService {
  async getEmployees(
    filters?: { search?: string; status?: string; positionId?: string; bankName?: string },
    page = 1,
    limit = 10,
  ) {
    const shouldPaginate = limit > 0;
    const skip = shouldPaginate ? (page - 1) * limit : undefined;
    const take = shouldPaginate ? limit : undefined;
    const items = await employeeRepository.findAll(filters, skip, take ?? null);
    const total = await employeeRepository.count(filters);

    return {
      items,
      meta: {
        total,
        page: shouldPaginate ? page : 1,
        limit: shouldPaginate ? limit : total,
        totalPages: shouldPaginate ? Math.ceil(total / limit) : 1,
      },
    };
  }

  async getEmployeeById(id: string) {
    const employee = await employeeRepository.findById(id);
    if (!employee) {
      throw new Error("Karyawan tidak ditemukan");
    }
    return employee;
  }

  async getEmployeeByUserId(userId: string) {
    return employeeRepository.findByUserId(userId);
  }

  async createEmployee(input: EmployeeInput, actorId: string) {
    const validated = employeeSchema.parse(input);

    // Validate email uniqueness
    const existingEmployee = await employeeRepository.findByEmail(
      validated.email,
    );
    if (existingEmployee) {
      throw new Error("Email sudah terdaftar untuk karyawan lain");
    }

    const existingUser = await userRepository.findByEmail(validated.email);
    if (existingUser) {
      throw new Error("Email sudah terdaftar untuk akun user lain");
    }

    let userId: string | undefined;

    if (validated.createAccount && validated.password) {
      const passwordHash = await bcrypt.hash(validated.password, 10);
      const user = await userRepository.create({
        email: validated.email,
        passwordHash,
        role: validated.roleAccount || "EMPLOYEE",
      });
      userId = user.id;
    }

    const employee = await employeeRepository.create({
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      address: validated.address,
      joinedDate: validated.joinedDate,
      gender: validated.gender,
      birthDate: validated.birthDate,
      status: validated.status,
      photo: validated.photo || null,
      positionId: validated.positionId,
      userId: userId || null,
      npwp: validated.npwp || null,
      bankName: validated.bankName as any,
      bankAccount: validated.bankAccount,
      accountHolder: validated.accountHolder,
      department: validated.department || null,
      employmentType: validated.employmentType || "FULL_TIME",
    });

    // Automatically generate payroll & salary slip for the joined month
    if (employee.status === "ACTIVE") {
      try {
        const joinedDateObj = new Date(employee.joinedDate);
        const period = `${joinedDateObj.getFullYear()}-${String(joinedDateObj.getMonth() + 1).padStart(2, "0")}`;

        const baseSalary = employee.position.baseSalary;
        const allowance = employee.position.allowance;
        const bpjsKesehatan = baseSalary * 0.01;
        const bpjsKetenagakerjaan = baseSalary * 0.02;
        const pph21 = baseSalary * 0.05;
        const totalSalary =
          baseSalary +
          allowance -
          (bpjsKesehatan + bpjsKetenagakerjaan + pph21);

        await prisma.$transaction(async (tx) => {
          const p = await tx.payroll.create({
            data: {
              employeeId: employee.id,
              period,
              baseSalary,
              allowance,
              overtime: 0,
              bonus: 0,
              deduction: 0,
              bpjsKesehatan,
              bpjsKetenagakerjaan,
              pph21,
              totalSalary,
              status: "DRAFT",
            },
          });

          const qrCodeText = `PAYROLL-SLIP-${p.id}-${employee.id}-${period}`;
          await tx.salarySlip.create({
            data: {
              payrollId: p.id,
              employeeId: employee.id,
              qrCodeText,
            },
          });
        });
      } catch (payrollErr) {
        console.error("Auto-generation of payroll failed:", payrollErr);
      }
    }

    await activityLogService.log(
      actorId,
      `Menambahkan karyawan baru: ${employee.name} (Jabatan: ${employee.position.name})`,
      "CREATE_EMPLOYEE",
    );

    return employee;
  }

  async updateEmployee(id: string, input: EmployeeInput, actorId: string) {
    const current = await this.getEmployeeById(id);
    const validated = employeeSchema.parse(input);

    // Validate email uniqueness if changing email
    if (validated.email !== current.email) {
      const existingEmployee = await employeeRepository.findByEmail(
        validated.email,
      );
      if (existingEmployee) {
        throw new Error("Email sudah terdaftar untuk karyawan lain");
      }

      const existingUser = await userRepository.findByEmail(validated.email);
      if (existingUser && existingUser.id !== current.userId) {
        throw new Error("Email sudah terdaftar untuk akun user lain");
      }
    }

    let userId = current.userId;

    // Handle account creation during update if not previously created
    if (validated.createAccount && !userId && validated.password) {
      const passwordHash = await bcrypt.hash(validated.password, 10);
      const user = await userRepository.create({
        email: validated.email,
        passwordHash,
        role: validated.roleAccount || "EMPLOYEE",
      });
      userId = user.id;
    } else if (userId) {
      // Sync user email if employee email changes
      await userRepository.update(userId, {
        email: validated.email,
        role: validated.roleAccount || "EMPLOYEE",
      });

      // Update password if specified
      if (validated.password) {
        const passwordHash = await bcrypt.hash(validated.password, 10);
        await userRepository.update(userId, { passwordHash });
      }
    }

    const employee = await employeeRepository.update(id, {
      name: validated.name,
      email: validated.email,
      phone: validated.phone,
      address: validated.address,
      joinedDate: validated.joinedDate,
      gender: validated.gender,
      birthDate: validated.birthDate,
      status: validated.status,
      photo: validated.photo || current.photo,
      positionId: validated.positionId,
      userId: userId || null,
      npwp: validated.npwp || null,
      bankName: validated.bankName as any,
      bankAccount: validated.bankAccount,
      accountHolder: validated.accountHolder,
      department: validated.department || null,
      employmentType: validated.employmentType || "FULL_TIME",
    });

    await activityLogService.log(
      actorId,
      `Mengubah data karyawan: ${employee.name}`,
      "UPDATE_EMPLOYEE",
    );

    return employee;
  }

  async deleteEmployee(id: string, actorId: string) {
    const employee = await this.getEmployeeById(id);

    // Delete employee (cascades user account if exists, due to Cascade relation)
    await employeeRepository.delete(id);

    // Delete user account manually if not cascaded, or just clean up
    if (employee.userId) {
      try {
        await prisma.user.delete({ where: { id: employee.userId } });
      } catch (err) {
        // Safe to ignore if already cascaded
      }
    }

    await activityLogService.log(
      actorId,
      `Menghapus karyawan: ${employee.name}`,
      "DELETE_EMPLOYEE",
    );

    return employee;
  }
}

import { prisma } from "@/lib/prisma";

export const employeeService = new EmployeeService();
