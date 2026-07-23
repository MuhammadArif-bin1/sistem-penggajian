"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Providers";
import { updateProfileSchema, changePasswordSchema, UpdateProfileInput, ChangePasswordInput } from "@/schemas/auth.schema";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const { user, refetchUser } = useAuth();
  const { showToast } = useToast();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Form for update profile
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.employee?.name || "Admin",
      email: user?.email || "",
      photo: user?.employee?.photo || "",
    },
  });

  // Form for change password
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    setIsUpdatingProfile(true);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const res = await response.json();
      if (res.success) {
        await refetchUser();
        showToast("Profil berhasil diperbarui!", "success");
      } else {
        showToast(res.message || "Gagal memperbarui profil", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/auth/me/password", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const res = await response.json();
      if (res.success) {
        showToast("Password berhasil diperbarui!", "success");
        resetPasswordForm();
      } else {
        showToast(res.message || "Gagal memperbarui password", "error");
      }
    } catch {
      showToast("Terjadi kesalahan sistem", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pengaturan Profil</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Perbarui informasi personal Anda dan amankan akses masuk portal payroll.
        </p>
      </div>

      {/* Grid forms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Update Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50 flex items-center gap-2">
              <User size={15} className="text-blue-600" />
              <span>Detail Informasi</span>
            </h3>

            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
              
              {/* Name with Floating Label */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    {...registerProfile("name")}
                    type="text"
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Nama Lengkap
                  </label>
                </div>
                {profileErrors.name && (
                  <span className="text-[10px] text-rose-500 font-medium block">
                    {profileErrors.name.message}
                  </span>
                )}
              </div>

              {/* Email with Floating Label */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    {...registerProfile("email")}
                    type="email"
                    placeholder=" "
                    disabled
                    className="peer w-full px-3.5 py-3 pt-5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-400 placeholder-transparent cursor-not-allowed"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Email Account (Unchangeable)
                  </label>
                </div>
                {profileErrors.email && (
                  <span className="text-[10px] text-rose-500 font-medium block">
                    {profileErrors.email.message}
                  </span>
                )}
              </div>

              {/* Avatar URL with Floating Label */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    {...registerProfile("photo")}
                    type="text"
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 pt-5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Avatar Image URL
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                >
                  {isUpdatingProfile ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Change Password Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
        >
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-50 flex items-center gap-2">
              <Lock size={15} className="text-blue-600" />
              <span>Ganti Kata Sandi</span>
            </h3>

            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
              
              {/* Current Password */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    {...registerPassword("currentPassword")}
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 pt-5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Password Saat Ini
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passwordErrors.currentPassword && (
                  <span className="text-[10px] text-rose-500 font-medium block">
                    {passwordErrors.currentPassword.message}
                  </span>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    {...registerPassword("newPassword")}
                    type={showNewPassword ? "text" : "password"}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 pt-5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Password Baru
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {passwordErrors.newPassword && (
                  <span className="text-[10px] text-rose-500 font-medium block">
                    {passwordErrors.newPassword.message}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    {...registerPassword("confirmPassword")}
                    type={showNewPassword ? "text" : "password"}
                    placeholder=" "
                    className="peer w-full px-3.5 py-3 pt-5 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-transparent transition-all"
                  />
                  <label className="absolute left-3.5 top-1.5 text-[9px] font-bold text-slate-400 uppercase transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:top-3.5 peer-placeholder-shown:font-semibold peer-focus:top-1.5 peer-focus:text-[9px] peer-focus:font-bold peer-focus:text-blue-655 pointer-events-none">
                    Konfirmasi Password Baru
                  </label>
                </div>
                {passwordErrors.confirmPassword && (
                  <span className="text-[10px] text-rose-500 font-medium block">
                    {passwordErrors.confirmPassword.message}
                  </span>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-755 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Mengubah...</span>
                    </>
                  ) : (
                    <span>Ubah Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
