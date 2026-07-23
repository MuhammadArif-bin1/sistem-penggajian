import { z } from "zod";

export const createOvertimeSchema = z.object({
  employeeId: z.string().optional(), // optional if submitting for self (Karyawan)
  tanggal: z.string().min(1, "Tanggal lembur wajib diisi"),
  jamMulai: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam mulai harus HH:mm (misal 18:00)"),
  jamSelesai: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format jam selesai harus HH:mm (misal 22:30)"),
  alasan: z.string().min(3, "Alasan lembur minimal 3 karakter"),
  catatan: z.string().optional(),
  tarifPerJam: z.number().positive().optional().default(35000),
});

export const updateOvertimeStatusSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "COMPLETED"]),
  catatan: z.string().optional(),
});

export type CreateOvertimeInput = z.infer<typeof createOvertimeSchema>;
export type UpdateOvertimeStatusInput = z.infer<typeof updateOvertimeStatusSchema>;
