"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Download,
  Printer,
  Trash2,
  Loader2,
  Calendar,
  DollarSign,
  UserCheck,
  Building,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
import { useToast } from "@/components/Providers";
import * as XLSX from "xlsx";

interface EmployeeRef {
  id: string;
  name: string;
  email: string;
  department: string | null;
  position?: {
    name: string;
  };
}

interface Overtime {
  id: string;
  employeeId: string;
  tanggal: string;
  jamMulai: string;
  jamSelesai: string;
  totalJam: number;
  tarifPerJam: number;
  nominalLembur: number;
  alasan: string;
  catatan: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  approvedBy: string | null;
  approvedAt: string | null;
  payrollId: string | null;
  createdAt: string;
  updatedAt: string;
  employee: EmployeeRef;
}

interface UserAuth {
  userId: string;
  email: string;
  name: string;
  role: "ADMIN" | "HR" | "EMPLOYEE";
  employeeId?: string;
}

export default function OvertimePage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Current Auth User
  const [actor, setActor] = useState<UserAuth | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if ((data.authenticated || data.success) && data.user) {
          setActor(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const isManagerOrAdmin = !actor || actor.role === "ADMIN" || actor.role === "HR";
  const isAdminUser = !actor || actor.role === "ADMIN";

  // Fetch active employees for Admin/HR selection dropdown
  const { data: employeesList = [] } = useQuery<EmployeeRef[]>({
    queryKey: ["active-employees-list"],
    queryFn: async () => {
      const res = await fetch("/api/employees?limit=100");
      const json = await res.json();
      return json.data || [];
    },
    enabled: actor?.role === "ADMIN" || actor?.role === "HR",
  });

  // Filter & Search state
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState<string>("");
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedOvertimeId, setSelectedOvertimeId] = useState<string | null>(null);
  const [rejectCatatan, setRejectCatatan] = useState("");

  // Form State
  const todayStr = new Date().toISOString().substring(0, 10);
  const [formData, setFormData] = useState({
    employeeId: "",
    tanggal: todayStr,
    jamMulai: "18:00",
    jamSelesai: "21:00",
    alasan: "",
    catatan: "",
  });

  const [calcHours, setCalcHours] = useState<number>(3);
  const [calcNominal, setCalcNominal] = useState<number>(105000);
  const [timeError, setTimeError] = useState<string | null>(null);

  // Auto calculate total jam
  useEffect(() => {
    if (!formData.jamMulai || !formData.jamSelesai) {
      setCalcHours(0);
      setCalcNominal(0);
      setTimeError(null);
      return;
    }

    const [startH, startM] = formData.jamMulai.split(":").map(Number);
    const [endH, endM] = formData.jamSelesai.split(":").map(Number);

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (endMin <= startMin) {
      setTimeError("Jam selesai harus lebih besar dari jam mulai.");
      setCalcHours(0);
      setCalcNominal(0);
      return;
    }

    const diffHours = Math.round(((endMin - startMin) / 60) * 10) / 10;

    if (diffHours < 1.0) {
      setTimeError("Minimal durasi lembur adalah 1 jam.");
    } else if (diffHours > 6.0) {
      setTimeError("Maksimal durasi lembur adalah 6 jam.");
    } else {
      setTimeError(null);
    }

    setCalcHours(diffHours);
    setCalcNominal(diffHours * 35000);
  }, [formData.jamMulai, formData.jamSelesai]);

  // Query Fetch Overtimes
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["overtimes", month, year, statusFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (month) params.append("month", month);
      if (year) params.append("year", year);
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (search) params.append("search", search);

      const res = await fetch(`/api/overtime?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
  });

  const overtimes: Overtime[] = data?.data || [];
  const stats = data?.stats || {
    totalRequests: 0,
    pendingCount: 0,
    approvedCount: 0,
    totalHoursMonth: 0,
    totalNominalMonth: 0,
  };

  // Pagination logic
  const totalPages = Math.ceil(overtimes.length / itemsPerPage) || 1;
  const paginatedOvertimes = overtimes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await fetch("/api/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
    onSuccess: (res) => {
      showToast(res.message || "Pengajuan lembur berhasil dikirim.", "success");
      setIsModalOpen(false);
      setFormData({
        employeeId: "",
        tanggal: todayStr,
        jamMulai: "18:00",
        jamSelesai: "21:00",
        alasan: "",
        catatan: "",
      });
      queryClient.invalidateQueries({ queryKey: ["overtimes"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal mengajukan lembur", "error");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/overtime/${id}/approve`, {
        method: "PATCH",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
    onSuccess: (res) => {
      showToast(res.message || "Lembur telah disetujui.", "success");
      queryClient.invalidateQueries({ queryKey: ["overtimes"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menyetujui lembur", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, catatan }: { id: string; catatan: string }) => {
      const res = await fetch(`/api/overtime/${id}/reject`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatan }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
    onSuccess: (res) => {
      showToast(res.message || "Pengajuan lembur ditolak.", "error");
      setIsRejectModalOpen(false);
      setSelectedOvertimeId(null);
      setRejectCatatan("");
      queryClient.invalidateQueries({ queryKey: ["overtimes"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menolak lembur", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/overtime/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      return json;
    },
    onSuccess: (res) => {
      showToast(res.message || "Data lembur berhasil dihapus", "success");
      queryClient.invalidateQueries({ queryKey: ["overtimes"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menghapus lembur", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeError) {
      showToast(timeError, "error");
      return;
    }
    if (!formData.alasan || formData.alasan.trim().length < 3) {
      showToast("Alasan lembur minimal 3 karakter", "error");
      return;
    }
    createMutation.mutate(formData);
  };

  // Export functions
  const handleExportCSV = () => {
    if (overtimes.length === 0) {
      showToast("Tidak ada data lembur untuk diekspor", "error");
      return;
    }

    const headers = [
      "Nama Karyawan",
      "Departemen",
      "Tanggal",
      "Jam Mulai",
      "Jam Selesai",
      "Total Jam",
      "Tarif per Jam",
      "Nominal Lembur",
      "Status",
      "Alasan",
    ];

    const rows = overtimes.map((o) => [
      o.employee.name,
      o.employee.department || "-",
      new Date(o.tanggal).toLocaleDateString("id-ID"),
      o.jamMulai,
      o.jamSelesai,
      `${o.totalJam} Jam`,
      `Rp ${o.tarifPerJam.toLocaleString("id-ID")}`,
      `Rp ${o.nominalLembur.toLocaleString("id-ID")}`,
      o.status === "PENDING"
        ? "Menunggu"
        : o.status === "APPROVED"
        ? "Disetujui"
        : o.status === "COMPLETED"
        ? "Selesai"
        : "Ditolak",
      o.alasan,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_lembur_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (overtimes.length === 0) {
      showToast("Tidak ada data lembur untuk diekspor", "error");
      return;
    }

    const exportData = overtimes.map((o, idx) => ({
      No: idx + 1,
      "Nama Karyawan": o.employee.name,
      Departemen: o.employee.department || "-",
      Tanggal: new Date(o.tanggal).toLocaleDateString("id-ID"),
      "Jam Mulai": o.jamMulai,
      "Jam Selesai": o.jamSelesai,
      "Total Jam": o.totalJam,
      "Tarif per Jam": o.tarifPerJam,
      "Nominal Lembur": o.nominalLembur,
      Status:
        o.status === "PENDING"
          ? "Menunggu"
          : o.status === "APPROVED"
          ? "Disetujui"
          : o.status === "COMPLETED"
          ? "Selesai"
          : "Ditolak",
      Alasan: o.alasan,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lembur");
    XLSX.writeFile(workbook, `laporan_lembur_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const resetFilters = () => {
    setSearch("");
    setMonth("");
    setYear(new Date().getFullYear().toString());
    setStatusFilter("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Lembur
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Kelola pengajuan lembur karyawan yang akan diproses ke payroll.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Ajukan Lembur</span>
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print-only text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">
          LAPORAN LEMBUR KARYAWAN
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          PT Teknologi & Digital Indonesia • Periode Cetak: {new Date().toLocaleDateString("id-ID")}
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Total Pengajuan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Pengajuan
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.totalRequests}
            </span>
            <span className="text-xs font-medium text-slate-400">Pengajuan</span>
          </div>
        </div>

        {/* Card 2: Menunggu Persetujuan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Menunggu Persetujuan
            </span>
            <div className="w-9 h-9 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.pendingCount}
            </span>
            <span className="text-xs font-medium text-slate-400">Menunggu</span>
          </div>
        </div>

        {/* Card 3: Disetujui */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
              Disetujui
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {stats.approvedCount}
            </span>
            <span className="text-xs font-medium text-slate-400">Disetujui</span>
          </div>
        </div>

        {/* Card 4: Total Jam Lembur Bulan Ini */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider">
              Jam Lembur Bulan Ini
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {stats.totalHoursMonth}
            </span>
            <span className="text-xs font-medium text-slate-400">
              Jam (Rp {stats.totalNominalMonth.toLocaleString("id-ID")})
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm no-print space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari berdasarkan tanggal, alasan, atau nama karyawan..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="COMPLETED">Selesai (Payroll)</option>
              <option value="REJECTED">Ditolak</option>
            </select>

            {/* Month Filter */}
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Bulan</option>
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>

            {/* Year Filter */}
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            {/* Reset */}
            <button
              onClick={resetFilters}
              title="Reset Filter"
              className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 transition-all"
            >
              <RefreshCw size={14} />
            </button>

            {/* Export Actions (Admin & HR) */}
            {(actor?.role === "ADMIN" || actor?.role === "HR") && (
              <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-2">
                <button
                  onClick={handleExportExcel}
                  title="Export Excel"
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Excel</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  title="Export CSV"
                  className="flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>CSV</span>
                </button>

                <button
                  onClick={handlePrintPDF}
                  title="Export PDF / Print"
                  className="flex items-center gap-1 px-3 py-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Printer size={14} />
                  <span>PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
            <p className="text-xs font-medium">Memuat data lembur...</p>
          </div>
        ) : overtimes.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-3xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Clock size={24} />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Belum Ada Pengajuan Lembur
            </p>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              Data lembur belum ditemukan untuk filter ini. Klik &quot;Ajukan Lembur&quot; untuk membuat pengajuan baru.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">No</th>
                  <th className="py-3.5 px-4">Karyawan</th>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Waktu Lembur</th>
                  <th className="py-3.5 px-4 text-center">Total Jam</th>
                  <th className="py-3.5 px-4">Alasan</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Nominal Lembur</th>
                  <th className="py-3.5 px-4 text-center no-print">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                {paginatedOvertimes.map((o, index) => {
                  const itemIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const isPending = o.status === "PENDING";
                  const isApproved = o.status === "APPROVED";
                  const isCompleted = o.status === "COMPLETED";
                  const isRejected = o.status === "REJECTED";

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {itemIndex}
                      </td>

                      {/* Karyawan */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {o.employee.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {o.employee.department || "General"} • {o.employee.position?.name || "Staff"}
                          </p>
                        </div>
                      </td>

                      {/* Tanggal */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            {new Date(o.tanggal).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Waktu */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-1">
                          <Clock size={13} className="text-slate-400" />
                          <span>
                            {o.jamMulai} - {o.jamSelesai}
                          </span>
                        </div>
                      </td>

                      {/* Total Jam */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                          {o.totalJam} Jam
                        </span>
                      </td>

                      {/* Alasan */}
                      <td className="py-3.5 px-4 max-w-xs truncate" title={o.alasan}>
                        <p className="truncate">{o.alasan}</p>
                        {o.catatan && (
                          <p className="text-[10px] text-red-500 italic mt-0.5 truncate">
                            Catatan: {o.catatan}
                          </p>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                            <AlertCircle size={12} />
                            <span>Menunggu</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>Disetujui</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                            <CheckCircle2 size={12} />
                            <span>Selesai (Payroll)</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                            <XCircle size={12} />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </td>

                      {/* Nominal */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        Rp {o.nominalLembur.toLocaleString("id-ID")}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Approve & Reject for Admin/HR if PENDING */}
                          {isPending && isManagerOrAdmin && (
                            <>
                              <button
                                onClick={() => approveMutation.mutate(o.id)}
                                disabled={approveMutation.isPending}
                                title="Setujui Lembur"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                              >
                                <Check size={13} />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedOvertimeId(o.id);
                                  setIsRejectModalOpen(true);
                                }}
                                title="Tolak Lembur"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
                              >
                                <X size={13} />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}

                          {/* Delete for Admin if not COMPLETED */}
                          {isAdminUser && !isCompleted && (
                            <button
                              onClick={() => {
                                if (confirm("Apakah Anda yakin ingin menghapus data lembur ini?")) {
                                  deleteMutation.mutate(o.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Hapus Data Lembur"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5 cursor-pointer"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {overtimes.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-slate-800 no-print">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Menampilkan <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
              <span className="font-bold text-slate-900 dark:text-white">
                {Math.min(currentPage * itemsPerPage, overtimes.length)}
              </span>{" "}
              dari <span className="font-bold text-slate-900 dark:text-white">{overtimes.length}</span> data
            </p>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Popup Pengajuan Lembur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-lg w-full space-y-5 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Form Pengajuan Lembur
                </h3>
                <p className="text-xs text-slate-400">
                  Lembur hanya dapat diajukan setelah melakukan absensi pulang.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Pilih Karyawan (Khusus Admin & HR) */}
              {(actor?.role === "ADMIN" || actor?.role === "HR") && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Pilih Karyawan
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Pilih Karyawan Dari Data Asli --</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.department || "General"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tanggal */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Tanggal Lembur
                </label>
                <input
                  type="date"
                  max={todayStr}
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-[10px] text-slate-400">
                  Tidak dapat memilih tanggal masa depan.
                </p>
              </div>

              {/* Jam Mulai & Jam Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Jam Mulai
                  </label>
                  <input
                    type="time"
                    value={formData.jamMulai}
                    onChange={(e) => setFormData({ ...formData, jamMulai: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">
                    Jam Selesai
                  </label>
                  <input
                    type="time"
                    value={formData.jamSelesai}
                    onChange={(e) => setFormData({ ...formData, jamSelesai: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Realtime calculated total jam & error alert */}
              {timeError ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} />
                  <span>{timeError}</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                      Total Jam (Otomatis)
                    </span>
                    <span className="text-lg font-black text-blue-900 dark:text-blue-200">
                      {calcHours} Jam
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                      Estimasi Nominal (Rp 35rb/jam)
                    </span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                      Rp {calcNominal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              )}

              {/* Alasan Lembur */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Alasan Lembur
                </label>
                <textarea
                  rows={3}
                  value={formData.alasan}
                  onChange={(e) => setFormData({ ...formData, alasan: e.target.value })}
                  placeholder="Jelaskan kebutuhan pekerjaan/proyek yang dikerjakan saat lembur..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* Catatan (Optional) */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.catatan}
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  placeholder="Nomor tiket / referensi tugas..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={createMutation.isPending || !!timeError}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  <span>Kirim Pengajuan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reject Catatan */}
      {isRejectModalOpen && selectedOvertimeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tolak Pengajuan Lembur
            </h3>
            <p className="text-xs text-slate-500">
              Berikan alasan penolakan untuk karyawan.
            </p>

            <textarea
              rows={3}
              value={rejectCatatan}
              onChange={(e) => setRejectCatatan(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedOvertimeId(null);
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    id: selectedOvertimeId,
                    catatan: rejectCatatan,
                  })
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {rejectMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <X size={16} />
                )}
                <span>Konfirmasi Tolak</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
