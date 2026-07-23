export function generatePayrollCSV(payrolls: any[]): string {
  const headers = [
    "Periode",
    "Nama Karyawan",
    "Email",
    "Jabatan",
    "Gaji Pokok (Rp)",
    "Tunjangan (Rp)",
    "Bonus (Rp)",
    "Potongan (Rp)",
    "BPJS Kesehatan (Rp)",
    "BPJS Ketenagakerjaan (Rp)",
    "PPh21 (Rp)",
    "Total Gaji (Rp)",
    "Status Pembayaran",
    "Tanggal Dibayar",
  ];

  const csvRows = [headers.join(",")];

  for (const row of payrolls) {
    const values = [
      `"${row.period}"`,
      `"${row.employee.name.replace(/"/g, '""')}"`,
      `"${row.employee.email.replace(/"/g, '""')}"`,
      `"${row.employee.position.name.replace(/"/g, '""')}"`,
      row.baseSalary,
      row.allowance,
      row.bonus,
      row.deduction,
      row.bpjsKesehatan || 0,
      row.bpjsKetenagakerjaan || 0,
      row.pph21 || 0,
      row.totalSalary,
      `"${row.status}"`,
      `"${row.paidAt ? new Date(row.paidAt).toISOString().split("T")[0] : "-"}"`,
    ];
    csvRows.push(values.join(","));
  }

  // Prepend UTF-8 BOM to ensure Excel opens it correctly with UTF-8 encoding
  return "\uFEFF" + csvRows.join("\n");
}

import { formatBankLabel } from "./bank";

export function generateMassTransferCSV(payrolls: any[]): string {
  const headers = [
    "Nama Bank",
    "Nomor Rekening",
    "Atas Nama Rekening",
    "Nominal Transfer",
    "Berita Transfer"
  ];

  const csvRows = [headers.join(",")];

  for (const row of payrolls) {
    const bankName = formatBankLabel(row.employee.bankName);
    const bankAccount = row.employee.bankAccount || "-";
    const accountHolder = row.employee.accountHolder || row.employee.name;

    const values = [
      `"${bankName}"`,
      `"${bankAccount}"`,
      `"${accountHolder.replace(/"/g, '""')}"`,
      row.totalSalary,
      `"Gaji ${row.period}"`
    ];
    csvRows.push(values.join(","));
  }

  return "\uFEFF" + csvRows.join("\n");
}

export function generateTaxesCSV(payrolls: any[]): string {
  const headers = [
    "Periode",
    "Nama Karyawan",
    "NPWP",
    "BPJS Kesehatan",
    "BPJS Ketenagakerjaan",
    "PPh21"
  ];

  const csvRows = [headers.join(",")];

  for (const row of payrolls) {
    const npwp = row.employee.npwp || "-";
    
    const values = [
      `"${row.period}"`,
      `"${row.employee.name.replace(/"/g, '""')}"`,
      `"${npwp}"`,
      row.bpjsKesehatan || 0,
      row.bpjsKetenagakerjaan || 0,
      row.pph21 || 0
    ];
    csvRows.push(values.join(","));
  }

  return "\uFEFF" + csvRows.join("\n");
}
