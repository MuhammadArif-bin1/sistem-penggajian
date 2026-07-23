"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import {
  FileSpreadsheet,
  Search,
  Printer,
  ChevronLeft,
  Loader2,
  Calendar,
  Building,
  ArrowLeft,
  Clock,
  Wallet,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { motion } from "framer-motion";

interface Position {
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedDate: string;
  position: Position;
}

interface Payroll {
  period: string;
  baseSalary: number;
  allowance: number;
  bonus: number;
  overtime?: number;
  deduction: number;
  bpjsKesehatan: number;
  bpjsKetenagakerjaan: number;
  pph21: number;
  totalSalary: number;
  paidAt: string | null;
}

interface Slip {
  id: string;
  qrCodeText: string;
  employee: Employee;
  payroll: Payroll;
}

export default function SlipsPage() {
  const { user, loading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  const slipId = searchParams.get("id");

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  // Fetch Slips
  const { data: slips = [], isLoading } = useQuery<Slip[]>({
    queryKey: ["slips", searchTerm, periodFilter],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (searchTerm) q.append("search", searchTerm);
      if (periodFilter) q.append("period", periodFilter);
      const res = await fetch(`/api/payroll?status=PAID`); // Fetches all paid payrolls (which have slips)
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      // Map to Slip structure
      return data.data.map((pr: any) => ({
        id: pr.salarySlips[0]?.id || pr.id,
        qrCodeText: pr.salarySlips[0]?.qrCodeText || `PAYROLL-SLIP-${pr.id}`,
        employee: pr.employee,
        payroll: pr,
      }));
    },
    enabled: !slipId,
  });

  // Fetch Single Slip Detail
  const { data: activeSlip, isLoading: isLoadingSlip } = useQuery<Slip>({
    queryKey: ["slip-detail", slipId],
    queryFn: async () => {
      const res = await fetch(`/api/payroll`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const found = data.data.find((pr: any) => pr.salarySlips[0]?.id === slipId || pr.id === slipId);
      if (!found) throw new Error("Slip tidak ditemukan");
      return {
        id: found.salarySlips[0]?.id || found.id,
        qrCodeText: found.salarySlips[0]?.qrCodeText || `PAYROLL-SLIP-${found.id}`,
        employee: found.employee,
        payroll: found,
      };
    },
    enabled: !!slipId,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    router.push("/slips");
  };

  // --- RENDER DETAILED SLIP VIEW ---
  if (slipId) {
    if (isLoadingSlip) {
      return (
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      );
    }

    if (!activeSlip) {
      return (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm max-w-md mx-auto space-y-4">
          <p className="font-semibold text-rose-500">Slip Gaji Tidak Ditemukan</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Kembali ke Daftar Slip
          </button>
        </div>
      );
    }

    const { employee, payroll } = activeSlip;

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Actions bar (Hidden on print) */}
        <div className="flex items-center justify-between no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Kembali</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Printer size={14} />
            <span>Cetak Slip / PDF</span>
          </button>
        </div>

        {/* Printable Payslip Invoice Layout */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 print-shadow-none rounded-3xl p-8 md:p-12 shadow-sm space-y-8 print:p-0 print:border-none"
        >
          {/* Slip Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-slate-100 pb-6 print:border-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shrink-0">
                P
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">PT Teknologi Digital Nusantara</h2>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Sistem Payroll Digital</p>
              </div>
            </div>
            <div className="sm:text-right space-y-1">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Slip Gaji Karyawan</h3>
              <p className="text-xs text-slate-405 font-medium">Periode Payroll: <span className="font-bold text-slate-700">{payroll.period}</span></p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-slate-100 pb-6 print:border-slate-300">
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Penerima Slip</span>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-sm">{employee.name}</p>
                <p className="font-semibold text-slate-500">{employee.position.name}</p>
                <p className="text-slate-400">ID Karyawan: {employee.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="space-y-2 sm:text-right">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Rincian Pembayaran</span>
              <div className="space-y-1 text-slate-500 font-medium">
                <p>Status: <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[10px]">Lunas</span></p>
                <p>Tanggal Transfer: {payroll.paidAt ? new Date(payroll.paidAt).toLocaleDateString("id-ID", {
                  year: "numeric", month: "long", day: "numeric"
                }) : "-"}</p>
                <p>Metode: Bank Transfer (Payroll Bank)</p>
              </div>
            </div>
          </div>

          {/* Key Summary Cards: Distinguishing Gaji Lembur & Gaji Bersih */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 print:border-slate-300">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Gaji Pokok & Tunjangan</span>
              <p className="text-xs font-bold text-slate-800">
                Rp {(payroll.baseSalary + payroll.allowance + payroll.bonus).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="space-y-1 border-l border-slate-200 pl-3">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
                <Clock size={11} className="text-amber-500" />
                <span>Gaji Lembur</span>
              </span>
              <p className="text-xs font-black text-amber-700">
                Rp {(payroll.overtime || 0).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="space-y-1 border-l border-slate-200 pl-3">
              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Total Potongan & Pajak</span>
              <p className="text-xs font-bold text-rose-600">
                Rp {(payroll.deduction + (payroll.bpjsKesehatan || 0) + (payroll.bpjsKetenagakerjaan || 0) + (payroll.pph21 || 0)).toLocaleString("id-ID")}
              </p>
            </div>
            <div className="space-y-1 border-l border-slate-200 pl-3 bg-blue-50/50 p-2 rounded-xl border border-blue-100">
              <span className="text-[9px] font-extrabold text-blue-600 uppercase tracking-wider block flex items-center gap-1">
                <Wallet size={11} className="text-blue-600" />
                <span>Gaji Bersih (Net Pay)</span>
              </span>
              <p className="text-sm font-black text-blue-700 tracking-tight">
                Rp {payroll.totalSalary.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rincian Penerimaan & Potongan</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-slate-300">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold h-9 print:border-slate-300">
                    <th className="py-2 px-4">Deskripsi Komponen</th>
                    <th className="py-2 px-4 text-right">Penerimaan (Rp)</th>
                    <th className="py-2 px-4 text-right">Potongan (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700 print:divide-slate-200">
                  <tr>
                    <td className="py-3 px-4">Gaji Pokok (Sesuai Skema Jabatan)</td>
                    <td className="py-3 px-4 text-right text-slate-800 font-semibold">{payroll.baseSalary.toLocaleString("id-ID")}</td>
                    <td className="py-3 px-4 text-right">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Tunjangan Operasional & Jabatan</td>
                    <td className="py-3 px-4 text-right text-slate-800 font-semibold">{payroll.allowance.toLocaleString("id-ID")}</td>
                    <td className="py-3 px-4 text-right">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Bonus Performance / Kinerja</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-bold">{payroll.bonus.toLocaleString("id-ID")}</td>
                    <td className="py-3 px-4 text-right">-</td>
                  </tr>
                  {/* Highlighted GAJI LEMBUR Row */}
                  <tr className="bg-amber-50/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                          Gaji Lembur
                        </span>
                        <span className="font-bold text-slate-900">Upah Lembur Karyawan</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-amber-700 font-extrabold">
                      {payroll.overtime && payroll.overtime > 0 ? payroll.overtime.toLocaleString("id-ID") : "0"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400">-</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Potongan Keterlambatan / Sanksi</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-rose-500 font-bold">{payroll.deduction.toLocaleString("id-ID")}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">BPJS Kesehatan (1%)</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-rose-500 font-bold">{payroll.bpjsKesehatan?.toLocaleString("id-ID") || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">BPJS Ketenagakerjaan (2%)</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-rose-500 font-bold">{payroll.bpjsKetenagakerjaan?.toLocaleString("id-ID") || 0}</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">PPh 21 (5%)</td>
                    <td className="py-3 px-4 text-right">-</td>
                    <td className="py-3 px-4 text-right text-rose-500 font-bold">{payroll.pph21?.toLocaleString("id-ID") || 0}</td>
                  </tr>
                  {/* Totals row */}
                  <tr className="bg-slate-50/70 font-bold border-t border-slate-200 print:border-slate-300">
                    <td className="py-3 px-4 text-slate-850">Subtotal Penerimaan & Potongan</td>
                    <td className="py-3 px-4 text-right text-slate-900">
                      {(payroll.baseSalary + payroll.allowance + payroll.bonus + (payroll.overtime || 0)).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600">
                      {(payroll.deduction + (payroll.bpjsKesehatan || 0) + (payroll.bpjsKetenagakerjaan || 0) + (payroll.pph21 || 0)).toLocaleString("id-ID")}
                    </td>
                  </tr>
                  {/* Highlighted GAJI BERSIH Row */}
                  <tr className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 font-black border-t-2 border-blue-500 text-sm">
                    <td className="py-4 px-4 text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider shadow-xs">
                          GAJI BERSIH
                        </span>
                        <span className="text-slate-900 font-black text-xs sm:text-sm uppercase">Total Hak Diterima (Net Payout)</span>
                      </div>
                    </td>
                    <td colSpan={2} className="py-4 px-4 text-right text-blue-700 text-base sm:text-lg font-black tracking-tight">
                      Rp {payroll.totalSalary.toLocaleString("id-ID")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer print note & signature block */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pt-6 border-t border-slate-100 print:border-slate-300">
            <div className="space-y-1.5 max-w-xs text-[10px] text-slate-400 font-medium">
              <p>Nota: Slip gaji ini diakui secara sah oleh manajemen perusahaan dan diproses melalui otentikasi portal HRIS secara elektronik.</p>
              <p className="font-mono mt-2 text-[9px]">QR Code: {activeSlip.qrCodeText}</p>
            </div>
            
            {/* Signature Block */}
            <div className="text-center space-y-12">
              <div className="space-y-0.5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pemberi Kerja</p>
                <p className="text-xs font-bold text-slate-700">PT TEKNOLOGI DIGITAL</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-slate-900 underline">Direktur Personalia</p>
                <p className="text-[9px] text-slate-400 font-semibold">Tanda Tangan Elektronik</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- RENDER SLIPS LISTING ---
  const totalOvertimeAll = slips.reduce((sum, s) => sum + (s.payroll.overtime || 0), 0);
  const totalNetSalaryAll = slips.reduce((sum, s) => sum + s.payroll.totalSalary, 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dokumen Slip Gaji</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar tanda bukti penerimaan gaji bulanan lunas dan cetak slip resmi.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards: Distinguishing Gaji Lembur & Gaji Bersih */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Slip Terbit</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">{slips.length} Lembar</p>
            <p className="text-[10px] text-slate-400 font-medium">Slip gaji terverifikasi lunas</p>
          </div>
          <div className="p-3.5 bg-slate-50 text-slate-600 rounded-2xl shrink-0 border border-slate-100">
            <FileSpreadsheet size={22} />
          </div>
        </div>

        <div className="bg-white border border-amber-200/80 rounded-3xl p-5 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-amber-50/20">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block flex items-center gap-1">
              <Clock size={11} className="text-amber-500" />
              <span>Total Gaji Lembur</span>
            </span>
            <p className="text-2xl font-black text-amber-700 tracking-tight">
              Rp {totalOvertimeAll.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-amber-600/80 font-medium">Akumulasi upah lembur karyawan</p>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl shrink-0 border border-amber-100">
            <Clock size={22} />
          </div>
        </div>

        <div className="bg-white border border-blue-200/80 rounded-3xl p-5 shadow-sm flex items-center justify-between bg-gradient-to-br from-white to-blue-50/20">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block flex items-center gap-1">
              <Wallet size={11} className="text-blue-600" />
              <span>Total Gaji Bersih</span>
            </span>
            <p className="text-2xl font-black text-blue-700 tracking-tight">
              Rp {totalNetSalaryAll.toLocaleString("id-ID")}
            </p>
            <p className="text-[10px] text-blue-600/80 font-medium">Total take home pay karyawan</p>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shrink-0 border border-blue-100">
            <Wallet size={22} />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm">
        {/* Month Picker */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50 shrink-0">
          <Calendar size={14} className="text-slate-400" />
          <input
            type="month"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="bg-transparent border-none text-xs focus:outline-none text-slate-700 font-semibold"
          />
        </div>

        {/* Search */}
        {(user.role === "ADMIN" || user.role === "HR") && (
          <div className="relative flex-1">
            <Search size={16} className="absolute inset-y-0 left-3.5 my-auto text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
            />
          </div>
        )}
      </div>

      {/* Table Content */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold h-11 bg-slate-50/50">
                <th className="py-2.5 px-4">Karyawan</th>
                <th className="py-2.5 px-4">Jabatan</th>
                <th className="py-2.5 px-4">Periode</th>
                <th className="py-2.5 px-4">Gaji Lembur</th>
                <th className="py-2.5 px-4">Gaji Bersih</th>
                <th className="py-2.5 px-4">Tanggal Pembayaran</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : slips.length > 0 ? (
                slips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/40 transition-colors h-14">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{slip.employee.name}</p>
                        <p className="text-[10px] text-slate-450 font-medium mt-0.5">{slip.employee.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {slip.employee.position.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-bold">
                      {slip.payroll.period}
                    </td>
                    <td className="py-3 px-4">
                      {slip.payroll.overtime && slip.payroll.overtime > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl text-xs">
                          Rp {slip.payroll.overtime.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-black text-blue-700 bg-blue-50 border border-blue-200/80 px-2.5 py-1 rounded-xl text-xs">
                        Rp {slip.payroll.totalSalary.toLocaleString("id-ID")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {slip.payroll.paidAt ? new Date(slip.payroll.paidAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => router.push(`/slips?id=${slip.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-all cursor-pointer shadow-sm shadow-blue-500/5 text-[10px]"
                      >
                        <Printer size={12} />
                        <span>Cetak Slip</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                    Belum ada lembar slip gaji terbit untuk disajikan.
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
