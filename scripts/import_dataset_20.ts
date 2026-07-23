import { PrismaClient, Gender, EmployeeStatus, EmploymentType, BankName, PayrollStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import { parseBankEnum } from "../src/lib/bank";

const prisma = new PrismaClient();

async function main() {
  console.log("=== STARTING IMPORT DATASET_KARYAWAN_20.CSV TO SUPABASE ===");

  const csvPath = path.join(process.cwd(), "dataset_karyawan_20.csv");
  console.log("Reading CSV file from:", csvPath);

  if (!require("fs").existsSync(csvPath)) {
    throw new Error(`File CSV tidak ditemukan pada lokasi: ${csvPath}`);
  }

  const workbook = XLSX.readFile(csvPath);
  const sheetName = workbook.SheetNames[0];
  const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

  console.log(`Ditemukan ${rows.length} baris data karyawan pada CSV.\n`);

  let successCount = 0;
  let insertCount = 0;
  let updateCount = 0;
  let failCount = 0;

  const importedEmployees: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const name = row.nama_lengkap || row.name || `Karyawan ${i + 1}`;
    const email = row.email || `karyawan${i + 1}@payroll.com`;
    const phone = row.no_hp ? String(row.no_hp) : "081234567890";
    const address = row.alamat || "Jakarta, Indonesia";

    const birthDate = row.tanggal_lahir ? new Date(row.tanggal_lahir) : new Date("1995-01-01");
    const joinedDate = row.tanggal_masuk ? new Date(row.tanggal_masuk) : new Date("2022-01-01");

    const genderRaw = String(row.jenis_kelamin || "").toUpperCase();
    const gender = genderRaw.startsWith("P") || genderRaw === "FEMALE" ? Gender.FEMALE : Gender.MALE;

    const statusStr = String(row.status || "").toLowerCase();
    let empType: EmploymentType = EmploymentType.FULL_TIME;
    if (statusStr.includes("kontrak") || statusStr.includes("contract")) {
      empType = EmploymentType.CONTRACT;
    } else if (statusStr.includes("intern") || statusStr.includes("freelance")) {
      empType = EmploymentType.FREELANCE;
    }

    const department = row.departemen || "Umum";
    const positionName = row.jabatan || "Staff";
    const baseSalary = parseFloat(row.gaji_pokok) || 6000000;

    // 1. Ensure Position exists in DB
    let position = await prisma.position.findFirst({
      where: { name: { equals: positionName, mode: "insensitive" } },
    });

    if (!position) {
      position = await prisma.position.create({
        data: {
          name: positionName,
          baseSalary: baseSalary,
          allowance: Math.round(baseSalary * 0.15),
          description: `Jabatan ${positionName} - ${department}`,
          status: EmployeeStatus.ACTIVE,
        },
      });
      console.log(`[JABATAN BARU] Dibuat jabatan '${positionName}' dengan Gaji Pokok Rp ${baseSalary.toLocaleString("id-ID")}`);
    }

    // 2. Validate & Parse Bank Name
    const bankRaw = row.bank || row.Nama_Bank || row.Bank || "";
    const mappedBank = parseBankEnum(bankRaw);

    if (!mappedBank) {
      console.error(`❌ [IMPORT GAGAL] Baris ${i + 2} (${name}): Bank '${bankRaw}' tidak valid (Harus BCA, BRI, MANDIRI, atau BNI). Baris dilewati.`);
      failCount++;
      continue;
    }

    const bankAccount = row.nomor_rekening ? String(row.nomor_rekening).replace(/\D/g, "") : "";
    if (!bankAccount || bankAccount.length < 10 || bankAccount.length > 20) {
      console.error(`❌ [IMPORT GAGAL] Baris ${i + 2} (${name}): Nomor rekening '${row.nomor_rekening}' harus 10-20 digit angka. Baris dilewati.`);
      failCount++;
      continue;
    }

    const accountHolder = row.atas_nama_rekening || name;
    const npwp = row.nik ? String(row.nik) : null;

    const employeePayload = {
      name,
      email,
      phone,
      address,
      joinedDate,
      gender,
      birthDate,
      status: EmployeeStatus.ACTIVE,
      positionId: position.id,
      department,
      employmentType: empType,
      bankName: mappedBank,
      bankAccount,
      accountHolder,
      npwp,
    };

    const existing = await prisma.employee.findUnique({ where: { email } });
    let emp;
    if (existing) {
      emp = await prisma.employee.update({
        where: { email },
        data: employeePayload,
        include: { position: true },
      });
      updateCount++;
      console.log(`[UPDATE] Baris ${i + 2}: Karyawan ${name} (${mappedBank} - ${bankAccount}) diperbarui.`);
    } else {
      emp = await prisma.employee.create({
        data: employeePayload,
        include: { position: true },
      });
      insertCount++;
      console.log(`[INSERT] Baris ${i + 2}: Karyawan ${name} (${mappedBank} - ${bankAccount}) ditambahkan.`);
    }

    successCount++;
    importedEmployees.push(emp);
  }

  // 3. Generate Payroll & Salary Slips for imported employees for 2026-07
  console.log(`\nGenerating Payrolls & Salary Slips for ${importedEmployees.length} employees...`);
  const period = "2026-07";

  for (const emp of importedEmployees) {
    const baseSalary = emp.position.baseSalary;
    const allowance = emp.position.allowance;
    const bonus = 500000;
    const overtime = 300000;
    const deduction = 150000;
    const bpjsKesehatan = Math.round(baseSalary * 0.01);
    const bpjsKetenagakerjaan = Math.round(baseSalary * 0.02);
    const pph21 = Math.round(baseSalary * 0.05);
    const totalSalary = baseSalary + allowance + bonus + overtime - deduction - bpjsKesehatan - bpjsKetenagakerjaan - pph21;

    // Upsert Payroll
    const payroll = await prisma.payroll.upsert({
      where: {
        employeeId_period: {
          employeeId: emp.id,
          period,
        },
      },
      update: {
        baseSalary,
        allowance,
        bonus,
        overtime,
        deduction,
        bpjsKesehatan,
        bpjsKetenagakerjaan,
        pph21,
        totalSalary,
        status: PayrollStatus.PAID,
        paidAt: new Date(),
      },
      create: {
        employeeId: emp.id,
        period,
        baseSalary,
        allowance,
        bonus,
        overtime,
        deduction,
        bpjsKesehatan,
        bpjsKetenagakerjaan,
        pph21,
        totalSalary,
        status: PayrollStatus.PAID,
        paidAt: new Date(),
      },
    });

    await prisma.salarySlip.upsert({
      where: { payrollId: payroll.id },
      update: {
        qrCodeText: `SLIP-${emp.id}-${period}`,
      },
      create: {
        payrollId: payroll.id,
        employeeId: emp.id,
        qrCodeText: `SLIP-${emp.id}-${period}`,
      },
    });
  }

  console.log("\n==========================================");
  console.log("=== RINGKASAN IMPORT DATASET_KARYAWAN ===");
  console.log("==========================================");
  console.log(`Total Baris Dibaca : ${rows.length}`);
  console.log(`Jumlah Berhasil    : ${successCount}`);
  console.log(`Data Ditambahkan   : ${insertCount}`);
  console.log(`Data Diperbarui    : ${updateCount}`);
  console.log(`Jumlah Gagal       : ${failCount}`);
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("Error importing dataset:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
