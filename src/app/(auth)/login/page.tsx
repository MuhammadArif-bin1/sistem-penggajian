"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput, resetPasswordSchema, ResetPasswordInput } from "@/schemas/auth.schema";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Providers";
import { Lock, Mail, Eye, EyeOff, Loader2, Phone } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Form for Login
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Form for Reset Password
  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
    reset: resetResetForm,
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
      phone: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        showToast("Selamat datang kembali!", "success");
      } else {
        showToast(result.message || "Email atau password salah", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();

      if (resData.success) {
        showToast(resData.message || "Kata sandi berhasil diperbarui!", "success");
        setIsResetMode(false);
        resetResetForm();
      } else {
        showToast(resData.message || "Gagal mereset kata sandi", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] p-4 relative overflow-hidden font-sans">
      {/* Premium Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-400/10 blur-[130px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-400/10 blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-extrabold text-xl mb-4">
            P
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {isResetMode ? "Lupa Kata Sandi" : "Sistem Penggajian"}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 text-center font-medium leading-relaxed max-w-[260px]">
            {isResetMode
              ? "Masukkan email, nomor HP terdaftar, dan kata sandi baru Anda"
              : "Masuk untuk mengakses portal penggajian dan presensi Anda"}
          </p>
        </div>

        {isResetMode ? (
          /* Reset Password Form */
          <form onSubmit={handleSubmitReset(onResetSubmit)} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  {...registerReset("email")}
                  type="email"
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                  Email
                </label>
              </div>
              {resetErrors.email && (
                <span className="text-[10px] text-rose-500 font-medium block">
                  {resetErrors.email.message}
                </span>
              )}
            </div>

            {/* Phone Verification field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Phone size={16} />
                </span>
                <input
                  {...registerReset("phone")}
                  type="text"
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                  Nomor HP (Verifikasi)
                </label>
              </div>
              {resetErrors.phone && (
                <span className="text-[10px] text-rose-500 font-medium block">
                  {resetErrors.phone.message}
                </span>
              )}
            </div>

            {/* New Password field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  {...registerReset("newPassword")}
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full pl-10 pr-10 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                  Password Baru
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {resetErrors.newPassword && (
                <span className="text-[10px] text-rose-500 font-medium block">
                  {resetErrors.newPassword.message}
                </span>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  {...registerReset("confirmPassword")}
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                  Konfirmasi Password
                </label>
              </div>
              {resetErrors.confirmPassword && (
                <span className="text-[10px] text-rose-500 font-medium block">
                  {resetErrors.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-705 hover:to-blue-505 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Perbarui Kata Sandi</span>
              )}
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  resetResetForm();
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Email field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail size={16} />
                </span>
                <input
                  {...register("email")}
                  type="email"
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                  Email
                </label>
              </div>
              {errors.email && (
                <span className="text-[10px] text-rose-500 font-medium block">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={16} />
                </span>
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full pl-10 pr-10 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-650 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-[10px] text-rose-500 font-medium block">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Forget password link */}
            <div className="flex justify-end text-xs">
              <button
                type="button"
                onClick={() => setIsResetMode(true)}
                className="font-bold text-blue-650 hover:text-blue-755 transition-colors cursor-pointer"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-705 hover:to-blue-505 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk Ke Akun</span>
              )}
            </button>

            {/* Daftar Akun Demo */}
            <div className="pt-4 border-t border-slate-100 text-xs space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
                Daftar Akun Demo Uji Coba
              </span>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "admin@payroll.com");
                    setValue("password", "admin123");
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 block">
                      Admin
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      admin@payroll.com
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 group-hover:bg-blue-100 group-hover:text-blue-600 px-2 py-0.5 rounded-md font-mono">
                    admin123
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "hr@payroll.com");
                    setValue("password", "hr1234");
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 block">
                      HR Manager
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      hr@payroll.com
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 group-hover:bg-blue-100 group-hover:text-blue-600 px-2 py-0.5 rounded-md font-mono">
                    hr1234
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setValue("email", "karyawan@payroll.com");
                    setValue("password", "karyawan123");
                  }}
                  className="w-full px-3 py-2 bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-xl transition-all text-left flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 block">
                      Karyawan
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block">
                      karyawan@payroll.com
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-200/60 group-hover:bg-blue-100 group-hover:text-blue-600 px-2 py-0.5 rounded-md font-mono">
                    karyawan123
                  </span>
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
