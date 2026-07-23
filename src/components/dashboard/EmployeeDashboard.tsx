"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Wallet,
  Calendar,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";

interface SlipInfo {
  id: string;
  qrCodeText: string;
  payroll: {
    id: string;
    period: string;
    baseSalary: number;
    allowance: number;
    bonus: number;
    overtime?: number;
    deduction: number;
    totalSalary: number;
    status: string;
    paidAt: string | null;
  };
}

interface EmployeeStats {
  employee: {
    id: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    joinedDate: string;
    gender: string;
    birthDate: string;
    status: string;
    photo: string | null;
    position: {
      name: string;
      baseSalary: number;
      allowance: number;
    };
  };
  totalSalaryYear: number;
  lastSlip: SlipInfo | null;
  slips: SlipInfo[];
  overtimeStats?: {
    monthHours: number;
    monthNominal: number;
    pendingCount: number;
    lastStatus: string | null;
  };
}

export default function EmployeeDashboard() {
  const { data: stats, isLoading, error } = useQuery<EmployeeStats>({
    queryKey: ["employee-stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !stats || !stats.employee) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center gap-2">
        <p className="text-rose-500 font-semibold">Gagal memuat data dashboard karyawan</p>
        <p className="text-sm text-slate-500">Akun Anda mungkin belum terhubung dengan data Karyawan</p>
      </div>
    );
  }

  const { employee, totalSalaryYear, lastSlip, slips } = stats;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-r from-blue-600 to-blue-500 rounded-3xl p-7 text-white overflow-hidden shadow-sm"
      >
        <div className="relative z-10 space-y-2.5">
          <span className="inline-flex bg-white/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase backdrop-blur-md">
            Dashboard Portal
          </span>
          <h2 className="text-2xl font-black">Halo, {employee.name}!</h2>
          <p className="text-xs text-blue-50 max-w-md leading-relaxed">
            Anda terdaftar sebagai <span className="font-bold underline decoration-wavy decoration-white/50">{employee.position.name}</span>. 
            Kelola data profil, presensi harian, dan unduh slip gaji terbit Anda secara instan.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-[0.04] pointer-events-none transform translate-y-6 translate-x-4">
          <Wallet size={220} />
        </div>
      </motion.div>

      {/* Grid: Profile & Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Informasi Profil
          </h3>
          
          <div className="flex items-center gap-4 py-2 border-b border-slate-50 pb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-2xl shrink-0">
              {employee.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 text-sm truncate">{employee.name}</p>
              <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5">{employee.position.name}</p>
              <span className="inline-block mt-2 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                Karyawan Aktif
              </span>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2.5">
              <Mail size={15} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{employee.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={15} className="text-slate-400 shrink-0" />
              <span className="font-medium">{employee.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{employee.address}</span>
            </div>
            <div className="flex items-center gap-2.5 pt-1 border-t border-slate-50">
              <Calendar size={15} className="text-slate-400 shrink-0" />
              <span className="font-medium text-[11px]">
                Bergabung: {new Date(employee.joinedDate).toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Stats Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Earnings Year */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pendapatan Tahun Ini</span>
                <p className="text-xl font-black text-slate-900 tracking-tight">
                  Rp {totalSalaryYear.toLocaleString("id-ID")}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Akumulasi bruto</p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                <Wallet size={20} />
              </div>
            </div>

            {/* Overtime Stats */}
            <Link
              href="/absensi/lembur"
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-3xl p-5 shadow-sm flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Lembur Bulan Ini</span>
                <p className="text-xl font-black text-indigo-900 tracking-tight">
                  {stats.overtimeStats?.monthHours || 0} Jam
                </p>
                <p className="text-[10px] text-indigo-600 font-medium">
                  Rp {(stats.overtimeStats?.monthNominal || 0).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors rounded-2xl shrink-0">
                <Clock size={20} />
              </div>
            </Link>

            {/* Last Slip Summary */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Slip Gaji Terakhir</span>
                {lastSlip ? (
                  <>
                    <p className="text-xl font-black text-slate-900 tracking-tight">
                      Rp {lastSlip.payroll.totalSalary.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">Periode: {lastSlip.payroll.period}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-450 py-1">Belum ada slip</p>
                    <p className="text-[10px] text-slate-400 font-medium">-</p>
                  </>
                )}
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                <FileSpreadsheet size={20} />
              </div>
            </div>
          </div>

          {/* Last Slip Detailed Actions */}
          {lastSlip && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rincian Slip Terakhir ({lastSlip.payroll.period})
                  </h4>
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    Metode Transfer • Dibayarkan pada: {lastSlip.payroll.paidAt ? new Date(lastSlip.payroll.paidAt).toLocaleDateString("id-ID", {
                      year: "numeric", month: "long", day: "numeric"
                    }) : "-"}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg">
                  Lunas
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-xs font-medium">
                <div>
                  <p className="text-slate-400">Gaji Pokok</p>
                  <p className="font-bold text-slate-800 mt-1">Rp {lastSlip.payroll.baseSalary.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-slate-400">Tunjangan</p>
                  <p className="font-bold text-slate-800 mt-1">Rp {lastSlip.payroll.allowance.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-slate-400">Gaji Lembur</p>
                  <p className="font-bold text-amber-600 mt-1">
                    {lastSlip.payroll.overtime && lastSlip.payroll.overtime > 0
                      ? `Rp ${lastSlip.payroll.overtime.toLocaleString("id-ID")}`
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Bonus</p>
                  <p className="font-bold text-emerald-600 mt-1">Rp {lastSlip.payroll.bonus.toLocaleString("id-ID")}</p>
                </div>
                <div>
                  <p className="text-slate-400">Potongan</p>
                  <p className="font-bold text-rose-500 mt-1">Rp {lastSlip.payroll.deduction.toLocaleString("id-ID")}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Link
                  href={`/slips?id=${lastSlip.id}`}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-sm shadow-slate-100"
                >
                  <Printer size={14} />
                  <span>Lihat Detail / Cetak</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Riwayat Slip Gaji */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Riwayat Penerimaan Gaji
            </h3>
            <p className="text-xs text-slate-405 mt-0.5">Daftar penerimaan payroll bulanan sebelumnya</p>
          </div>
          <Link
            href="/slips"
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>Semua Slip</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold h-10">
                <th className="py-2 pr-4">Periode</th>
                <th className="py-2 px-4">Gaji Pokok</th>
                <th className="py-2 px-4">Tunjangan</th>
                <th className="py-2 px-4">Gaji Lembur</th>
                <th className="py-2 px-4">Bonus</th>
                <th className="py-2 px-4">Potongan</th>
                <th className="py-2 px-4">Gaji Bersih</th>
                <th className="py-2 px-4">Tanggal Pembayaran</th>
                <th className="py-2 pl-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {slips.length > 0 ? (
                slips.slice(0, 5).map((slip) => (
                  <tr key={slip.id} className="h-12 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 pr-4 font-bold text-slate-900">
                      {slip.payroll.period}
                    </td>
                    <td className="py-2 px-4 text-slate-600 font-medium">
                      Rp {slip.payroll.baseSalary.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-slate-600 font-medium">
                      Rp {slip.payroll.allowance.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-amber-600 font-bold">
                      {slip.payroll.overtime && slip.payroll.overtime > 0
                        ? `Rp ${slip.payroll.overtime.toLocaleString("id-ID")}`
                        : "-"}
                    </td>
                    <td className="py-2 px-4 text-emerald-600 font-bold">
                      Rp {slip.payroll.bonus.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-rose-500 font-bold">
                      Rp {slip.payroll.deduction.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 font-extrabold text-blue-600">
                      Rp {slip.payroll.totalSalary.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 px-4 text-slate-400 font-medium">
                      {slip.payroll.paidAt ? new Date(slip.payroll.paidAt).toLocaleDateString("id-ID") : "-"}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <Link
                        href={`/slips?id=${slip.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl font-bold transition-all cursor-pointer shadow-sm shadow-blue-500/5 text-[10px]"
                      >
                        <Printer size={12} />
                        <span>Cetak</span>
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    Belum ada riwayat slip gaji.
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
