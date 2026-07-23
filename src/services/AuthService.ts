import { userRepository } from "@/repositories/UserRepository";
import { employeeRepository } from "@/repositories/EmployeeRepository";
import { loginSchema, changePasswordSchema, updateProfileSchema, resetPasswordSchema, LoginInput, ChangePasswordInput, UpdateProfileInput, ResetPasswordInput } from "@/schemas/auth.schema";
import { signJWT } from "@/lib/jwt";
import { activityLogService } from "./ActivityLogService";
import bcrypt from "bcryptjs";

export class AuthService {
  async login(input: LoginInput) {
    const validated = loginSchema.parse(input);
    const user = await userRepository.findByEmail(validated.email);
    
    if (!user) {
      throw new Error("Email atau password salah");
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      throw new Error("Email atau password salah");
    }

    const employee = user.employee;
    const token = signJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      employeeId: employee?.id || null,
    });

    await activityLogService.log(
      user.id,
      `User ${user.email} berhasil login sebagai ${user.role}`,
      "LOGIN"
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employee || null,
      },
    };
  }

  async getMe(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User tidak ditemukan");
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      employee: user.employee || null,
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const validated = changePasswordSchema.parse(input);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User tidak ditemukan");
    }

    const isMatch = await bcrypt.compare(validated.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error("Password saat ini salah");
    }

    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);
    await userRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    await activityLogService.log(
      userId,
      `User mengubah password`,
      "CHANGE_PASSWORD"
    );

    return { success: true };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const validated = updateProfileSchema.parse(input);
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error("User tidak ditemukan");
    }

    // Verify email uniqueness if email is being updated
    if (validated.email !== user.email) {
      const existing = await userRepository.findByEmail(validated.email);
      if (existing && existing.id !== userId) {
        throw new Error("Email sudah digunakan");
      }
    }

    // Update user
    await userRepository.update(userId, {
      email: validated.email,
    });

    // Update employee if exists
    if (user.employee) {
      await employeeRepository.update(user.employee.id, {
        name: validated.name,
        email: validated.email,
        photo: validated.photo || user.employee.photo,
      });
    }

    await activityLogService.log(
      userId,
      `User mengupdate profil`,
      "UPDATE_PROFILE"
    );

    return this.getMe(userId);
  }

  async resetPassword(input: ResetPasswordInput) {
    const validated = resetPasswordSchema.parse(input);
    const { email, phone, newPassword } = validated;

    if (email === "admin@payroll.com") {
      // Admin verification (can verify with a standard recovery phone "081234567890")
      if (phone !== "081234567890") {
        throw new Error("Nomor HP pemulihan Admin tidak cocok!");
      }
      
      const user = await userRepository.findByEmail(email);
      if (!user) {
        throw new Error("User tidak ditemukan");
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await userRepository.update(user.id, { passwordHash });

      await activityLogService.log(
        user.id,
        `Admin mereset password melalui Lupa Kata Sandi`,
        "RESET_PASSWORD"
      );

      return { success: true, message: "Password Admin berhasil diperbarui" };
    }

    // Lookup employee by email
    const employee = await employeeRepository.findByEmail(email);
    if (!employee) {
      throw new Error("Email karyawan tidak terdaftar");
    }

    // Format phone numbers to match easily
    const dbPhone = employee.phone.replace(/[\s-]/g, "");
    const inputPhone = phone.replace(/[\s-]/g, "");

    if (dbPhone !== inputPhone) {
      throw new Error("Nomor HP tidak cocok dengan data karyawan");
    }

    if (!employee.userId) {
      throw new Error("Karyawan ini belum memiliki akun masuk (hubungi admin)");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.update(employee.userId, { passwordHash });

    await activityLogService.log(
      employee.userId,
      `Karyawan ${employee.name} mereset password melalui Lupa Kata Sandi`,
      "RESET_PASSWORD"
    );

    return { success: true, message: "Password berhasil diperbarui" };
  }
}

export const authService = new AuthService();
