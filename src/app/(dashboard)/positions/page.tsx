"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { positionSchema, PositionInput } from "@/schemas/position.schema";
import { useToast } from "@/components/Providers";
import {
  Briefcase,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Download,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Position {
  id: string;
  name: string;
  baseSalary: number;
  allowance: number;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  _count: {
    employees: number;
  };
}

export default function PositionsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  // Fetch Positions
  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ["positions", searchTerm, statusFilter],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (searchTerm) q.append("search", searchTerm);
      if (statusFilter) q.append("status", statusFilter);
      const res = await fetch(`/api/positions?${q.toString()}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  // Handle Quick Action Query Param from Dashboard
  useEffect(() => {
    if (searchParams.get("action") === "add") {
      setIsModalOpen(true);
      setEditingPosition(null);
      router.replace("/positions");
    }
  }, [searchParams, router]);

  // Form Setup
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PositionInput>({
    resolver: zodResolver(positionSchema) as any,
    defaultValues: {
      name: "",
      baseSalary: 0,
      allowance: 0,
      description: "",
      status: "ACTIVE",
    },
  });

  const openAddModal = () => {
    setEditingPosition(null);
    reset({
      name: "",
      baseSalary: 0,
      allowance: 0,
      description: "",
      status: "ACTIVE",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (position: Position) => {
    setEditingPosition(position);
    reset({
      name: position.name,
      baseSalary: position.baseSalary,
      allowance: position.allowance,
      description: position.description || "",
      status: position.status,
    });
    setIsModalOpen(true);
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: PositionInput) => {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Jabatan berhasil ditambahkan", "success");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menambahkan jabatan", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PositionInput }) => {
      const res = await fetch(`/api/positions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Jabatan berhasil diperbarui", "success");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal memperbarui jabatan", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/positions/${id}`, {
        method: "DELETE",
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      showToast("Jabatan berhasil dihapus", "success");
    },
    onError: (err: any) => {
      showToast(err.message || "Gagal menghapus jabatan", "error");
    },
  });

  const onSubmit = (data: PositionInput) => {
    if (editingPosition) {
      updateMutation.mutate({ id: editingPosition.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus jabatan ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (positions.length === 0) {
      showToast("Tidak ada data jabatan untuk diekspor", "warning");
      return;
    }
    const headers = ["ID Jabatan", "Nama Jabatan", "Gaji Pokok", "Tunjangan", "Deskripsi", "Total Karyawan", "Status"];
    const csvRows = [headers.join(",")];
    for (const pos of positions) {
      const values = [
        `"${pos.id}"`,
        `"${pos.name.replace(/"/g, '""')}"`,
        pos.baseSalary,
        pos.allowance,
        `"${(pos.description || "").replace(/"/g, '""')}"`,
        pos._count.employees,
        `"${pos.status === "ACTIVE" ? "Aktif" : "Nonaktif"}"`,
      ];
      csvRows.push(values.join(","));
    }

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "data_jabatan.csv");
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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Manajemen Jabatan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola data jabatan, struktur gaji pokok, dan tunjangan bulanan perusahaan.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer w-full sm:w-auto"
        >
          <Plus size={16} />
          <span>Tambah Jabatan</span>
        </button>
      </div>

      {/* Printable Header */}
      <div className="hidden print-only text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold uppercase">Struktur Jabatan & Kompensasi Gaji</h1>
        <p className="text-xs text-slate-500 mt-1">Laporan Resmi Jabatan Operasional</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 rounded-3xl p-4 shadow-sm no-print">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute inset-y-0 left-3.5 my-auto text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama jabatan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
          />
        </div>

        {/* Filter Status */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Tidak Aktif</option>
          </select>

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

      {/* Grid Content */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      ) : positions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {positions.map((pos) => (
            <motion.div
              layout
              key={pos.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <h3 className="font-extrabold text-slate-900 text-sm">{pos.name}</h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {pos.id.substring(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                      pos.status === "ACTIVE"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : "bg-slate-50 border-slate-200 text-slate-500"
                    }`}
                  >
                    {pos.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 h-8 leading-relaxed">
                  {pos.description || "Tidak ada deskripsi jabatan."}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-2xl p-3 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gaji Pokok</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      Rp {pos.baseSalary.toLocaleString("id-ID")}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Tunjangan</span>
                    <p className="font-bold text-slate-800 mt-0.5">
                      Rp {pos.allowance.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-4">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase size={12} className="text-blue-600" />
                  <span>{pos._count.employees} Karyawan</span>
                </span>

                <div className="flex gap-2 no-print">
                  <button
                    onClick={() => openEditModal(pos)}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(pos.id, pos.name)}
                    className="p-2 border border-slate-200 rounded-xl hover:bg-rose-50 hover:border-rose-100 text-rose-600 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl shadow-sm text-slate-400">
          Tidak ada data jabatan ditemukan.
        </div>
      )}

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
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
                    {editingPosition ? "Edit Jabatan" : "Tambah Jabatan Baru"}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Silakan isi form di bawah untuk merancang skema gaji jabatan.
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 hover:bg-slate-50 rounded-xl text-slate-500 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Name Input with Floating Label */}
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      {...register("name")}
                      type="text"
                      placeholder=" "
                      className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                    />
                    <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                      Nama Jabatan
                    </label>
                  </div>
                  {errors.name && (
                    <span className="text-[10px] text-rose-500 font-medium block">
                      {errors.name.message}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Base Salary with Floating Label */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("baseSalary", { valueAsNumber: true })}
                        type="number"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Gaji Pokok (Rp)
                      </label>
                    </div>
                    {errors.baseSalary && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.baseSalary.message}
                      </span>
                    )}
                  </div>

                  {/* Allowance with Floating Label */}
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        {...register("allowance", { valueAsNumber: true })}
                        type="number"
                        placeholder=" "
                        className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                      />
                      <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                        Tunjangan (Rp)
                      </label>
                    </div>
                    {errors.allowance && (
                      <span className="text-[10px] text-rose-500 font-medium block">
                        {errors.allowance.message}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description with Floating Label */}
                <div className="relative">
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all resize-none"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Deskripsi Tugas / Jabatan
                  </label>
                </div>

                {/* Status selector */}
                <div className="relative">
                  <select
                    {...register("status")}
                    className="w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-705 font-medium transition-all"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Tidak Aktif</option>
                  </select>
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase pointer-events-none">
                    Status Jabatan
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <span>Simpan Jabatan</span>
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
