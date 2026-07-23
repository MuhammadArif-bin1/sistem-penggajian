import { z } from "zod";

export const generatePayrollSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Format periode harus YYYY-MM (e.g. 2026-07)"),
  employeeIds: z.array(z.string()).min(1, "Pilih minimal 1 karyawan untuk digenerate"),
});

export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;

export const updatePayrollSchema = z.object({
  baseSalary: z.preprocess((val) => (val !== undefined && val !== "" ? Number(val) : undefined), z.number().min(0, "Gaji Pokok tidak boleh negatif").optional()),
  allowance: z.preprocess((val) => (val !== undefined && val !== "" ? Number(val) : undefined), z.number().min(0, "Tunjangan tidak boleh negatif").optional()),
  bonus: z.preprocess((val) => Number(val), z.number().min(0, "Bonus tidak boleh kurang dari 0")),
  deduction: z.preprocess((val) => Number(val), z.number().min(0, "Potongan tidak boleh kurang dari 0")),
  status: z.enum(["DRAFT", "PAID"]).default("DRAFT"),
  paidAt: z.preprocess((val) => {
    if (!val) return null;
    return new Date(val as string);
  }, z.date().nullable().optional()),
});

export type UpdatePayrollInput = z.infer<typeof updatePayrollSchema>;
