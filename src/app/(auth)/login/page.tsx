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
    <div className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center bg-gradient-to-tr from-[#FFF5E6] via-[#FFFDF9] to-[#F1F5F9] px-4 py-8 sm:px-6 md:px-8 relative overflow-hidden font-sans">
      {/* Decorative Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-blue-500/10 blur-[130px] pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 p-6 sm:p-8 relative z-10 my-auto"
      >
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-tr from-blue-600 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 text-white font-black text-xl sm:text-2xl mb-3 sm:mb-4">
            P
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-center">
            {isResetMode ? "Lupa Kata Sandi" : "Sistem Penggajian"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 text-center font-medium leading-relaxed max-w-[280px]">
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
                  <Mail size={18} />
                </span>
                <input
                  {...registerReset("email")}
                  type="email"
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] sm:peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 pointer-events-none">
                  Email
                </label>
              </div>
              {resetErrors.email && (
                <span className="text-[11px] text-rose-500 font-medium block pl-1">
                  {resetErrors.email.message}
                </span>
              )}
            </div>

            {/* Phone Verification field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Phone size={18} />
                </span>
                <input
                  {...registerReset("phone")}
                  type="text"
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] sm:peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 pointer-events-none">
                  Nomor HP (Verifikasi)
                </label>
              </div>
              {resetErrors.phone && (
                <span className="text-[11px] text-rose-500 font-medium block pl-1">
                  {resetErrors.phone.message}
                </span>
              )}
            </div>

            {/* New Password field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={18} />
                </span>
                <input
                  {...registerReset("newPassword")}
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full pl-10 pr-10 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] sm:peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 pointer-events-none">
                  Password Baru
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {resetErrors.newPassword && (
                <span className="text-[11px] text-rose-500 font-medium block pl-1">
                  {resetErrors.newPassword.message}
                </span>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={18} />
                </span>
                <input
                  {...registerReset("confirmPassword")}
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] sm:peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 pointer-events-none">
                  Konfirmasi Password
                </label>
              </div>
              {resetErrors.confirmPassword && (
                <span className="text-[11px] text-rose-500 font-medium block pl-1">
                  {resetErrors.confirmPassword.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Perbarui Kata Sandi</span>
              )}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsResetMode(false);
                  resetResetForm();
                }}
                className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        ) : (
          /* Login Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
            
            {/* Email field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Mail size={18} />
                </span>
                <input
                  {...register("email")}
                  type="email"
                  placeholder=" "
                  className="peer w-full pl-10 pr-4 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] sm:peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 pointer-events-none">
                  Email
                </label>
              </div>
              {errors.email && (
                <span className="text-[11px] text-rose-500 font-medium block pl-1">
                  {errors.email.message}
                </span>
              )}
            </div>

            {/* Password field */}
            <div className="space-y-1">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pointer-events-none">
                  <Lock size={18} />
                </span>
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  className="peer w-full pl-10 pr-10 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                />
                <label className="absolute left-10 top-1.5 text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs sm:peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] sm:peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-600 pointer-events-none">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="text-[11px] text-rose-500 font-medium block pl-1">
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Forget password link */}
            <div className="flex justify-end text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setIsResetMode(true)}
                className="font-bold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              >
                Lupa Kata Sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Masuk Ke Akun</span>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
