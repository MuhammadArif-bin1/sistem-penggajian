"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generatePayrollSchema, GeneratePayrollInput, updatePayrollSchema, UpdatePayrollInput } from "@/schemas/payroll.schema";
import { useToast } from "@/components/Providers";
import {
  Wallet,
  Calendar,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  name: string;
}

interface Employee {
  id: string;
  name: string;
  position: Position;
  status: string;
}

interface Payroll {
  id: string;
  employeeId: string;
  employee: {
    name: string;
    email: string;
    phone?: string;
    department?: string;
    bankName?: string;
    bankAccount?: string;
    accountHolder?: string;
    position: {
      name: string;
    };
  };
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
  status: "DRAFT" | "PAID";
  paidAt: string | null;
  salarySlips: Array<{ id: string }>;
}

export default function PayrollPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [periodFilter, setPeriodFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null);

  // State for Manual Pay Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingPayroll, setPayingPayroll] = useState<Payroll | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentBank, setPaymentBank] = useState("BANK_BCA");
  const [transferRef, setTransferRef] = useState("");
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().substring(0, 10));

  // State for Bulk Pay Modal & Selection
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<string[]>([]);
  const [isBulkPayModalOpen, setIsBulkPayModalOpen] = useState(false);
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState("BANK_TRANSFER");
  const [bulkPaidDate, setBulkPaidDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [bulkTransferRef, setBulkTransferRef] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sorting state
  const [sortField, setSortField] = useState<keyof Payroll>("employee");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Fetch all active employees for generate checklist
  const { data: activeEmployees = [] } = useQuery<Employee[]>({
    queryKey: ["active-employees"],
    queryFn: async () => {
      const res = await fetch("/api/employees?status=ACTIVE&limit=100");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
    enabled: isGenerateModalOpen,
  });

  // Fetch Payroll records
  const { data: payrolls = [], isLoading } = useQuery<Payroll[]>({
    queryKey: ["payrolls", periodFilter],
    queryFn: async () => {
      const res = await fetch(`/api/payroll?period=${periodFilter}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  // Handle Quick Action Query Param from Dashboard
  useEffect(() => {
    if (searchParams.get("action") === "generate") {
      setIsGenerateModalOpen(true);
      router.replace("/penggajian");
    }
  }, [searchParams, router]);

  // Form for Generating Bulk Payroll
  const {
    register: registerGenerate,
    handleSubmit: handleSubmitGenerate,
    setValue: setGenerateValue,
    watch: watchGenerate,
    formState: { errors: generateErrors },
  } = useForm<GeneratePayrollInput>({
    resolver: zodResolver(generatePayrollSchema),
    defaultValues: {
      period: periodFilter,
      employeeIds: [],
    },
  });

  const selectedEmployeeIds = watchGenerate("employeeIds") || [];

  const handleSelectAllEmployees = () => {
    if (selectedEmployeeIds.length === activeEmployees.length) {
      setGenerateValue("employeeIds", []);
    } else {
      setGenerateValue(
        "employeeIds",
        activeEmployees.map((e) => e.id)
      );
    }
  };

  // Form for Editing Payroll (BaseSalary/Allowance/Bonus/Deduction/Status)
  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEditForm,
    watch: watchEdit,
    formState: { errors: editErrors },
  } = useForm<UpdatePayrollInput>({
    resolver: zodResolver(updatePayrollSchema) as any,
    defaultValues: {
      baseSalary: 0,
      allowance: 0,
      bonus: 0,
      deduction: 0,
      status: "DRAFT",
    },
  });

  const watchBaseSalary = watchEdit("baseSalary") || 0;
  const watchAllowance = watchEdit("allowance") || 0;
  const watchBonus = watchEdit("bonus") || 0;
  const watchDeduction = watchEdit("deduction") || 0;

  const openGenerateModal = () => {
    setGenerateValue("period", periodFilter);
    setGenerateValue("employeeIds", []);
    setIsGenerateModalOpen(true);
  };

  const openEditModal = (payroll: Payroll) => {
    setEditingPayroll(payroll);
    resetEditForm({
      baseSalary: payroll.baseSalary,
      allowance: payroll.allowance,
      bonus: payroll.bonus,
      deduction: payroll.deduction,
      status: payroll.status,
    });
    setIsEditModalOpen(true);
  };

  const openPayModal = (payroll: Payroll) => {
    setPayingPayroll(payroll);
    setPaymentMethod("BANK_TRANSFER");
    setPaymentBank(payroll.employee.bankName || "BANK_BCA");
    setTransferRef(`TRX-${Math.floor(100000 + Math.random() * 900000)}`);
    setPaidDate(new Date().toISOString().substring(0, 10));
    setIsPayModalOpen(true);
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayroll) return;

    updateMutation.mutate(
      {
        id: payingPayroll.id,
        data: {
          baseSalary: payingPayroll.baseSalary,
          allowance: payingPayroll.allowance,
          bonus: payingPayroll.bonus,
          deduction: payingPayroll.deduction,
          status: "PAID",
          paidAt: new Date(paidDate),
        },
      },
      {
        onSuccess: () => {
          showToast(`Pembayaran gaji Karyawan ${payingPayroll.employee.name} sebesar Rp ${payingPayroll.totalSalary.toLocaleString("id-ID")} BERHASIL DIKONFIRMASI!`, "success");
          setIsPayModalOpen(false);
          setPayingPayroll(null);
        },
        onError: (err: any) => {
          showToast(err.message || "Gagal mengkonfirmasi pembayaran gaji", "error");
        },
      }
    );
  };

  // Mutations
  const generateMutation = useMutation({
    mutationFn: async (data: GeneratePayrollInput) => {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData;
    },
    onSuccess: (resData, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      if (variables.period) {
        setPeriodFilter(variables.period);
      }
      showToast(resData?.message || "Payroll berhasil digenerate", "success");
      setIsGenerateModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menggenerate payroll", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayrollInput }) => {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Data payroll berhasil diperbarui", "success");
      setIsEditModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal memperbarui payroll", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Data payroll berhasil dihapus", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menghapus payroll", "error");
    },
  });

  const bulkPayMutation = useMutation({
    mutationFn: async (data: { payrollIds: string[]; paymentMethod: string; paidAt: string }) => {
      const res = await fetch("/api/payroll/pay-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData;
    },
    onSuccess: (resData) => {
      queryClient.invalidateQueries({ queryKey: ["payrolls"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast(resData.message || "Pembayaran gaji sekaligus berhasil diproses!", "success");
      setSelectedPayrollIds([]);
      setIsBulkPayModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal memproses pembayaran gaji sekaligus", "error");
    },
  });

  const onGenerateSubmit = (data: GeneratePayrollInput) => {
    if (data.employeeIds.length === 0) {
      showToast("Silakan pilih minimal satu karyawan", "warning");
      return;
    }
    generateMutation.mutate(data);
  };

  const onEditSubmit = (data: UpdatePayrollInput) => {
    if (editingPayroll) {
      updateMutation.mutate({ id: editingPayroll.id, data });
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data payroll Karyawan ${name} periode ${periodFilter}?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Sorting
  const handleSort = (field: keyof Payroll) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredPayrolls = payrolls.filter((pr) => {
    const matchesSearch =
      pr.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.employee.position.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter) {
      return matchesSearch && pr.status === statusFilter;
    }
    return matchesSearch;
  });

  const sortedPayrolls = [...filteredPayrolls].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "employee") {
      aValue = a.employee.name;
      bValue = b.employee.name;
    }

    if (typeof aValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    }
    if (typeof aValue === "number") {
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
    return 0;
  });

  // Selection & Bulk Pay Helpers
  const draftPayrollsInView = sortedPayrolls.filter((p) => p.status === "DRAFT");
  const isAllDraftSelected =
    draftPayrollsInView.length > 0 &&
    draftPayrollsInView.every((p) => selectedPayrollIds.includes(p.id));

  const handleToggleSelectAllDraft = () => {
    if (isAllDraftSelected) {
      setSelectedPayrollIds([]);
    } else {
      setSelectedPayrollIds(draftPayrollsInView.map((p) => p.id));
    }
  };

  const handleToggleSelectPayroll = (id: string) => {
    if (selectedPayrollIds.includes(id)) {
      setSelectedPayrollIds(selectedPayrollIds.filter((item) => item !== id));
    } else {
      setSelectedPayrollIds([...selectedPayrollIds, id]);
    }
  };

  const openBulkPayModal = (idsToPay?: string[]) => {
    const targetIds = idsToPay && idsToPay.length > 0 ? idsToPay : selectedPayrollIds;
    if (targetIds.length === 0) {
      if (draftPayrollsInView.length > 0) {
        setSelectedPayrollIds(draftPayrollsInView.map((p) => p.id));
      } else {
        showToast("Tidak ada payroll Belum Dibayar yang dapat diproses", "warning");
        return;
      }
    } else {
      setSelectedPayrollIds(targetIds);
    }
    setBulkPaymentMethod("BANK_TRANSFER");
    setBulkTransferRef(`BATCH-${Math.floor(100000 + Math.random() * 900000)}`);
    setBulkPaidDate(new Date().toISOString().substring(0, 10));
    setIsBulkPayModalOpen(true);
  };

  const handleConfirmBulkPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPayrollIds.length === 0) return;
    bulkPayMutation.mutate({
      payrollIds: selectedPayrollIds,
      paymentMethod: bulkPaymentMethod,
      paidAt: bulkPaidDate,
    });
  };

  const selectedPayrollsList = payrolls.filter((p) => selectedPayrollIds.includes(p.id));
  const totalBulkPayAmount = selectedPayrollsList.reduce((sum, p) => sum + p.totalSalary, 0);
  const totalUnpaidCount = payrolls.filter((p) => p.status === "DRAFT").length;

  const totalPages = Math.ceil(sortedPayrolls.length / itemsPerPage) || 1;
  const paginatedPayrolls = sortedPayrolls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // CSV Excel Export
  const handleExportCSV = () => {
    if (payrolls.length === 0) {
      showToast("Tidak ada data payroll untuk diekspor", "warning");
      return;
    }

    const headers = [
      "Periode",
      "Nama Karyawan",
      "Jabatan",
      "Gaji Pokok (Rp)",
      "Tunjangan (Rp)",
      "Bonus (Rp)",
      "Gaji Lembur (Rp)",
      "Potongan Lainnya (Rp)",
      "BPJS Kesehatan (Rp)",
      "BPJS Ketenagakerjaan (Rp)",
      "PPh21 (Rp)",
      "Total Gaji (Rp)",
      "Status Pembayaran",
      "Tanggal Dibayar",
    ];

    const csvRows = [headers.join(",")];
    for (const row of sortedPayrolls) {
      const values = [
        `"${row.period}"`,
        `"${row.employee.name.replace(/"/g, '""')}"`,
        `"${row.employee.position.name.replace(/"/g, '""')}"`,
        row.baseSalary,
        row.allowance,
        row.bonus,
        row.overtime || 0,
        row.deduction,
        row.bpjsKesehatan,
        row.bpjsKetenagakerjaan,
        row.pph21,
        row.totalSalary,
        `"${row.status === "PAID" ? "Lunas" : "Draft"}"`,
        `"${row.paidAt ? new Date(row.paidAt).toISOString().split("T")[0] : "-"}"`,
      ];
      csvRows.push(values.join(","));
    }

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payroll_laporan_${periodFilter}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Proses Penggajian</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola pembuatan lembar payroll bulanan, bonus tunjangan, potongan kerja, dan rilis slip gaji.
          </p>
        </div>

        <div className="flex gap-2">
          {totalUnpaidCount > 0 && (
            <button
              onClick={() => openBulkPayModal(selectedPayrollIds.length > 0 ? selectedPayrollIds : draftPayrollsInView.map((p) => p.id))}
              className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Wallet size={16} />
              <span>
                Bayar Sekaligus {selectedPayrollIds.length > 0 ? `(${selectedPayrollIds.length})` : `(${totalUnpaidCount})`}
              </span>
            </button>
          )}

          <button
            onClick={openGenerateModal}
            className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full sm:w-auto"
          >
            <Plus size={16} />
            <span>Generate Bulanan</span>
          </button>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print-only text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase">Laporan Penggajian Karyawan</h1>
        <p className="text-xs text-slate-500 mt-1">Periode Pembayaran: {periodFilter}</p>
      </div>

      {/* Filter and Controls */}
      <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm no-print">
        {/* Month Picker */}
        <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50">
          <Calendar size={14} className="text-slate-400" />
          <input
            type="month"
            value={periodFilter}
            onChange={(e) => {
              setPeriodFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent border-none text-xs focus:outline-none text-slate-700 font-semibold cursor-pointer"
          />
          {periodFilter ? (
            <button
              type="button"
              onClick={() => {
                setPeriodFilter("");
                setCurrentPage(1);
              }}
              className="text-[10px] font-bold px-2 py-1 bg-slate-200 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Tampilkan Semua Periode Bulan"
            >
              Semua Bulan
            </button>
          ) : (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              Semua Bulan
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute inset-y-0 left-3.5 my-auto text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama karyawan atau jabatan..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Status filter & exports */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          >
            <option value="">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PAID">Lunas</option>
          </select>

          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm cursor-pointer bg-white"
          >
            <Download size={14} />
            <span>Excel</span>
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

      {/* Sticky Bulk Action Banner */}
      {selectedPayrollIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="no-print bg-slate-900 text-white rounded-2xl p-3.5 px-5 flex flex-wrap items-center justify-between gap-3 shadow-lg border border-slate-800"
        >
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-lg">
              {selectedPayrollIds.length} Karyawan Terpilih
            </span>
            <span className="text-xs text-slate-300">
              Total Gaji Bersih: <strong className="text-emerald-400 font-extrabold">Rp {totalBulkPayAmount.toLocaleString("id-ID")}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedPayrollIds([])}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 font-semibold transition-colors cursor-pointer"
            >
              Batal Pilih
            </button>
            <button
              onClick={() => openBulkPayModal(selectedPayrollIds)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle size={14} />
              <span>Proses Bayar Sekaligus</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Table List */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold h-11 bg-slate-50/50 sticky top-0 z-10">
                <th className="py-2.5 px-4 w-10 text-center no-print">
                  <input
                    type="checkbox"
                    checked={isAllDraftSelected}
                    onChange={handleToggleSelectAllDraft}
                    disabled={draftPayrollsInView.length === 0}
                    title="Pilih Semua Karyawan Belum Dibayar di Halaman Ini"
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer disabled:opacity-40"
                  />
                </th>
                <th
                  onClick={() => handleSort("employee")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Karyawan</span>
                    <ArrowUpDown size={12} className="text-slate-350" />
                  </div>
                </th>
                <th className="py-2.5 px-4">Gaji Pokok</th>
                <th className="py-2.5 px-4">Tunjangan</th>
                <th
                  onClick={() => handleSort("bonus")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Bonus</span>
                    <ArrowUpDown size={12} className="text-slate-355" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("overtime" as any)}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Gaji Lembur</span>
                    <ArrowUpDown size={12} className="text-slate-355" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("deduction")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Potongan</span>
                    <ArrowUpDown size={12} className="text-slate-355" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalSalary")}
                  className="py-2.5 px-4 cursor-pointer hover:text-slate-800 transition-colors select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Total Bersih</span>
                    <ArrowUpDown size={12} className="text-slate-355" />
                  </div>
                </th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : paginatedPayrolls.length > 0 ? (
                paginatedPayrolls.map((pr) => (
                  <tr key={pr.id} className={`hover:bg-slate-50/40 transition-colors h-14 ${selectedPayrollIds.includes(pr.id) ? "bg-emerald-50/30" : ""}`}>
                    <td className="py-3 px-4 text-center no-print">
                      <input
                        type="checkbox"
                        checked={selectedPayrollIds.includes(pr.id)}
                        onChange={() => handleToggleSelectPayroll(pr.id)}
                        disabled={pr.status === "PAID"}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{pr.employee.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pr.employee.position.name}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      Rp {pr.baseSalary.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-semibold">
                      Rp {pr.allowance.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">
                      Rp {pr.bonus.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-amber-600 font-bold">
                      {pr.overtime && pr.overtime > 0 ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded text-[11px]">
                          Rp {pr.overtime.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-rose-500 font-bold">
                      Rp {pr.deduction.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">
                      Rp {pr.totalSalary.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded-full border ${
                          pr.status === "PAID"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}
                      >
                        {pr.status === "PAID" ? "Lunas" : "Belum Dibayar"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right no-print whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Manual Pay Confirmation Button for DRAFT / Belum Dibayar status */}
                        {pr.status === "DRAFT" ? (
                          <button
                            onClick={() => openPayModal(pr)}
                            disabled={updateMutation.isPending}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-sm shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                            title="Klik Untuk Membuka Konfirmasi Pembayaran Gaji Manual"
                          >
                            <CheckCircle size={13} />
                            <span>Bayar Gaji</span>
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[11px]"
                            title="Gaji Telah Dibayarkan Lunas"
                          >
                            <CheckCircle size={13} />
                            <span>Sudah Dibayar</span>
                          </span>
                        )}

                        {/* Edit Bonus, Potongan & Gaji */}
                        <button
                          onClick={() => openEditModal(pr)}
                          className="p-1.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 cursor-pointer"
                          title="Edit Gaji Pokok, Tunjangan, Bonus & Potongan"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(pr.id, pr.employee.name)}
                          className="p-1.5 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-100 text-rose-600 cursor-pointer"
                          title="Hapus Payroll"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                    Tidak ada data payroll ditemukan untuk periode {periodFilter}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {sortedPayrolls.length > itemsPerPage && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between no-print">
            <span className="text-[10px] text-slate-500 font-medium">
              Menampilkan {Math.min(sortedPayrolls.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(sortedPayrolls.length, currentPage * itemsPerPage)} dari {sortedPayrolls.length} lembar
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
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Generate Bulk Payroll */}
      <AnimatePresence>
        {isGenerateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-xl border border-slate-100 p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Generate Payroll Bulanan
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Buat lembar payroll secara massal untuk karyawan aktif.
                  </p>
                </div>
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitGenerate(onGenerateSubmit)} className="space-y-4">
                
                {/* Period Selector */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      {...registerGenerate("period")}
                      type="month"
                      className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
                    />
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                      Periode Gaji (Pilih Bulan Mana Saja)
                    </label>
                  </div>
                  {/* Quick Preset Buttons */}
                  <div className="flex gap-1.5 flex-wrap items-center pt-0.5">
                    <span className="text-[10px] text-slate-400 font-medium">Pilih Cepat:</span>
                    {[
                      {
                        label: "Bulan Ini",
                        getPeriod: () => {
                          const d = new Date();
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        },
                      },
                      {
                        label: "Bulan Lalu",
                        getPeriod: () => {
                          const d = new Date();
                          d.setMonth(d.getMonth() - 1);
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        },
                      },
                      {
                        label: "Bulan Depan",
                        getPeriod: () => {
                          const d = new Date();
                          d.setMonth(d.getMonth() + 1);
                          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        },
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setGenerateValue("period", preset.getPeriod())}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Employee Checklist selection box */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Karyawan Aktif</span>
                    <button
                      type="button"
                      onClick={handleSelectAllEmployees}
                      className="text-[10.5px] font-bold text-blue-600 hover:text-blue-700"
                    >
                      {selectedEmployeeIds.length === activeEmployees.length ? "Batal Semua" : "Pilih Semua"}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/30 p-2.5 space-y-1">
                    {activeEmployees.length > 0 ? (
                      activeEmployees.map((emp) => {
                        const isChecked = selectedEmployeeIds.includes(emp.id);
                        return (
                          <label
                            key={emp.id}
                            className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setGenerateValue(
                                    "employeeIds",
                                    selectedEmployeeIds.filter((id) => id !== emp.id)
                                  );
                                } else {
                                  setGenerateValue("employeeIds", [...selectedEmployeeIds, emp.id]);
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800">{emp.name}</p>
                              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{emp.position.name}</p>
                            </div>
                          </label>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-6 font-medium">
                        Tidak ada karyawan aktif yang ditemukan.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={generateMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Generate Payroll</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edit single payroll */}
      <AnimatePresence>
        {isEditModalOpen && editingPayroll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-100 p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Koreksi Gaji Karyawan
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Sesuaikan bonus, potongan, dan status pembayaran Karyawan {editingPayroll.employee.name}.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
                
                {/* Info summary */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                    <span className="text-slate-700">Total Gaji Bersih (Proyeksi Realtime):</span>
                    <span className="text-blue-600 text-sm">
                      Rp {(
                        Number(watchBaseSalary) +
                        Number(watchAllowance) +
                        Number(watchBonus) -
                        Number(watchDeduction) -
                        Math.round(Number(watchBaseSalary) * 0.08)
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    *Potongan BPJS (3%) & PPh21 (5%) dihitung otomatis dari Gaji Pokok.
                  </p>
                </div>

                {/* Edit Gaji Pokok & Tunjangan */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...registerEdit("baseSalary", { valueAsNumber: true })}
                        type="number"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                        Gaji Pokok (Rp)
                      </label>
                    </div>
                    {editErrors.baseSalary && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {editErrors.baseSalary.message}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...registerEdit("allowance", { valueAsNumber: true })}
                        type="number"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-bold placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                        Tunjangan (Rp)
                      </label>
                    </div>
                    {editErrors.allowance && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {editErrors.allowance.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit Bonus & Potongan */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Bonus */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...registerEdit("bonus", { valueAsNumber: true })}
                        type="number"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-emerald-700 font-bold placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                        Bonus Tambahan (Rp)
                      </label>
                    </div>
                    {editErrors.bonus && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {editErrors.bonus.message}
                      </span>
                    )}
                  </div>

                  {/* Deduction */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...registerEdit("deduction", { valueAsNumber: true })}
                        type="number"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-rose-600 font-bold placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                        Potongan Kerja (Rp)
                      </label>
                    </div>
                    {editErrors.deduction && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {editErrors.deduction.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status selector */}
                <div className="relative">
                  <select
                    {...registerEdit("status")}
                    className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium transition-all"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="PAID">Lunas (Paid)</option>
                  </select>
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                    Status Pembayaran
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Rincian</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Manual Pay Confirmation */}
      <AnimatePresence>
        {isPayModalOpen && payingPayroll && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Konfirmasi Pembayaran Gaji Manual
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Verifikasi rincian transfer & konfirmasi pencairan gaji karyawan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmPay} className="space-y-4">
                
                {/* Employee Info Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Penerima Gaji</span>
                      <h4 className="font-extrabold text-slate-900 dark:text-white text-sm mt-0.5">{payingPayroll.employee.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{payingPayroll.employee.position?.name} • {payingPayroll.employee.department || "General"}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] border border-blue-200 dark:border-blue-800">
                      Periode {payingPayroll.period}
                    </span>
                  </div>

                  {/* Bank Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Bank Tujuan</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{payingPayroll.employee.bankName || "Bank BCA"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 block">Nomor Rekening</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{payingPayroll.employee.bankAccount || "1234567890"}</p>
                    </div>
                    <div className="col-span-2 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 block">Atas Nama Rekening</span>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{payingPayroll.employee.accountHolder || payingPayroll.employee.name}</p>
                    </div>
                  </div>
                </div>

                {/* Salary Breakdown Summary */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Gaji Pokok & Tunjangan:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Rp {(payingPayroll.baseSalary + payingPayroll.allowance).toLocaleString("id-ID")}
                    </span>
                  </div>
                  {payingPayroll.bonus > 0 && (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                      <span>Bonus Performance:</span>
                      <span className="font-bold">+ Rp {payingPayroll.bonus.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                  {payingPayroll.overtime && payingPayroll.overtime > 0 ? (
                    <div className="flex justify-between text-emerald-700 dark:text-emerald-300">
                      <span>Upah Lembur:</span>
                      <span className="font-bold">+ Rp {payingPayroll.overtime.toLocaleString("id-ID")}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Potongan & Pajak (BPJS + PPh21):</span>
                    <span className="font-bold">- Rp {(payingPayroll.deduction + payingPayroll.bpjsKesehatan + payingPayroll.bpjsKetenagakerjaan + payingPayroll.pph21).toLocaleString("id-ID")}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-emerald-200 dark:border-emerald-800/60 pt-2.5 mt-1 font-black text-sm">
                    <span className="text-emerald-900 dark:text-emerald-200 uppercase tracking-wider text-[11px]">Total Gaji Bersih Dibayar:</span>
                    <span className="text-emerald-700 dark:text-emerald-300 text-lg">
                      Rp {payingPayroll.totalSalary.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                {/* Payment Form Controls */}
                <div className="space-y-3 pt-1">
                  {/* Metode Pembayaran & Bank Tujuan */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Metode Pembayaran</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="BANK_TRANSFER">Transfer Bank Payroll</option>
                        <option value="MANUAL_TRANSFER">Transfer Manual (ATM / M-Banking)</option>
                        <option value="CASH">Tunai / Kasir (Cash)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Bank Tujuan</label>
                      <select
                        value={paymentBank}
                        onChange={(e) => setPaymentBank(e.target.value)}
                        disabled={paymentMethod === "CASH"}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="BANK_BCA">Bank BCA</option>
                        <option value="BANK_BRI">Bank BRI</option>
                        <option value="BANK_MANDIRI">Bank Mandiri</option>
                        <option value="BANK_BNI">Bank BNI</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Nomor Referensi */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">No. Referensi / Bukti</label>
                      <input
                        type="text"
                        value={transferRef}
                        onChange={(e) => setTransferRef(e.target.value)}
                        placeholder="TRX-XXXXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>

                    {/* Tanggal Bayar */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Tanggal Pembayaran</label>
                      <input
                        type="date"
                        value={paidDate}
                        onChange={(e) => setPaidDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsPayModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Memproses Bayar...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        <span>Proses & Konfirmasi Bayar Gaji</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Bulk Pay Confirmation */}
      <AnimatePresence>
        {isBulkPayModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 p-6 z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center font-bold">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                      Konfirmasi Pembayaran Gaji Sekaligus
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Proses pencairan gaji massal untuk {selectedPayrollIds.length} karyawan terpilih.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkPayModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmBulkPay} className="space-y-4">
                
                {/* Total Summary Banner */}
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                      Total Pencairan ({selectedPayrollIds.length} Karyawan)
                    </span>
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                      Rp {totalBulkPayAmount.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800">
                    Periode {periodFilter || "Semua"}
                  </span>
                </div>

                {/* Payroll List Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Daftar Karyawan yang Akan Dibayar
                  </span>
                  <div className="border border-slate-200 dark:border-slate-700/60 rounded-2xl max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-2 text-xs">
                    {selectedPayrollsList.map((pr) => (
                      <div key={pr.id} className="flex items-center justify-between p-2">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{pr.employee.name}</p>
                          <p className="text-[10px] text-slate-400">{pr.employee.position?.name}</p>
                        </div>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          Rp {pr.totalSalary.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Controls */}
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Metode Pembayaran</label>
                      <select
                        value={bulkPaymentMethod}
                        onChange={(e) => setBulkPaymentMethod(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="BANK_TRANSFER">Transfer Bank Payroll Massal</option>
                        <option value="MANUAL_TRANSFER">Transfer Manual (ATM / M-Banking)</option>
                        <option value="CASH">Tunai / Kasir (Cash)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">No. Referensi Batch</label>
                      <input
                        type="text"
                        value={bulkTransferRef}
                        onChange={(e) => setBulkTransferRef(e.target.value)}
                        placeholder="BATCH-XXXXXX"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Tanggal Pembayaran / Pencairan</label>
                    <input
                      type="date"
                      value={bulkPaidDate}
                      onChange={(e) => setBulkPaidDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBulkPayModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={bulkPayMutation.isPending}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                  >
                    {bulkPayMutation.isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Memproses Pembayaran Massal...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        <span>Konfirmasi & Bayar Sekaligus ({selectedPayrollIds.length} Karyawan)</span>
                      </>
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
