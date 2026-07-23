import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseBankEnum } from "@/lib/bank";
import { Gender, EmployeeStatus, EmploymentType, PayrollStatus } from "@prisma/client";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Akses Admin/HR diperlukan." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File CSV/Excel wajib diunggah." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "File kosong atau format tidak valid." },
        { status: 400 }
      );
    }

    let successCount = 0;
    let insertCount = 0;
    let updateCount = 0;
    let failCount = 0;
    const errorsLog: string[] = [];

    const defaultPosition = await prisma.position.findFirst({
      where: { status: EmployeeStatus.ACTIVE },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = row.nama_lengkap || row.name || row["Nama Lengkap"] || `Karyawan ${i + 1}`;
      const email = row.email || row.Email || `karyawan${i + 1}@payroll.com`;
      const phone = row.no_hp || row.phone || row["No HP"] ? String(row.no_hp || row.phone || row["No HP"]) : "081234567890";
      const address = row.alamat || row.address || row["Alamat"] || "Jakarta, Indonesia";

      const birthDate = row.tanggal_lahir ? new Date(row.tanggal_lahir) : new Date("1995-01-01");
      const joinedDate = row.tanggal_masuk ? new Date(row.tanggal_masuk) : new Date("2022-01-01");

      const genderRaw = String(row.jenis_kelamin || row.gender || "").toUpperCase();
      const gender = genderRaw.startsWith("P") || genderRaw === "FEMALE" ? Gender.FEMALE : Gender.MALE;

      const statusStr = String(row.status || "").toLowerCase();
      let empType: EmploymentType = EmploymentType.FULL_TIME;
      if (statusStr.includes("kontrak") || statusStr.includes("contract")) {
        empType = EmploymentType.CONTRACT;
      } else if (statusStr.includes("intern") || statusStr.includes("freelance")) {
        empType = EmploymentType.FREELANCE;
      }

      const department = row.departemen || row.department || "Umum";
      const positionName = row.jabatan || row.position || "Staff";
      const baseSalary = parseFloat(row.gaji_pokok || row.baseSalary) || 6000000;

      // Find or create position
      let position = await prisma.position.findFirst({
        where: { name: { equals: positionName, mode: "insensitive" } },
      });

      if (!position) {
        position = await prisma.position.create({
          data: {
            name: positionName,
            baseSalary: baseSalary,
            allowance: Math.round(baseSalary * 0.15),
            description: `Jabatan ${positionName}`,
            status: EmployeeStatus.ACTIVE,
          },
        });
      }

      // Bank Validation
      const bankRaw = row.bank || row.bankName || row.Bank || row["Nama Bank"] || "";
      const mappedBank = parseBankEnum(bankRaw);

      if (!mappedBank) {
        const msg = `Baris ${i + 2} (${name}): Nama Bank '${bankRaw}' tidak sesuai pilihan (BCA, BRI, MANDIRI, BNI). Data dilewati.`;
        errorsLog.push(msg);
        failCount++;
        continue;
      }

      const bankAccountRaw = row.nomor_rekening || row.bankAccount || row["Nomor Rekening"];
      const bankAccount = bankAccountRaw ? String(bankAccountRaw).replace(/\D/g, "") : "";
      if (!bankAccount || bankAccount.length < 10 || bankAccount.length > 20) {
        const msg = `Baris ${i + 2} (${name}): Nomor rekening '${bankAccountRaw}' harus 10-20 digit angka. Data dilewati.`;
        errorsLog.push(msg);
        failCount++;
        continue;
      }

      const accountHolder = row.atas_nama_rekening || row.accountHolder || row["Atas Nama Rekening"] || name;
      const npwp = row.nik || row.npwp ? String(row.nik || row.npwp) : null;

      const employeeData = {
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
          data: employeeData,
        });
        updateCount++;
      } else {
        emp = await prisma.employee.create({
          data: employeeData,
        });
        insertCount++;
      }
      successCount++;

      // Create Payroll
      const period = "2026-07";
      const empBaseSalary = position.baseSalary;
      const allowance = position.allowance;
      const bonus = 500000;
      const overtime = 300000;
      const deduction = 150000;
      const bpjsKesehatan = Math.round(empBaseSalary * 0.01);
      const bpjsKetenagakerjaan = Math.round(empBaseSalary * 0.02);
      const pph21 = Math.round(empBaseSalary * 0.05);
      const totalSalary = empBaseSalary + allowance + bonus + overtime - deduction - bpjsKesehatan - bpjsKetenagakerjaan - pph21;

      const payroll = await prisma.payroll.upsert({
        where: { employeeId_period: { employeeId: emp.id, period } },
        update: { totalSalary, status: PayrollStatus.PAID },
        create: {
          employeeId: emp.id,
          period,
          baseSalary: empBaseSalary,
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
        update: { qrCodeText: `SLIP-${emp.id}-${period}` },
        create: {
          payrollId: payroll.id,
          employeeId: emp.id,
          qrCodeText: `SLIP-${emp.id}-${period}`,
        },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId: actor.userId,
        description: `Import CSV/Excel Selesai. Total ${rows.length} dibaca, ${successCount} berhasil (${insertCount} baru, ${updateCount} update, ${failCount} gagal).`,
        actionType: "IMPORT",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Import dataset selesai. Total ${rows.length} dibaca, ${successCount} berhasil (${insertCount} baru, ${updateCount} update, ${failCount} gagal).`,
      summary: {
        totalRead: rows.length,
        successCount,
        insertCount,
        updateCount,
        failCount,
        errorsLog,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengimpor dataset." },
      { status: 500 }
    );
  }
}
