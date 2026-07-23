"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Users,
  Briefcase,
  Wallet,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface StatsData {
  employeeCount: number;
  positionCount: number;
  slipCount: number;
  totalPayrollThisMonth: number;
  overtimeStats?: {
    totalHours: number;
    todayRequests: number;
    pendingApproval: number;
  };
  chartData: Array<{ period: string; amount: number }>;
  recentActivities: Array<{
    id: string;
    description: string;
    actionType: string;
    createdAt: string;
    userEmail: string;
    userName: string;
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<StatsData>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats");
      const res = await response.json();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });

  // Chart view filter state: "weekly" | "monthly" | "yearly"
  const [chartFilter, setChartFilter] = useState<"weekly" | "monthly" | "yearly">("monthly");

  // Tooltip hover states for stats cards
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="h-[75vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center gap-2">
        <p className="text-rose-500 font-semibold">Gagal memuat data statistik</p>
        <p className="text-sm text-slate-500">Silakan periksa koneksi database Anda</p>
      </div>
    );
  }

  // Generate dynamic filters for chart
  const getChartData = () => {
    if (chartFilter === "weekly") {
      // Breakdown monthly payroll into 4 weeks
      const base = stats.totalPayrollThisMonth || 120000000;
      return [
        { period: "W1", amount: Math.round(base * 0.22) },
        { period: "W2", amount: Math.round(base * 0.24) },
        { period: "W3", amount: Math.round(base * 0.26) },
        { period: "W4", amount: Math.round(base * 0.28) },
      ];
    }
    if (chartFilter === "yearly") {
      // Group by year
      const years: { [key: string]: number } = {};
      stats.chartData.forEach((item) => {
        const yr = item.period.split("-")[0];
        years[yr] = (years[yr] || 0) + item.amount;
      });
      const data = Object.entries(years).map(([yr, amt]) => ({
        period: yr,
        amount: amt,
      }));
      return data.length > 0 ? data : [{ period: "2026", amount: stats.totalPayrollThisMonth }];
    }
    // Monthly (Default)
    return stats.chartData;
  };

  const cards = [
    {
      id: "employees",
      title: "Jumlah Karyawan",
      value: stats.employeeCount,
      icon: Users,
      growth: "+12.4%",
      isPositive: true,
      growthDesc: "Karyawan baru bergabung bulan ini",
      tooltipText: "Total seluruh karyawan dengan status keanggotaan aktif",
    },
    {
      id: "payroll",
      title: "Total Penggajian",
      value: `Rp ${stats.totalPayrollThisMonth.toLocaleString("id-ID")}`,
      icon: Wallet,
      growth: "+8.2%",
      isPositive: true,
      growthDesc: "Peningkatan dibanding bulan lalu",
      tooltipText: "Akumulasi payroll bruto bulan berjalan",
    },
    {
      id: "positions",
      title: "Jumlah Jabatan",
      value: stats.positionCount,
      icon: Briefcase,
      growth: "+2.5%",
      isPositive: true,
      growthDesc: "Divisi baru ditambahkan",
      tooltipText: "Jumlah tingkatan jabatan operasional aktif",
    },
    {
      id: "slips",
      title: "Slip Gaji Terbit",
      value: stats.slipCount,
      icon: FileText,
      growth: "+15.1%",
      isPositive: true,
      growthDesc: "Jumlah slip cetak lunas",
      tooltipText: "Total file slip gaji yang berhasil diterbitkan",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Dashboard HR & Payroll
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kelola data operasional, statistik penggajian bulanan, dan log aktivitas audit.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={card.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                
                {/* Tooltip Icon & Trigger */}
                <div 
                  className="relative cursor-pointer"
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <Info size={14} className="text-slate-350 hover:text-slate-500 transition-colors" />
                  <AnimatePresence>
                    {hoveredCard === card.id && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-6 right-0 w-48 bg-slate-900 text-white text-[10px] p-2.5 rounded-xl shadow-lg z-10 leading-normal pointer-events-none"
                      >
                        {card.tooltipText}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {card.value}
                </p>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={20} />
                </div>
              </div>

              {/* Growth indicator */}
              <div className="flex items-center gap-1.5 mt-3 border-t border-slate-50 pt-2.5">
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    card.isPositive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {card.isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {card.growth}
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate">
                  {card.growthDesc}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Overtime Quick Info Widget */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-5 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-300">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              Ringkasan Lembur Karyawan
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">
              Pantau pengajuan lembur yang memerlukan persetujuan dan verifikasi payroll.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center md:text-right">
            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider block">
              Jam Lembur Bulan Ini
            </span>
            <span className="text-xl font-black text-white">
              {stats.overtimeStats?.totalHours || 0} Jam
            </span>
          </div>

          <div className="text-center md:text-right">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
              Menunggu Approval
            </span>
            <span className="text-xl font-black text-amber-300">
              {stats.overtimeStats?.pendingApproval || 0} Pengajuan
            </span>
          </div>

          <Link
            href="/absensi/lembur"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap"
          >
            <span>Kelola Lembur</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>

      {/* Main Grid: Recharts & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Area Chart Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Laporan Gaji Perusahaan
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Grafik total pengeluaran payroll bulanan</p>
            </div>
            
            {/* Filter buttons */}
            <div className="flex bg-slate-50 border border-slate-200 p-1 rounded-xl">
              {(["weekly", "monthly", "yearly"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setChartFilter(filter)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                    chartFilter === filter
                      ? "bg-white text-blue-650 shadow-sm border border-slate-100"
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {filter === "weekly" ? "Mingguan" : filter === "monthly" ? "Bulanan" : "Tahunan"}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            {stats.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payrollBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="period"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}JT`}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    formatter={(val: any) => [`Rp ${Number(val).toLocaleString("id-ID")}`, "Total Gaji"]}
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      border: "none",
                      borderRadius: "12px",
                      color: "white",
                      fontSize: "11px",
                      fontWeight: "600",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#2563EB"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#payrollBlue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Belum ada data pengeluaran gaji.
              </div>
            )}
          </div>
        </div>

        {/* Audit Log / Activity List Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Aktivitas Terbaru
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Catatan log aktivitas audit sistem</p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-[260px] pr-1">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs items-start">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 shrink-0 mt-0.5">
                    <Clock size={13} />
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="font-semibold text-slate-700 leading-snug break-words">
                      {log.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      <span className="text-slate-500">
                        {log.userName}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(log.createdAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 py-10">
                Belum ada aktivitas.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
