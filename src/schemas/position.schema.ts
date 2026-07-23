import { z } from "zod";

export const positionSchema = z.object({
  name: z.string().min(2, "Nama jabatan minimal 2 karakter"),
  baseSalary: z.preprocess((val) => Number(val), z.number().min(0, "Gaji pokok tidak boleh kurang dari 0")),
  allowance: z.preprocess((val) => Number(val), z.number().min(0, "Tunjangan tidak boleh kurang dari 0")),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type PositionInput = z.infer<typeof positionSchema>;
