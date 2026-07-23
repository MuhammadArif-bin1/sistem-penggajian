import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== CREATING DATABASE FUNCTIONS & TRIGGERS IN SUPABASE POSTGRESQL ===");

  // 1. Trigger Function: Automatically update "updatedAt" column on update
  console.log("1. Creating function: update_updated_at_column()...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."updatedAt" = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Attach updatedAt triggers to tables individually
  const tablesWithUpdatedAt = ["Employee", "Payroll", "LeaveRequest", "Position", "SalarySlip", "Attendance"];
  for (const table of tablesWithUpdatedAt) {
    const triggerName = `trigger_update_${table.toLowerCase()}_updated_at`;
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${triggerName} ON public."${table}";`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER ${triggerName}
      BEFORE UPDATE ON public."${table}"
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    `);
  }
  console.log("✓ Function update_updated_at_column() & triggers created.");

  // 2. Database Function: Validate Employee Bank Information
  console.log("2. Creating function: validate_employee_bank()...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.validate_employee_bank()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Check bankName is not null
      IF NEW."bankName" IS NULL THEN
        RAISE EXCEPTION 'Nama Bank wajib diisi dan harus berupa salah satu dari enum BankName (BANK_BCA, BANK_BRI, BANK_MANDIRI, BANK_BNI)';
      END IF;

      -- Check bankAccount format (must be digits only, 10 to 20 chars)
      IF NEW."bankAccount" IS NULL OR NEW."bankAccount" !~ '^[0-9]{10,20}$' THEN
        RAISE EXCEPTION 'Nomor Rekening wajib diisi dan harus berupa angka 10-20 digit. Input: %', NEW."bankAccount";
      END IF;

      -- Check accountHolder is not null or empty
      IF NEW."accountHolder" IS NULL OR TRIM(NEW."accountHolder") = '' THEN
        RAISE EXCEPTION 'Atas Nama Rekening wajib diisi.';
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trigger_validate_employee_bank ON public."Employee";`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trigger_validate_employee_bank
    BEFORE INSERT OR UPDATE ON public."Employee"
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_employee_bank();
  `);
  console.log("✓ Function validate_employee_bank() & trigger created.");

  // 3. Database Function: Automatic Leave Balance Deduction on Approval
  console.log("3. Creating function: deduct_leave_balance_on_approval()...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.deduct_leave_balance_on_approval()
    RETURNS TRIGGER AS $$
    DECLARE
      v_leave_days INT;
    BEGIN
      -- Only trigger when status changes from something else to APPROVED
      IF NEW."status" = 'APPROVED' AND (OLD."status" IS NULL OR OLD."status" != 'APPROVED') THEN
        -- Calculate number of days
        v_leave_days := (NEW."endDate"::date - NEW."startDate"::date) + 1;
        IF v_leave_days < 1 THEN
          v_leave_days := 1;
        END IF;

        -- Deduct leaveBalance in Employee table
        UPDATE public."Employee"
        SET "leaveBalance" = GREATEST(0, "leaveBalance" - v_leave_days)
        WHERE "id" = NEW."employeeId";
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trigger_deduct_leave_balance ON public."LeaveRequest";`);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trigger_deduct_leave_balance
    AFTER UPDATE ON public."LeaveRequest"
    FOR EACH ROW
    EXECUTE FUNCTION public.deduct_leave_balance_on_approval();
  `);
  console.log("✓ Function deduct_leave_balance_on_approval() & trigger created.");

  // 4. Database Function: Get Payroll Summary for a Period
  console.log("4. Creating function: get_payroll_summary(p_period TEXT)...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.get_payroll_summary(p_period TEXT)
    RETURNS TABLE (
      period TEXT,
      total_employees BIGINT,
      total_base_salary DOUBLE PRECISION,
      total_allowance DOUBLE PRECISION,
      total_bonus DOUBLE PRECISION,
      total_overtime DOUBLE PRECISION,
      total_deduction DOUBLE PRECISION,
      total_bpjs DOUBLE PRECISION,
      total_pph21 DOUBLE PRECISION,
      total_net_salary DOUBLE PRECISION
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT
        p_period AS period,
        COUNT(p."id") AS total_employees,
        COALESCE(SUM(p."baseSalary"), 0) AS total_base_salary,
        COALESCE(SUM(p."allowance"), 0) AS total_allowance,
        COALESCE(SUM(p."bonus"), 0) AS total_bonus,
        COALESCE(SUM(p."overtime"), 0) AS total_overtime,
        COALESCE(SUM(p."deduction"), 0) AS total_deduction,
        COALESCE(SUM(p."bpjsKesehatan" + p."bpjsKetenagakerjaan"), 0) AS total_bpjs,
        COALESCE(SUM(p."pph21"), 0) AS total_pph21,
        COALESCE(SUM(p."totalSalary"), 0) AS total_net_salary
      FROM public."Payroll" p
      WHERE p."period" = p_period;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log("✓ Function get_payroll_summary(p_period) created.");

  // 5. Database Function: Get Employee Bank Distribution Report
  console.log("5. Creating function: get_bank_distribution()...");
  await prisma.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION public.get_bank_distribution()
    RETURNS TABLE (
      bank_name public."BankName",
      total_employees BIGINT,
      percentage NUMERIC
    ) AS $$
    DECLARE
      v_total_all BIGINT;
    BEGIN
      SELECT COUNT(*) INTO v_total_all FROM public."Employee";
      IF v_total_all = 0 THEN
        v_total_all := 1;
      END IF;

      RETURN QUERY
      SELECT
        e."bankName" AS bank_name,
        COUNT(e."id") AS total_employees,
        ROUND((COUNT(e."id") * 100.0 / v_total_all), 2) AS percentage
      FROM public."Employee" e
      GROUP BY e."bankName"
      ORDER BY total_employees DESC;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log("✓ Function get_bank_distribution() created.");

  console.log("=== ALL DATABASE FUNCTIONS & TRIGGERS SUCCESSFULLY IMPLEMENTED IN SUPABASE ===");
}

main()
  .catch((e) => {
    console.error("Error creating database functions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
