import { PrismaClient, Role, Gender, EmployeeStatus, EmploymentType, PayrollStatus, BankName } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import * as path from "path";
import { parseBankEnum } from "../src/lib/bank";

const prisma = new PrismaClient();

const RANDOM_BANKS = [
  BankName.BANK_BCA,
  BankName.BANK_BRI,
  BankName.BANK_MANDIRI,
  BankName.BANK_BNI,
];

async function main() {
  console.log("=== STARTING DATABASE SEED & IMPORT ===");

  // Pre-compute password hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const hrPasswordHash = await bcrypt.hash("hr123", 10);
  const empPasswordHash = await bcrypt.hash("karyawan123", 10);

  // 1. Clean existing data
  console.log("Cleaning database...");
  await prisma.activityLog.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.salarySlip.deleteMany({});
  await prisma.payroll.deleteMany({});
  await prisma.overtime.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.position.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Create Default Users (Admin, HR, Employee)
  console.log("Creating default users (Admin, HR, Employee)...");
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@payroll.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@company.com",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      email: "hr@payroll.com",
      passwordHash: hrPasswordHash,
      role: Role.HR,
    },
  });

  await prisma.user.create({
    data: {
      email: "hr@company.com",
      passwordHash: hrPasswordHash,
      role: Role.HR,
    },
  });

  const testEmpUser = await prisma.user.create({
    data: {
      email: "karyawan@payroll.com",
      passwordHash: empPasswordHash,
      role: Role.EMPLOYEE,
    },
  });

  // 3. Create Positions
  console.log("Creating positions...");
  const positionsData = [
    { name: "Software Engineer", baseSalary: 12000000, allowance: 2000000, description: "Senior Software Engineer" },
    { name: "Tech Lead", baseSalary: 18000000, allowance: 3000000, description: "Engineering Technical Lead" },
    { name: "HR Specialist", baseSalary: 8500000, allowance: 1000000, description: "Human Resource Specialist" },
    { name: "Finance Manager", baseSalary: 14000000, allowance: 2500000, description: "Finance and Accounting Manager" },
    { name: "Marketing Manager", baseSalary: 13000000, allowance: 2000000, description: "Marketing Communication Manager" },
    { name: "QA Engineer", baseSalary: 10000000, allowance: 1500000, description: "Quality Assurance Engineer" },
    { name: "UI/UX Designer", baseSalary: 10000000, allowance: 1500000, description: "Product UI/UX Designer" },
    { name: "HR Manager", baseSalary: 15000000, allowance: 2500000, description: "Human Resource Department Head" },
    { name: "Junior Developer", baseSalary: 4500000, allowance: 500000, description: "Junior Application Developer" },
  ];

  const positionMap: Record<string, string> = {};
  for (const p of positionsData) {
    const created = await prisma.position.create({
      data: {
        name: p.name,
        baseSalary: p.baseSalary,
        allowance: p.allowance,
        description: p.description,
        status: EmployeeStatus.ACTIVE,
      },
    });
    positionMap[p.name] = created.id;
  }
  const defaultPositionId = Object.values(positionMap)[0];

  // Create HR Employee record linked to hrUser
  await prisma.employee.create({
    data: {
      userId: hrUser.id,
      name: "Siti Rahmawati (HR)",
      email: "hr@payroll.com",
      phone: "081298765432",
      address: "Jl. Sudirman No. 45, Jakarta",
      joinedDate: new Date("2023-01-01"),
      gender: Gender.FEMALE,
      birthDate: new Date("1990-05-15"),
      status: EmployeeStatus.ACTIVE,
      positionId: positionMap["HR Manager"] || defaultPositionId,
      department: "Human Resource",
      employmentType: EmploymentType.FULL_TIME,
      bankName: BankName.BANK_BCA,
      bankAccount: "9876543211",
      accountHolder: "Siti Rahmawati",
    },
  });

  // 4. Read and Import Employee Master Data from CSV/Excel
  const baseDir = process.cwd();
  const csv30Path = path.join(baseDir, "dataset_karyawan_30.csv");
  const csv20Path = path.join(baseDir, "dataset_karyawan_20.csv");
  const empExcelPath = path.join(baseDir, "EmployeeMasterData_2026-07-15 (1).xlsx");

  let readCount = 0;
  let successCount = 0;
  let insertCount = 0;
  let updateCount = 0;
  let failCount = 0;

  let empRows: any[] = [];
  if (require("fs").existsSync(csv30Path)) {
    console.log("Reading CSV file dataset_karyawan_30.csv...");
    const wbEmp = XLSX.readFile(csv30Path);
    empRows = XLSX.utils.sheet_to_json(wbEmp.Sheets[wbEmp.SheetNames[0]]);
  } else if (require("fs").existsSync(csv20Path)) {
    console.log("Reading CSV file dataset_karyawan_20.csv...");
    const wbEmp = XLSX.readFile(csv20Path);
    empRows = XLSX.utils.sheet_to_json(wbEmp.Sheets[wbEmp.SheetNames[0]]);
  } else if (require("fs").existsSync(empExcelPath)) {
    console.log("Reading Excel file...");
    const wbEmp = XLSX.readFile(empExcelPath);
    empRows = XLSX.utils.sheet_to_json(wbEmp.Sheets[wbEmp.SheetNames[0]]);
  } else {
    console.log("Dataset file not found on disk, using generated seed employee dataset...");
    empRows = [
      { name: "Budi Santoso", email: "budi.santoso@company.com", phone: "081234567890", bank: "BCA", bankAccount: "1234567890", positionId: "pos-1", departmentId: "dept-1" },
      { name: "Siti Rahma", email: "siti.rahma@company.com", phone: "081234567891", bank: "BRI", bankAccount: "9876543210", positionId: "pos-2", departmentId: "dept-1" },
      { name: "Andi Wijaya", email: "andi.wijaya@company.com", phone: "081234567892", bank: "MANDIRI", bankAccount: "1122334455", positionId: "pos-3", departmentId: "dept-2" },
      { name: "Dewi Lestari", email: "dewi.lestari@company.com", phone: "081234567893", bank: "BNI", bankAccount: "5544332211", positionId: "pos-4", departmentId: "dept-2" },
    ];
  }
  readCount = empRows.length;

  const createdEmployees: any[] = [];
  let isTestUserAssigned = false;

  for (let i = 0; i < empRows.length; i++) {
    const row = empRows[i];
    const name = row.nama_lengkap || row.name || `Karyawan ${i + 1}`;
    const email = row.email || `karyawan${i + 1}@payroll.com`;
    const phone = row.no_hp || row.phone ? String(row.no_hp || row.phone) : "081234567890";
    const address = row.alamat || row.address || "Jakarta, Indonesia";
    const joinDate = row.tanggal_masuk ? new Date(row.tanggal_masuk) : (row.joinDate ? new Date(row.joinDate) : new Date("2023-01-15"));
    const birthDate = row.tanggal_lahir ? new Date(row.tanggal_lahir) : new Date("1995-01-01");
    const genderStr = (row.jenis_kelamin || row.gender || "").toString().toUpperCase();
    const gender = (genderStr === "P" || genderStr === "FEMALE" || genderStr === "PEREMPUAN") ? Gender.FEMALE : Gender.MALE;
    
    const statusStr = (row.status || "").toLowerCase();
    let empType: EmploymentType = EmploymentType.FULL_TIME;
    if (statusStr.includes("kontrak") || statusStr.includes("contract")) empType = EmploymentType.CONTRACT;
    if (statusStr.includes("intern") || statusStr.includes("freelance")) empType = EmploymentType.FREELANCE;

    // Bank Validation & Mapping
    const bankRaw = row.bank || row.Bank || row.bankName || row.BankName || "";
    let mappedBank = parseBankEnum(bankRaw);

    if (!mappedBank) {
      if (bankRaw) {
        console.error(`[LOG IMPORT ERROR] Baris ${i + 1} (${name}): Bank '${bankRaw}' tidak sesuai pilihan/kosong. Data dilewati.`);
        failCount++;
        continue;
      } else {
        mappedBank = RANDOM_BANKS[i % RANDOM_BANKS.length];
      }
    }

    const rawAccount = row.nomor_rekening || row.bankAccount || row.bank_account || row["Nomor Rekening"];
    const bankAccount = rawAccount ? String(rawAccount).replace(/\D/g, "") : `1029384${String(i + 10).padStart(3, "0")}`;
    const accountHolder = row.atas_nama_rekening || row.accountHolder || row["Atas Nama Rekening"] || name;

    const department = row.departemen || row.department || "General";
    const posName = row.jabatan || row.position || "Software Engineer";
    
    // Auto find or create Position if needed
    let positionId = positionMap[posName];
    if (!positionId) {
      const createdPos = await prisma.position.create({
        data: {
          name: posName,
          baseSalary: row.gaji_pokok ? Number(row.gaji_pokok) : 6000000,
          allowance: 1000000,
          description: posName,
          status: EmployeeStatus.ACTIVE,
        },
      });
      positionMap[posName] = createdPos.id;
      positionId = createdPos.id;
    }

    // Link first employee / budi.santoso to testEmpUser uniquely
    let userId: string | undefined = undefined;
    if (!isTestUserAssigned && (email === "budi.santoso@company.com" || email === "karyawan@payroll.com" || i === 0)) {
      userId = testEmpUser.id;
      isTestUserAssigned = true;
    }

    const employeeData = {
      name,
      email,
      phone,
      address,
      joinedDate: joinDate,
      gender,
      birthDate,
      status: EmployeeStatus.ACTIVE,
      positionId,
      department,
      employmentType: empType,
      bankName: mappedBank,
      bankAccount,
      accountHolder,
      npwp: row.taxNumber ? String(row.taxNumber) : null,
    };

    const existing = await prisma.employee.findUnique({ where: { email } });
    let emp;
    if (existing) {
      emp = await prisma.employee.update({
        where: { email },
        data: employeeData,
      });
      updateCount++;
    } else {
      emp = await prisma.employee.create({
        data: {
          ...employeeData,
          userId: userId || undefined,
        },
      });
      insertCount++;
    }
    successCount++;
    createdEmployees.push(emp);
  }

  // Also import Dataset Gaji .xlsx for payroll generation (with fallback if file not on disk)
  const gajiExcelPath = path.join(baseDir, "Dataset - Gaji .xlsx");
  console.log("Checking salary dataset path:", gajiExcelPath);

  let gajiRows: any[] = [];
  if (require("fs").existsSync(gajiExcelPath)) {
    console.log("Reading Salary Excel file...");
    const wbGaji = XLSX.readFile(gajiExcelPath);
    gajiRows = XLSX.utils.sheet_to_json(wbGaji.Sheets[wbGaji.SheetNames[0]]);
  }

  console.log(`Creating Payrolls & Salary Slips for ${createdEmployees.length} employees...`);
  const period = "2026-07";

  for (let idx = 0; idx < createdEmployees.length; idx++) {
    const emp = createdEmployees[idx];
    const gajiData = gajiRows[idx % gajiRows.length] || {};
    const baseSalary = emp.baseSalary || 10000000;
    const allowance = 1500000;
    const bonus = (gajiData["Skor Kinerja (X2)"] || 75) * 10000;
    const overtime = Math.round((gajiData["Tahun Pengalaman (X1)"] || 2) * 200000);
    const deduction = 200000;
    const bpjsKesehatan = Math.round(baseSalary * 0.01);
    const bpjsKetenagakerjaan = Math.round(baseSalary * 0.02);
    const pph21 = Math.round(baseSalary * 0.05);
    const totalSalary = baseSalary + allowance + bonus + overtime - deduction - bpjsKesehatan - bpjsKetenagakerjaan - pph21;

    const payroll = await prisma.payroll.create({
      data: {
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
        status: PayrollStatus.DRAFT,
        paidAt: null,
      },
    });

    await prisma.salarySlip.create({
      data: {
        payrollId: payroll.id,
        employeeId: emp.id,
        qrCodeText: `SLIP-${emp.id}-${period}`,
      },
    });

    // Create sample attendance clock-out for today & yesterday
    const dateToday = new Date().toISOString().substring(0, 10);
    const dateYesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);

    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date: dateToday } },
      update: { clockOut: new Date() },
      create: {
        employeeId: emp.id,
        date: dateToday,
        clockIn: new Date(Date.now() - 36000000),
        clockOut: new Date(),
        status: "PRESENT",
      },
    });

    await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: emp.id, date: dateYesterday } },
      update: { clockOut: new Date(Date.now() - 86400000) },
      create: {
        employeeId: emp.id,
        date: dateYesterday,
        clockIn: new Date(Date.now() - 122400000),
        clockOut: new Date(Date.now() - 86400000),
        status: "PRESENT",
      },
    });
  }



  console.log("=== IMPORT LOG SUMMARY ===");
  console.log(`Jumlah Data Dibaca: ${readCount}`);
  console.log(`Jumlah Berhasil: ${successCount}`);
  console.log(`Jumlah Insert: ${insertCount}`);
  console.log(`Jumlah Update: ${updateCount}`);
  console.log(`Jumlah Gagal: ${failCount}`);

  await prisma.activityLog.create({
    data: {
      userId: adminUser.id,
      description: `Import Excel Selesai. Total ${readCount} data dibaca, ${successCount} berhasil (${insertCount} baru, ${updateCount} update, ${failCount} gagal).`,
      actionType: "IMPORT",
    },
  });

  console.log("=== SEEDING & IMPORT COMPLETE SUCCESSFULLY ===");
}

async function runSeedWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SEED] Attempt ${attempt} of ${maxRetries}...`);
      await main();
      return;
    } catch (e: any) {
      console.error(`[SEED ERROR] Attempt ${attempt} failed: ${e.message}`);
      if (attempt === maxRetries) {
        throw e;
      }
      console.log("[SEED] Retrying in 2 seconds...");
      await new Promise((res) => setTimeout(res, 2000));
    }
  }
}

runSeedWithRetry()
  .catch((e) => {
    console.error("Fatal: Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
