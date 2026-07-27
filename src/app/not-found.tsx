"use client";

import React from "react";
import Link from "next/link";
import { MoveLeft, HelpCircle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-center">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-5">
        <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center mx-auto">
          <HelpCircle size={24} />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">404</h1>
          <h2 className="text-lg font-bold text-slate-800">Halaman Tidak Ditemukan</h2>
          <p className="text-xs text-slate-500">
            Halaman yang Anda cari tidak ada atau telah dipindahkan ke alamat lain.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
        >
          <MoveLeft size={14} />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}
