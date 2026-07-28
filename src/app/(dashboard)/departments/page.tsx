"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Search,
  LayoutGrid,
  Table,
  Loader2,
  TrendingUp,
  Laptop,
  Briefcase,
  Wallet,
  Package,
  ChevronRight,
  UserCheck,
  Award,
  X,
  PieChart,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  photo?: string | null;
  status: string;
  department?: string | null;
  position?: Position;
  joinedDate?: string;
}

interface DepartmentGroup {
  name: string;
  count: number;
  percentage: number;
  employees: Employee[];
}

function normalizeDepartmentName(dept?: string | null): string {
  if (!dept || !dept.trim()) return "Belum Ditetapkan";
  const clean = dept.trim();
  const lower = clean.toLowerCase();

  if (lower === "it" || lower.includes("information tech") || lower.includes("teknologi")) {
    return "IT";
  }
  if (lower === "hr" || lower === "human resource" || lower.includes("human resources") || lower.includes("sdm")) {
    return "HR";
  }
  if (lower === "finance" || lower.includes("keuangan")) {
    return "Finance";
  }
  if (lower.includes("marketing") || lower.includes("pemasaran")) {
    return "Marketing";
  }
  if (lower.includes("operasional") || lower.includes("operation")) {
    return "Operasional";
  }
  if (lower.includes("warehouse") || lower.includes("logistik") || lower.includes("gudang")) {
    return "Warehouse";
  }

  // Capitalize title
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function getDepartmentMeta(name: string) {
  switch (name) {
    case "IT":
      return {
        icon: Laptop,
        gradient: "from-blue-600 to-indigo-600",
        lightBg: "bg-blue-50 text-blue-700 border-blue-200",
        badgeBg: "bg-blue-600 text-white",
        barColor: "bg-blue-600",
        accentText: "text-blue-600",
        ringColor: "ring-blue-500/20",
      };
    case "Marketing":
      return {
        icon: TrendingUp,
        gradient: "from-amber-500 to-orange-600",
        lightBg: "bg-amber-50 text-amber-700 border-amber-200",
        badgeBg: "bg-amber-600 text-white",
        barColor: "bg-amber-500",
        accentText: "text-amber-600",
        ringColor: "ring-amber-500/20",
      };
    case "HR":
      return {
        icon: Users,
        gradient: "from-rose-500 to-pink-600",
        lightBg: "bg-rose-50 text-rose-700 border-rose-200",
        badgeBg: "bg-rose-600 text-white",
        barColor: "bg-rose-500",
        accentText: "text-rose-600",
        ringColor: "ring-rose-500/20",
      };
    case "Finance":
      return {
        icon: Wallet,
        gradient: "from-emerald-500 to-teal-600",
        lightBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        badgeBg: "bg-emerald-600 text-white",
        barColor: "bg-emerald-500",
        accentText: "text-emerald-600",
        ringColor: "ring-emerald-500/20",
      };
    case "Operasional":
      return {
        icon: Briefcase,
        gradient: "from-slate-700 to-slate-900",
        lightBg: "bg-slate-100 text-slate-700 border-slate-300",
        badgeBg: "bg-slate-800 text-white",
        barColor: "bg-slate-700",
        accentText: "text-slate-800",
        ringColor: "ring-slate-500/20",
      };
    case "Warehouse":
      return {
        icon: Package,
        gradient: "from-cyan-600 to-blue-700",
        lightBg: "bg-cyan-50 text-cyan-700 border-cyan-200",
        badgeBg: "bg-cyan-600 text-white",
        barColor: "bg-cyan-500",
        accentText: "text-cyan-600",
        ringColor: "ring-cyan-500/20",
      };
    default:
      return {
        icon: Building2,
        gradient: "from-violet-600 to-purple-700",
        lightBg: "bg-purple-50 text-purple-700 border-purple-200",
        badgeBg: "bg-purple-600 text-white",
        barColor: "bg-purple-600",
        accentText: "text-purple-600",
        ringColor: "ring-purple-500/20",
      };
  }
}

export default function DepartmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedDept, setSelectedDept] = useState<DepartmentGroup | null>(null);

  const {
    data: employees = [],
    isLoading,
    isError,
  } = useQuery<Employee[]>({
    queryKey: ["departments-data"],
    queryFn: async () => {
      const res = await fetch("/api/employees?limit=0");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  // Group & Normalize Departments
  const departments = useMemo<DepartmentGroup[]>(() => {
    const map = new Map<string, Employee[]>();

    employees.forEach((emp) => {
      const normalizedName = normalizeDepartmentName(emp.department);
      if (!map.has(normalizedName)) {
        map.set(normalizedName, []);
      }
      map.get(normalizedName)!.push(emp);
    });

    const totalCount = employees.length || 1;

    return Array.from(map.entries())
      .map(([name, emps]) => ({
        name,
        count: emps.length,
        percentage: Math.round((emps.length / totalCount) * 100),
        employees: emps,
      }))
      .sort((a, b) => b.count - a.count);
  }, [employees]);

  // Filtered by Search
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [departments, searchTerm]);

  // Executive KPI Stats
  const stats = useMemo(() => {
    const totalDept = departments.length;
    const totalEmp = employees.length;
    const largestDept = departments[0]
      ? `${departments[0].name} (${departments[0].count})`
      : "-";
    const avgEmp = totalDept > 0 ? (totalEmp / totalDept).toFixed(1) : "0";

    return { totalDept, totalEmp, largestDept, avgEmp };
  }, [departments, employees]);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Struktur Departemen & Divisi
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ringkasan alokasi divisi, distribusi karyawan, dan struktur organisasi perusahaan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm">
            <Building2 size={16} className="text-blue-600" />
            <span>Total Divisi: {stats.totalDept}</span>
          </div>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Departemen */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-1.5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Departemen</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalDept}</p>
          <p className="text-[11px] text-slate-500 font-medium">Divisi aktif terdaftar</p>
        </div>

        {/* Card 2: Total Karyawan Terdistribusi */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-1.5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Karyawan Terdistribusi</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalEmp}</p>
          <p className="text-[11px] text-emerald-600 font-bold">100% Anggota tim</p>
        </div>

        {/* Card 3: Divisi Terbesar */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-1.5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Divisi Terbesar</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award size={16} />
            </div>
          </div>
          <p className="text-lg font-extrabold text-slate-900 truncate">{stats.largestDept}</p>
          <p className="text-[11px] text-slate-500 font-medium">Anggota terbanyak</p>
        </div>

        {/* Card 4: Rata-Rata Anggota */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-1.5 hover:shadow-md transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Rata-Rata / Divisi</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <PieChart size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{stats.avgEmp} <span className="text-xs font-bold text-slate-400">orang</span></p>
          <p className="text-[11px] text-slate-500 font-medium">Kapasitas tim rata-rata</p>
        </div>
      </div>

      {/* Filter and View Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-3.5 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute inset-y-0 left-3.5 my-auto text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama departemen / divisi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Grid vs Table View Switcher */}
        <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 bg-slate-50 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("grid")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "grid"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutGrid size={14} />
            <span>Kartu Grid</span>
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === "table"
                ? "bg-white text-blue-600 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Table size={14} />
            <span>Tabel Klasik</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl">
          <Loader2 size={32} className="animate-spin text-blue-600 mx-auto" />
          <p className="text-xs text-slate-500 mt-2 font-medium">Memuat data departemen...</p>
        </div>
      ) : isError ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl text-rose-500 font-medium text-xs">
          Gagal mengambil data departemen perusahaan.
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 font-medium text-xs">
          Tidak ada departemen yang sesuai dengan pencarian &quot;{searchTerm}&quot;.
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDepartments.map((dept) => {
            const meta = getDepartmentMeta(dept.name);
            const Icon = meta.icon;

            return (
              <motion.div
                key={dept.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group cursor-pointer"
                onClick={() => setSelectedDept(dept)}
              >
                <div className="space-y-3.5">
                  {/* Card Top: Icon & Count Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shadow-md shadow-slate-900/10 group-hover:scale-105 transition-transform`}>
                      <Icon size={22} />
                    </div>
                    <span className={`text-xs font-black px-3 py-1.5 rounded-full border ${meta.lightBg}`}>
                      {dept.count} Karyawan
                    </span>
                  </div>

                  {/* Department Title */}
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {dept.percentage}% dari total kekuatan kerja
                    </p>
                  </div>

                  {/* Percentage Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${meta.barColor} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(dept.percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Bottom: Employee Avatars preview & CTA */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center -space-x-2 overflow-hidden">
                    {dept.employees.slice(0, 4).map((emp, idx) => (
                      <div
                        key={emp.id || idx}
                        className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white text-slate-700 font-extrabold text-[10px] flex items-center justify-center shadow-sm"
                        title={emp.name}
                      >
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {dept.count > 4 && (
                      <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white text-slate-500 font-bold text-[9px] flex items-center justify-center">
                        +{dept.count - 4}
                      </div>
                    )}
                  </div>

                  <button className="flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:text-blue-700 transition-colors">
                    <span>Detail Tim</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold h-11 bg-slate-50/60">
                  <th className="py-3 px-5">Departemen / Divisi</th>
                  <th className="py-3 px-5">Jumlah Karyawan</th>
                  <th className="py-3 px-5">Distribusi (%)</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepartments.map((dept) => {
                  const meta = getDepartmentMeta(dept.name);
                  const Icon = meta.icon;

                  return (
                    <tr
                      key={dept.name}
                      className="hover:bg-slate-50/60 transition-colors h-14"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shadow-sm`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-xs">{dept.name}</p>
                            <p className="text-[10px] text-slate-400">Divisi Perusahaan</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${meta.lightBg}`}>
                          <UserCheck size={12} />
                          {dept.count} Karyawan
                        </span>
                      </td>
                      <td className="py-3 px-5 w-48">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-600">{dept.percentage}%</span>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${meta.barColor} rounded-full`}
                              style={{ width: `${Math.max(dept.percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => setSelectedDept(dept)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Lihat Karyawan</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Karyawan Per Departemen */}
      <AnimatePresence>
        {selectedDept && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 z-10 space-y-4 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  {(() => {
                    const meta = getDepartmentMeta(selectedDept.name);
                    const Icon = meta.icon;
                    return (
                      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${meta.gradient} text-white flex items-center justify-center shadow-md`}>
                        <Icon size={20} />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Anggota Departemen {selectedDept.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Total {selectedDept.count} karyawan aktif di divisi ini.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDept(null)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Employee List Scrollable Container */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
                {selectedDept.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="pt-2 pb-1 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center uppercase shrink-0 border border-blue-200">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 dark:text-white">{emp.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">{emp.position?.name || "Karyawan"} • {emp.email}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded-full border ${
                        emp.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {emp.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </span>
                      {emp.joinedDate && (
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">
                          Masuk: {new Date(emp.joinedDate).toLocaleDateString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedDept(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
