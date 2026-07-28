import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(2, "Nama karyawan minimal 2 karakter"),
  email: z.string().email("Format email tidak valid"),
  phone: z.string().min(8, "Nomor HP minimal 8 karakter"),
  address: z.string().min(5, "Alamat minimal 5 karakter"),
  joinedDate: z.preprocess((val) => {
    if (typeof val === "string" || val instanceof Date) return new Date(val);
    return val;
  }, z.date({ message: "Tanggal masuk wajib diisi" })),
  gender: z.enum(["MALE", "FEMALE"], { message: "Jenis kelamin wajib diisi" }),
  birthDate: z.preprocess((val) => {
    if (typeof val === "string" || val instanceof Date) return new Date(val);
    return val;
  }, z.date({ message: "Tanggal lahir wajib diisi" })),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  positionId: z.string().min(1, "Jabatan wajib diisi"),
  photo: z.string().optional().nullable(),
  
  // HRIS additions
  npwp: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const digitsOnly = val.replace(/\D/g, "");
        return digitsOnly.length <= 16;
      },
      { message: "Nomor NPWP tidak boleh lebih dari 16 digit angka" }
    ),
  bankName: z.enum(["BANK_BCA", "BANK_BRI", "BANK_MANDIRI", "BANK_BNI"], {
    message: "Nama Bank wajib dipilih",
  }),
  bankAccount: z
    .string({ message: "Nomor Rekening wajib diisi" })
    .min(1, "Nomor Rekening wajib diisi")
    .regex(/^\d{10,20}$/, "Nomor rekening harus berupa angka (10-20 digit)"),
  accountHolder: z
    .string({ message: "Atas Nama Rekening wajib diisi" })
    .min(1, "Atas Nama Rekening wajib diisi"),
  department: z.string().optional().nullable(),
  employmentType: z.enum(["FULL_TIME", "CONTRACT", "FREELANCE"]).default("FULL_TIME"),

  // User creation details if employee wants to login
  createAccount: z.boolean().optional().default(false),
  password: z.string().min(6, "Password minimal 6 karakter jika membuat akun").optional().or(z.literal("")),
  roleAccount: z.enum(["ADMIN", "EMPLOYEE", "HR"]).optional().default("EMPLOYEE"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
