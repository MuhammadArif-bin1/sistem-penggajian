"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Providers";
import {
  FileText,
  Plus,
  Check,
  X as XIcon,
  Loader2,
  Clock,
  CalendarDays,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CutiPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "ADMIN" || user?.role === "HR";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "CUTI",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leave");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      showToast("Pengajuan berhasil dikirim", "success");
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showToast(err.message, "error");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      showToast("Status berhasil diupdate", "success");
    },
    onError: (err: any) => {
      showToast(err.message, "error");
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">Disetujui</span>;
      case "REJECTED":
        return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">Ditolak</span>;
      default:
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">Menunggu</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pengajuan Cuti & Izin</h1>
          <p className="text-sm text-slate-500">Kelola permohonan cuti, izin, atau sakit.</p>
        </div>
        {!isAdmin && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:-translate-y-0.5 transition-transform"
          >
            <Plus size={16} /> Ajukan Cuti/Izin
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold h-11">
              <tr>
                {isAdmin && <th className="px-4 py-2">Karyawan</th>}
                <th className="px-4 py-2">Jenis</th>
                <th className="px-4 py-2">Tanggal</th>
                <th className="px-4 py-2">Alasan</th>
                <th className="px-4 py-2">Status</th>
                {isAdmin && <th className="px-4 py-2 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="py-8 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" /></td></tr>
              ) : leaves.length > 0 ? (
                leaves.map((leave: any) => (
                  <tr key={leave.id} className="hover:bg-slate-50 h-14">
                    {isAdmin && (
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {leave.employee?.name}
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-slate-700">{leave.type}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(leave.startDate).toLocaleDateString("id-ID")} - {new Date(leave.endDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">{leave.reason}</td>
                    <td className="px-4 py-3">{getStatusBadge(leave.status)}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {leave.status === "PENDING" && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => updateStatusMutation.mutate({ id: leave.id, status: "APPROVED" })} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Setujui"><Check size={14} /></button>
                            <button onClick={() => updateStatusMutation.mutate({ id: leave.id, status: "REJECTED" })} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" title="Tolak"><XIcon size={14} /></button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="py-8 text-center text-slate-400">Belum ada data pengajuan.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-slate-900">Buat Pengajuan</h3>
                <button onClick={() => setIsModalOpen(false)}><XIcon size={18} className="text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Jenis Pengajuan</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CUTI">Cuti Tahunan</option>
                    <option value="SAKIT">Sakit</option>
                    <option value="IZIN">Izin Lainnya</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Mulai</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Selesai</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Alasan</label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  ></textarea>
                </div>
                <button
                  disabled={createMutation.isPending}
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  {createMutation.isPending ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
