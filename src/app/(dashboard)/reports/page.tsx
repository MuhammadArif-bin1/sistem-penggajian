"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileBarChart,
  Calendar,
  Users,
  Printer,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { motion } from "framer-motion";

interface Position {
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface Payroll {
  id: string;
  employeeId: string;
  employee: {
    name: string;
    email: string;
    position: {
      name: string;
    };
  };
  period: string;
  baseSalary: number;
  allowance: number;
  bonus: number;
  deduction: number;
  totalSalary: number;
  status: string;
  paidAt: string | null;
}

export default function ReportsPage() {
  const [periodFilter, setPeriodFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [employeeFilter, setEmployeeFilter] = useState("");

  // Fetch employees for dropdown filter
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["report-employees-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/employees?limit=100");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  // Fetch report data
  const { data: reportData = [], isLoading } = useQuery<Payroll[]>({
    queryKey: ["payroll-reports", periodFilter, employeeFilter],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (periodFilter) q.append("period", periodFilter);
      if (employeeFilter) q.append("employeeId", employeeFilter);
      const res = await fetch(`/api/reports?${q.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  // Calculations
  const totalBaseSalary = reportData.reduce((sum, p) => sum + p.baseSalary, 0);
  const totalAllowance = reportData.reduce((sum, p) => sum + p.allowance, 0);
  const totalBonus = reportData.reduce((sum, p) => sum + p.bonus, 0);
  const totalDeduction = reportData.reduce((sum, p) => sum + p.deduction, 0);
  const totalNetSalary = reportData.reduce((sum, p) => sum + p.totalSalary, 0);

  const handleExportExcel = () => {
    const q = new URLSearchParams();
    if (periodFilter) q.append("period", periodFilter);
    if (employeeFilter) q.append("employeeId", employeeFilter);
    q.append("format", "csv");

    // Trigger browser file download
    window.open(`/api/reports?${q.toString()}`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan Payroll</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analisis pengeluaran penggajian, filter per periode bulanan, dan ekspor dokumen.
          </p>
        </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                const q = new URLSearchParams();
                if (periodFilter) q.append("period", periodFilter);
                if (employeeFilter) q.append("employeeId", employeeFilter);
                q.append("format", "csv");
                window.open(`/api/reports?${q.toString()}`);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Rekap Payroll</span>
            </button>
            <button
              onClick={() => {
                const q = new URLSearchParams();
                if (periodFilter) q.append("period", periodFilter);
                q.append("format", "mass_transfer");
                window.open(`/api/reports?${q.toString()}`);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Mass Transfer Bank</span>
            </button>
            <button
              onClick={() => {
                const q = new URLSearchParams();
                if (periodFilter) q.append("period", periodFilter);
                q.append("format", "taxes");
                window.open(`/api/reports?${q.toString()}`);
              }}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>Pajak & BPJS</span>
            </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print-only text-slate-900 font-sans text-center mb-6 border-b-2 border-slate-900 pb-4">
        <h1 className="text-xl font-bold uppercase">Laporan Payroll Bulanan</h1>
        <h2 className="text-sm font-semibold mt-1">PT Teknologi & Digital</h2>
        <p className="text-xs text-slate-500 mt-0.5">Periode Laporan: {periodFilter || "Semua Periode"}</p>
      </div>

      {/* Filter Options (Hidden on print) */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm no-print">
        {/* Month */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Periode</label>
          <div className="relative">
            <Calendar size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="month"
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-750 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Karyawan Filter */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Karyawan</label>
          <div className="relative">
            <Users size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="">Semua Karyawan</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Pengeluaran Bersih</span>
          <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">
            Rp {totalNetSalary.toLocaleString("id-ID")}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
            <DollarSign size={12} />
            <span>Total dana yang ditransfer</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Akumulasi Bonus</span>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            Rp {totalBonus.toLocaleString("id-ID")}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
            <TrendingUp size={12} className="text-emerald-500" />
            <span>Lembur, insentif, & bonus</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Total Potongan</span>
          <p className="text-xl font-bold text-rose-500 mt-1">
            Rp {totalDeduction.toLocaleString("id-ID")}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-2">
            <TrendingDown size={12} className="text-rose-500" />
            <span>Ketidakhadiran, denda, & PPh</span>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm overflow-hidden print-shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold h-10 bg-slate-50/50 dark:bg-slate-800/20">
                <th className="py-2.5 px-4">Nama Karyawan</th>
                <th className="py-2.5 px-4">Jabatan</th>
                <th className="py-2.5 px-4">Periode</th>
                <th className="py-2.5 px-4">Gaji Pokok</th>
                <th className="py-2.5 px-4">Tunjangan</th>
                <th className="py-2.5 px-4">Bonus</th>
                <th className="py-2.5 px-4">Potongan</th>
                <th className="py-2.5 px-4">Total Gaji</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : reportData.length > 0 ? (
                reportData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors h-12">
                    <td className="py-2 px-4 font-semibold text-slate-800 dark:text-white">
                      {row.employee.name}
                    </td>
                    <td className="py-2 px-4 text-slate-500">
                      {row.employee.position.name}
                    </td>
                    <td className="py-2 px-4 text-slate-500">
                      {row.period}
                    </td>
                    <td className="py-2 px-4 text-slate-700 dark:text-slate-300 font-mono">
                      Rp {row.baseSalary.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-slate-700 dark:text-slate-300 font-mono">
                      Rp {row.allowance.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-emerald-600 font-mono">
                      Rp {row.bonus.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-rose-500 font-mono">
                      Rp {row.deduction.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 font-bold text-slate-850 dark:text-white font-mono">
                      Rp {row.totalSalary.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          row.status === "PAID"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-600"
                        }`}
                      >
                        {row.status === "PAID" ? "Lunas" : "Draft"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data laporan payroll untuk filter terpilih.
                  </td>
                </tr>
              )}
              {/* Grand Total Row */}
              {reportData.length > 0 && (
                <tr className="bg-slate-50 dark:bg-slate-800/40 font-bold h-12 border-t-2 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                  <td colSpan={3} className="py-2 px-4 text-left">
                    TOTAL KESELURUHAN
                  </td>
                  <td className="py-2 px-4 font-mono">
                    Rp {totalBaseSalary.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 px-4 font-mono">
                    Rp {totalAllowance.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 px-4 text-emerald-600 font-mono">
                    Rp {totalBonus.toLocaleString("id-ID")}
                  </td>
                  <td className="py-2 px-4 text-rose-500 font-mono">
                    Rp {totalDeduction.toLocaleString("id-ID")}
                  </td>
                  <td colSpan={2} className="py-2 px-4 text-blue-600 dark:text-blue-400 font-mono text-sm">
                    Rp {totalNetSalary.toLocaleString("id-ID")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
