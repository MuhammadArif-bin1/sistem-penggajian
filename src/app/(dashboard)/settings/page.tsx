"use client";

import React, { useState } from "react";
import { Settings, Building, Sliders, Database, Save, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/Providers";

export default function SettingsPage() {
  const { showToast } = useToast();
  const [companyName, setCompanyName] = useState("PT Teknologi & Digital Indonesia");
  const [companyAddress, setCompanyAddress] = useState("Jl. Sudirman No. 45, Jakarta Pusat");
  const [companyEmail, setCompanyEmail] = useState("hr@company.com");
  const [companyPhone, setCompanyPhone] = useState("021-5550199");

  const [pphRate, setPphRate] = useState("5");
  const [bpjsKesRate, setBpjsKesRate] = useState("1");
  const [bpjsTkRate, setBpjsTkRate] = useState("2");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Pengaturan sistem berhasil disimpan", "success");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Sistem
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Kelola profil perusahaan, persentase potongan penggajian, dan preferensi aplikasi.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profil Perusahaan */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Profil Perusahaan
              </h2>
              <p className="text-xs text-slate-400">
                Informasi dasar yang muncul pada laporan slip gaji dan rekap dokumen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Nama Perusahaan
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Email Kontak Perusahaan
              </label>
              <input
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Nomor Telepon Kantor
              </label>
              <input
                type="text"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                Alamat Kantor
              </label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Paramter Potongan & Pajak */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Persentase Potongan Gaji Otomatis
              </h2>
              <p className="text-xs text-slate-400">
                Aturan persentase pajak PPh 21 dan potongan BPJS untuk perhitungan slip gaji.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                PPh 21 (%)
              </label>
              <input
                type="number"
                value={pphRate}
                onChange={(e) => setPphRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                BPJS Kesehatan (%)
              </label>
              <input
                type="number"
                value={bpjsKesRate}
                onChange={(e) => setBpjsKesRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                BPJS Ketenagakerjaan (%)
              </label>
              <input
                type="number"
                value={bpjsTkRate}
                onChange={(e) => setBpjsTkRate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save size={16} />
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </form>
    </div>
  );
}
