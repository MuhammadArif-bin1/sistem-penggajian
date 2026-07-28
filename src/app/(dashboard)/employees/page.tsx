"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, EmployeeInput } from "@/schemas/employee.schema";
import { useToast } from "@/components/Providers";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  Calendar,
  Briefcase,
  UserCheck,
  ArrowUpDown,
  RefreshCw,
  Upload,
  Camera,
  ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { BANK_OPTIONS, formatBankLabel, BankName } from "@/lib/bank";

interface Position {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinedDate: string;
  gender: "MALE" | "FEMALE";
  birthDate: string;
  status: "ACTIVE" | "INACTIVE";
  photo: string | null;
  positionId: string;
  position: Position;
  userId: string | null;
  npwp?: string;
  bankName?: BankName;
  bankAccount?: string;
  accountHolder?: string;
  department?: string;
  employmentType?: "FULL_TIME" | "CONTRACT" | "FREELANCE";
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [exportEmployees, setExportEmployees] = useState<Employee[]>([]);
  const [isExportLoading, setIsExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // File Upload State
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);

      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast(resData.message || "Import dataset berhasil", "success");
    } catch (err: any) {
      showToast(err.message || "Gagal mengimpor dataset", "error");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Sorting state
  const [sortField, setSortField] = useState<keyof Employee>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch Positions for dropdown
  const { data: positions = [] } = useQuery<Position[]>({
    queryKey: ["dropdown-positions"],
    queryFn: async () => {
      const res = await fetch("/api/positions");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  const fetchExportData = async () => {
    setExportError(null);
    setIsExportLoading(true);
    try {
      const q = new URLSearchParams();
      if (searchTerm) q.append("search", searchTerm);
      if (statusFilter) q.append("status", statusFilter);
      if (positionFilter) q.append("positionId", positionFilter);
      if (bankFilter) q.append("bankName", bankFilter);
      q.append("limit", "0");

      const res = await fetch(`/api/employees?${q.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const normalized = data.data as Employee[];
      setExportEmployees(normalized);
      return normalized;
    } catch (err: any) {
      setExportError(err.message || "Gagal mengambil data untuk ekspor");
      throw err;
    } finally {
      setIsExportLoading(false);
    }
  };

  // Fetch Employees
  const { data, isLoading } = useQuery<{ data: Employee[]; meta: Meta }>({
    queryKey: [
      "employees",
      searchTerm,
      statusFilter,
      positionFilter,
      bankFilter,
      currentPage,
    ],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (searchTerm) q.append("search", searchTerm);
      if (statusFilter) q.append("status", statusFilter);
      if (positionFilter) q.append("positionId", positionFilter);
      if (bankFilter) q.append("bankName", bankFilter);
      q.append("page", currentPage.toString());
      q.append("limit", "8");
      const res = await fetch(`/api/employees?${q.toString()}`);
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return { data: resData.data, meta: resData.meta };
    },
  });

  const employees = data?.data || [];
  const meta = data?.meta;

  useEffect(() => {
    setExportEmployees([]);
    setExportError(null);
  }, [searchTerm, statusFilter, positionFilter, bankFilter]);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setPositionFilter("");
    setBankFilter("");
    setCurrentPage(1);
  };

  // Handle Quick Action Query Param from Dashboard
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setIsModalOpen(true);
      setEditingEmployee(null);
      router.replace("/employees");
    }
  }, [searchParams, router]);

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema) as any,
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      joinedDate: new Date(),
      gender: "MALE",
      birthDate: new Date(),
      status: "ACTIVE",
      positionId: "",
      photo: "",
      createAccount: false,
      roleAccount: "EMPLOYEE",
      password: "",
      npwp: "",
      bankName: "BANK_BCA",
      bankAccount: "",
      accountHolder: "",
      department: "",
      employmentType: "FULL_TIME",
    },
  });

  const createAccountChecked = watch("createAccount");

  // Photo upload states
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Format file harus JPG, PNG, atau WebP", "error");
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Ukuran file maksimal 2MB", "error");
      return;
    }

    setPhotoFile(file);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", photoFile);
      const res = await fetch("/api/employees/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data.url;
    } catch (err: any) {
      showToast(err.message || "Gagal upload foto", "error");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };
  const openAddModal = () => {
    setEditingEmployee(null);
    clearPhoto();
    reset({
      name: "",
      email: "",
      phone: "",
      address: "",
      joinedDate: new Date(),
      gender: "MALE",
      birthDate: new Date(),
      status: "ACTIVE",
      positionId: positions[0]?.id || "",
      photo: "",
      createAccount: false,
      roleAccount: "EMPLOYEE",
      password: "",
      npwp: "",
      bankName: "BANK_BCA",
      bankAccount: "",
      accountHolder: "",
      department: "",
      employmentType: "FULL_TIME",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    clearPhoto();
    if (employee.photo) {
      setPhotoPreview(employee.photo);
    }
    reset({
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      address: employee.address,
      joinedDate: new Date(employee.joinedDate),
      gender: employee.gender,
      birthDate: new Date(employee.birthDate),
      status: employee.status,
      positionId: employee.positionId,
      photo: employee.photo || "",
      createAccount: !!employee.userId,
      roleAccount: (employee as any).user?.role || "EMPLOYEE",
      password: "",
      npwp: employee.npwp || "",
      bankName: (employee.bankName as any) || "BANK_BCA",
      bankAccount: employee.bankAccount || "",
      accountHolder: employee.accountHolder || employee.name,
      department: employee.department || "",
      employmentType: employee.employmentType || "FULL_TIME",
    });
    setIsModalOpen(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeInput) => {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Karyawan berhasil ditambahkan", "success");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menambahkan karyawan", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EmployeeInput }) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Karyawan berhasil diperbarui", "success");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal memperbarui data karyawan", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Karyawan berhasil dihapus", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menghapus karyawan", "error");
    },
  });

  const onSubmit = async (data: EmployeeInput) => {
    // Upload photo file first if selected
    if (photoFile) {
      const uploadedUrl = await uploadPhoto();
      if (uploadedUrl) {
        data.photo = uploadedUrl;
      }
    }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data karyawan ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Sorting function
  const handleSort = (field: keyof Employee) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "position") {
      aValue = a.position?.name || "";
      bValue = b.position?.name || "";
    }

    if (typeof aValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    }
    return 0;
  });

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const exportData = await fetchExportData();
      if (exportData.length === 0) {
        showToast("Tidak ada data karyawan untuk diekspor", "warning");
        return;
      }

      const headers = [
        "Nama",
        "Email",
        "Nomor HP",
        "Alamat",
        "Jabatan",
        "Nama Bank",
        "Nomor Rekening",
        "Atas Nama Rekening",
        "Jenis Kelamin",
        "Tanggal Masuk",
        "Status",
      ];

      const csvRows = [headers.join(",")];
      for (const emp of exportData) {
        const values = [
          `"${emp.name.replace(/"/g, '""')}"`,
          `"${emp.email}"`,
          `"${emp.phone}"`,
          `"${emp.address.replace(/"/g, '""')}"`,
          `"${emp.position.name}"`,
          `"${formatBankLabel(emp.bankName)}"`,
          `"${emp.bankAccount || "-"}"`,
          `"${(emp.accountHolder || emp.name).replace(/"/g, '""')}"`,
          `"${emp.gender === "MALE" ? "Laki-laki" : "Perempuan"}"`,
          `"${new Date(emp.joinedDate).toLocaleDateString("id-ID")}"`,
          `"${emp.status === "ACTIVE" ? "Aktif" : "Nonaktif"}"`,
        ];
        csvRows.push(values.join(","));
      }

      const csvString = "\uFEFF" + csvRows.join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "data_karyawan.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      showToast(error.message || "Gagal mengekspor CSV", "error");
    }
  };

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrintPDF = async () => {
    try {
      const fullExportData = await fetchExportData();
      if (fullExportData.length === 0) {
        showToast("Tidak ada data karyawan untuk dicetak", "warning");
        return;
      }
      setIsPrinting(true);
    } catch (error: any) {
      showToast(error.message || "Gagal mempersiapkan cetak", "error");
    }
  };

  useEffect(() => {
    if (isPrinting && exportEmployees.length > 0) {
      const onAfterPrint = () => setIsPrinting(false);
      window.addEventListener("afterprint", onAfterPrint, { once: true });
      window.print();
    }
  }, [isPrinting, exportEmployees]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Karyawan
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar karyawan aktif, divisi jabatan, dan pembuatan akses portal
            payroll.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {isImporting ? (
              <Loader2 size={16} className="animate-spin text-blue-600" />
            ) : (
              <Upload size={16} />
            )}
            <span>Import Dataset</span>
          </button>

          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </div>

      {/* Printable Title Block */}
      <div className="hidden print-only text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase">
          Data Karyawan Perusahaan
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Laporan Resmi Manajemen Karyawan
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm no-print">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute inset-y-0 left-3.5 my-auto text-slate-400"
          />
          <input
            type="text"
            placeholder="Cari nama, email, nomor HP..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
          />
        </div>

        <div className="flex flex-wrap gap-2.5">
          <select
            value={positionFilter}
            onChange={(e) => {
              setPositionFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          >
            <option value="">Semua Jabatan</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Tidak Aktif</option>
          </select>

          <select
            value={bankFilter}
            onChange={(e) => {
              setBankFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          >
            <option value="">Semua Bank</option>
            {BANK_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>

          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold shadow-sm cursor-pointer hover:bg-slate-200"
          >
            <RefreshCw size={14} />
            <span>Reset</span>
          </button>

          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm cursor-pointer bg-white"
          >
            <Download size={14} />
            <span>CSV</span>
          </button>

          <button
            onClick={() => handlePrintPDF()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm cursor-pointer bg-white"
          >
            <Printer size={14} />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Printable full export table */}
      <div className={`print-only ${isPrinting ? "" : "hidden"}`}>
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-slate-900">
            Data Karyawan Perusahaan
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Laporan lengkap karyawan berdasarkan filter saat ini.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="border-b border-slate-300 text-slate-600 font-semibold">
                <th className="py-3 px-3">Nama</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Telepon</th>
                <th className="py-3 px-3">Jabatan</th>
                <th className="py-3 px-3">Nama Bank</th>
                <th className="py-3 px-3">Nomor Rekening</th>
                <th className="py-3 px-3">Atas Nama Rekening</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {exportEmployees.map((emp) => (
                <tr key={emp.id} className="border-b border-slate-200">
                  <td className="py-2 px-3 font-medium text-slate-900">
                    {emp.name}
                  </td>
                  <td className="py-2 px-3 text-slate-700">{emp.email}</td>
                  <td className="py-2 px-3 text-slate-700">{emp.phone}</td>
                  <td className="py-2 px-3 text-slate-700">
                    {emp.position.name}
                  </td>
                  <td className="py-2 px-3 text-slate-700 font-semibold">
                    {formatBankLabel(emp.bankName)}
                  </td>
                  <td className="py-2 px-3 text-slate-700 font-mono">
                    {emp.bankAccount || "-"}
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {emp.accountHolder || emp.name}
                  </td>
                  <td className="py-2 px-3 text-slate-700">
                    {emp.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold h-11 bg-slate-50/50 sticky top-0 z-10">
                <th
                  onClick={() => handleSort("name")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Karyawan</span>
                    <ArrowUpDown size={12} className="text-slate-300" />
                  </div>
                </th>
                <th className="py-2.5 px-4">Kontak</th>
                <th
                  onClick={() => handleSort("position")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Jabatan</span>
                    <ArrowUpDown size={12} className="text-slate-300" />
                  </div>
                </th>
                <th className="py-2.5 px-4">Rekening Bank</th>
                <th className="py-2.5 px-4">Tanggal Masuk</th>
                <th className="py-2.5 px-4">Portal Akun</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <Loader2
                      size={24}
                      className="animate-spin text-blue-600 mx-auto"
                    />
                  </td>
                </tr>
              ) : sortedEmployees.length > 0 ? (
                sortedEmployees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-slate-50/40 transition-colors h-14"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-xs">
                            {emp.name}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {emp.gender === "MALE" ? "Laki-laki" : "Perempuan"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <p>{emp.email}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {emp.phone}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {emp.position.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <p className="font-bold text-slate-800">
                        {formatBankLabel(emp.bankName)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {emp.bankAccount || "-"}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        a.n. {emp.accountHolder || emp.name}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {new Date(emp.joinedDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-3 px-4">
                      {emp.userId ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-lg">
                          <UserCheck size={10} />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-lg">
                          Tanpa Akun
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${
                          emp.status === "ACTIVE"
                            ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        }`}
                      >
                        {emp.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right no-print">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(emp.id, emp.name)}
                          className="p-2 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-100 text-rose-600 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    Tidak ada data karyawan ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {meta && meta.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between no-print">
            <span className="text-[10px] text-slate-500 font-medium">
              Menampilkan {employees.length} dari {meta.total} karyawan
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={currentPage === meta.totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(p + 1, meta.totalPages))
                }
                className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-xl border border-slate-100 p-6 z-10 space-y-4 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {editingEmployee
                      ? "Edit Data Karyawan"
                      : "Tambah Karyawan Baru"}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Silakan isi form di bawah untuk mendaftarkan karyawan.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-55 text-slate-500 rounded-xl cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
              >
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name Input with Floating Label */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("name")}
                        type="text"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-650 pointer-events-none">
                        Nama Lengkap
                      </label>
                    </div>
                    {errors.name && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.name.message}
                      </span>
                    )}
                  </div>

                  {/* Email Input with Floating Label */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("email")}
                        type="email"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Email Karyawan
                      </label>
                    </div>
                    {errors.email && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.email.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Input with Floating Label */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("phone")}
                        type="text"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Nomor HP
                      </label>
                    </div>
                    {errors.phone && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.phone.message}
                      </span>
                    )}
                  </div>

                  {/* Gender Selector with Floating Label look */}
                  <div className="relative">
                    <select
                      {...register("gender")}
                      className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                    >
                      <option value="MALE">Laki-laki</option>
                      <option value="FEMALE">Perempuan</option>
                    </select>
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                      Jenis Kelamin
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Birth Date */}
                  <div className="relative">
                    <input
                      {...register("birthDate")}
                      type="date"
                      className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                    />
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                      Tanggal Lahir
                    </label>
                  </div>

                  {/* Joined Date */}
                  <div className="relative">
                    <input
                      {...register("joinedDate")}
                      type="date"
                      className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                    />
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                      Tanggal Masuk Kerja
                    </label>
                  </div>
                </div>

                {/* Address Input with Floating Label */}
                <div className="space-y-1">
                  <div className="relative">
                    <textarea
                      {...register("address")}
                      rows={2}
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all resize-none"
                    />
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                      Alamat Lengkap
                    </label>
                  </div>
                  {errors.address && (
                    <span className="text-[10px] text-rose-500 font-medium block">
                      {errors.address.message}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Position selector */}
                  <div className="relative">
                    <select
                      {...register("positionId")}
                      className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                    >
                      <option value="">Pilih Jabatan</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                      Jabatan
                    </label>
                  </div>

                  {/* Status selector */}
                  <div className="relative">
                    <select
                      {...register("status")}
                      className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                    >
                      <option value="ACTIVE">Aktif</option>
                      <option value="INACTIVE">Tidak Aktif</option>
                    </select>
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                      Status Keanggotaan
                    </label>
                  </div>
                </div>

                {/* HRIS Additional Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4 mt-2">
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("npwp")}
                        type="text"
                        maxLength={16}
                        onInput={(e) => {
                          e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 16);
                        }}
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all font-mono"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Nomor NPWP (Maks 16 Digit)
                      </label>
                    </div>
                    {errors.npwp && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.npwp.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("department")}
                        type="text"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Departemen / Divisi
                      </label>
                    </div>
                  </div>
                </div>

                {/* Informasi Rekening Bank */}
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Informasi Rekening Bank
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. Nama Bank (Dropdown) */}
                    <div className="space-y-1">
                      <div className="relative">
                        <select
                          {...register("bankName")}
                          className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium transition-all"
                        >
                          {BANK_OPTIONS.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                        <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                          Nama Bank
                        </label>
                      </div>
                      {errors.bankName && (
                        <span className="text-[10px] text-rose-500 font-medium block">
                          {errors.bankName.message}
                        </span>
                      )}
                    </div>

                    {/* 2. Nomor Rekening */}
                    <div className="space-y-1">
                      <div className="relative">
                        <input
                          {...register("bankAccount")}
                          type="text"
                          placeholder=" "
                          className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                        />
                        <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                          Nomor Rekening
                        </label>
                      </div>
                      {errors.bankAccount && (
                        <span className="text-[10px] text-rose-500 font-medium block">
                          {errors.bankAccount.message}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Atas Nama Rekening */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("accountHolder")}
                        type="text"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Atas Nama Rekening
                      </label>
                    </div>
                    {errors.accountHolder && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.accountHolder.message}
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <select
                    {...register("employmentType")}
                    className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                  >
                    <option value="FULL_TIME">
                      Karyawan Tetap (Full Time)
                    </option>
                    <option value="CONTRACT">Kontrak</option>
                    <option value="FREELANCE">Freelance</option>
                  </select>
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                    Tipe Kepegawaian
                  </label>
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">
                    Foto Profil Karyawan (JPG / PNG)
                  </label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {photoPreview ? (
                        <>
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-2xl"
                          />
                          <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer hover:bg-rose-600 shadow-sm"
                          >
                            <X size={10} />
                          </button>
                        </>
                      ) : (
                        <Camera size={24} className="text-slate-300" />
                      )}
                    </div>

                    {/* Upload Button */}
                    <div className="flex-1 space-y-1.5">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                      >
                        <ImageIcon size={14} />
                        <span>{photoPreview ? "Ganti Foto" : "Pilih Foto"}</span>
                      </button>
                      <p className="text-[10px] text-slate-400">
                        Format: JPG, PNG, WebP. Maks 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Account Creation Section */}
                <div className="border-t border-slate-100 pt-4 mt-2 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <input
                      {...register("createAccount")}
                      type="checkbox"
                      id="createAccount"
                      disabled={!!editingEmployee?.userId}
                      className="rounded border-slate-350 focus:ring-blue-500 h-4.5 w-4.5 text-blue-600 transition-colors"
                    />
                    <label
                      htmlFor="createAccount"
                      className="text-xs font-bold text-slate-750 cursor-pointer"
                    >
                      Aktifkan Akses Portal Akun (Gunakan Email untuk Login)
                    </label>
                  </div>

                  {(createAccountChecked || !!editingEmployee?.userId) && (
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          {...register("password")}
                          type="password"
                          placeholder=" "
                          className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                        />
                        <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                          {editingEmployee?.userId
                            ? "Password Baru Portal (Biarkan kosong jika tidak diubah)"
                            : "Password Portal Karyawan"}
                        </label>
                      </div>

                      <div className="relative">
                        <select
                          {...register("roleAccount")}
                          className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                        >
                          <option value="EMPLOYEE">Karyawan (Standard)</option>
                          <option value="HR">HR / Personalia</option>
                          <option value="ADMIN">Administrator</option>
                        </select>
                        <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                          Hak Akses Portal (Role)
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal actions */}
                <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-605 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Karyawan</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
