"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/Providers";
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  UserCheck,
  Loader2,
  Camera,
  MapPin,
  Smartphone,
  Globe,
  Printer,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AttendanceRecord {
  id: string | null;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  fotoMasuk: string | null;
  fotoKeluar: string | null;
  device: string | null;
  browser: string | null;
  ipAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface MonitorData {
  employee: {
    id: string;
    name: string;
    email: string;
    phone: string;
    position: string;
  };
  attendance: AttendanceRecord;
}

export default function AbsensiPage() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Clock state
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");

  // Common UI State
  const [historyPeriod, setHistoryPeriod] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Admin filter states
  const [monitorDate, setMonitorDate] = useState(() => {
    const d = new Date();
    const local = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
    return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
  });
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [adminCurrentPage, setAdminCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Camera & selfie state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [activeClockType, setActiveClockType] = useState<"in" | "out" | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // base64 JPEG
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [isSubmittingAbsen, setIsSubmittingAbsen] = useState(false);

  // Photo viewer modal state
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clock tick effect
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const local = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      
      setCurrentTime(
        local.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );

      setCurrentDateStr(
        local.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup camera stream on unmount or when camera page closes
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // QUERY: Fetch Employee Today Status
  const { data: todayAttendance, isLoading: isLoadingToday } = useQuery<AttendanceRecord | null>({
    queryKey: ["attendance-today"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/clock");
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    enabled: !!user && user.role === "EMPLOYEE",
  });

  // QUERY: Fetch Employee Attendance History
  const { data: attendanceHistory = [], isLoading: isLoadingHistory } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendance-history", historyPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/clock?period=${historyPeriod}`);
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    enabled: !!user && user.role === "EMPLOYEE",
  });

  // QUERY: Fetch Admin Monitoring Data
  const { data: monitorData = [], isLoading: isLoadingMonitor, refetch: refetchMonitor } = useQuery<MonitorData[]>({
    queryKey: ["attendance-monitor", monitorDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/monitor?date=${monitorDate}`);
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);
      return resData.data;
    },
    enabled: !!user && (user.role === "ADMIN" || user.role === "HR"),
  });

  // Start Camera Stream
  const startCamera = async (type: "in" | "out") => {
    setActiveClockType(type);
    setIsCameraActive(true);
    setCapturedPhoto(null);
    setCameraError(null);
    
    // Request Geolocation disabled by user request

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Izin kamera ditolak. Silakan aktifkan izin kamera pada browser Anda.");
      } else {
        setCameraError("Gagal mengakses kamera. Pastikan kamera terpasang dan tidak sedang digunakan oleh aplikasi lain.");
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setActiveClockType(null);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  // Request Location Coordinates
  const requestLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolokasi tidak didukung oleh browser Anda.", "warning");
      return;
    }

    setIsRequestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsRequestingLocation(false);
      },
      (error) => {
        console.warn("Geolocation error:", error);
        setIsRequestingLocation(false);
        showToast("Gagal mengambil lokasi GPS. Presensi akan tetap disimpan tanpa koordinat.", "info");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Take Photo Snapshot
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      // Set canvas size matching the webcam preview
      canvas.width = 640;
      canvas.height = 480;
      
      // Mirror snapshot to match standard selfie view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Convert to Base64 JPEG data URL
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedPhoto(dataUrl);

      // Turn off camera stream to save resources
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
      }
    }
  };

  // Retry Snapshot
  const retrySnapshot = () => {
    setCapturedPhoto(null);
    startCamera(activeClockType!);
  };

  // Submit Attendance API
  const submitAttendance = async () => {
    if (!capturedPhoto || !activeClockType) return;

    setIsSubmittingAbsen(true);
    try {
      const res = await fetch("/api/attendance/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeClockType,
          photo: capturedPhoto,
        }),
      });

      const resData = await res.json();
      if (!resData.success) throw new Error(resData.message);

      showToast(resData.message, "success");
      
      // Stop everything and close modal
      stopCamera();

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan absensi", "error");
    } finally {
      setIsSubmittingAbsen(false);
    }
  };

  // --- EXPORTS & PRINTS ---
  const handleExportCSV = (records: any[], filename = "riwayat_absensi.csv") => {
    if (records.length === 0) {
      showToast("Tidak ada data untuk diekspor", "warning");
      return;
    }

    const headers = [
      "Tanggal",
      "Jam Masuk",
      "Jam Keluar",
      "Status",
      "Device",
      "Browser",
      "IP Address",
      "Latitude",
      "Longitude",
    ];

    const csvRows = [headers.join(",")];
    for (const row of records) {
      const values = [
        `"${row.date || ""}"`,
        `"${row.clockIn ? new Date(row.clockIn).toLocaleTimeString("id-ID") : "-"}"`,
        `"${row.clockOut ? new Date(row.clockOut).toLocaleTimeString("id-ID") : "-"}"`,
        `"${row.status === "PRESENT" ? "Hadir" : row.status === "LATE" ? "Terlambat" : "Belum Absen"}"`,
        `"${row.device || "-"}"`,
        `"${row.browser || "-"}"`,
        `"${row.ipAddress || "-"}"`,
        row.latitude || "",
        row.longitude || "",
      ];
      csvRows.push(values.join(","));
    }

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSVAdmin = () => {
    const records = monitorData.map((d) => ({
      date: monitorDate,
      clockIn: d.attendance.clockIn,
      clockOut: d.attendance.clockOut,
      status: d.attendance.status,
      device: d.attendance.device,
      browser: d.attendance.browser,
      ipAddress: d.attendance.ipAddress,
      latitude: d.attendance.latitude,
      longitude: d.attendance.longitude,
      employeeName: d.employee.name,
      employeePosition: d.employee.position,
    }));

    if (records.length === 0) {
      showToast("Tidak ada data untuk diekspor", "warning");
      return;
    }

    const headers = [
      "Karyawan",
      "Jabatan",
      "Tanggal",
      "Jam Masuk",
      "Jam Keluar",
      "Status",
      "Device",
      "Browser",
      "IP Address",
      "Latitude",
      "Longitude",
    ];

    const csvRows = [headers.join(",")];
    for (const row of records) {
      const values = [
        `"${row.employeeName.replace(/"/g, '""')}"`,
        `"${row.employeePosition.replace(/"/g, '""')}"`,
        `"${row.date || ""}"`,
        `"${row.clockIn ? new Date(row.clockIn).toLocaleTimeString("id-ID") : "-"}"`,
        `"${row.clockOut ? new Date(row.clockOut).toLocaleTimeString("id-ID") : "-"}"`,
        `"${row.status === "PRESENT" ? "Hadir" : row.status === "LATE" ? "Terlambat" : "Belum Absen"}"`,
        `"${row.device || "-"}"`,
        `"${row.browser || "-"}"`,
        `"${row.ipAddress || "-"}"`,
        row.latitude || "",
        row.longitude || "",
      ];
      csvRows.push(values.join(","));
    }

    const csvString = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `monitoring_absensi_${monitorDate}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (authLoading) {
    return (
      <div className="h-[75vh] flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  // --- RENDER EMPLOYEE PORTAL ---
  if (user.role === "EMPLOYEE") {
    const isClockedIn = !!todayAttendance;
    const isClockedOut = !!todayAttendance?.clockOut;

    return (
      <div className="space-y-6">
        {/* Banner with modern premium light design */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white border border-slate-200/80 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 overflow-hidden"
        >
          {/* Decorative side accent */}
          <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none" />

          <div className="space-y-2 relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
              Sistem Presensi Selfie
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Halo, {user.employee?.name || "Karyawan"}!</h1>
            <p className="text-sm text-slate-500 max-w-md">
              Lakukan absensi masuk dan keluar secara realtime dengan menggunakan kamera web. Pastikan koordinat GPS aktif.
            </p>
          </div>

          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => handlePrintPDF()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Printer size={15} />
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={() => handleExportCSV(attendanceHistory)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download size={15} />
              <span>Ekspor CSV</span>
            </button>
          </div>
        </motion.div>

        {/* Dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Attendance Actions card */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col items-center"
            >
              <Clock className="text-blue-600 mb-3" size={36} />
              <h2 className="text-4xl font-extrabold text-slate-900 tracking-wider font-mono">
                {currentTime || "00:00:00"}
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                {currentDateStr || "Waktu Indonesia Barat"}
              </p>

              <hr className="w-full border-slate-100 my-6" />

              {/* Status Indicator */}
              <div className="w-full mb-6">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Status Presensi Hari Ini</span>
                {isClockedOut ? (
                  <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-emerald-800 text-xs font-semibold">
                    <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                    <span>Presensi selesai untuk hari ini.</span>
                  </div>
                ) : isClockedIn ? (
                  <div className="flex items-center gap-2.5 p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl text-blue-800 text-xs font-semibold">
                    <CheckCircle size={16} className="text-blue-600 shrink-0" />
                    <span>Sudah Absen Masuk {todayAttendance?.status === "LATE" && "(Terlambat)"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl text-amber-800 text-xs font-semibold">
                    <AlertCircle size={16} className="text-amber-600 shrink-0" />
                    <span>Belum melakukan presensi hari ini.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-3">
                {/* Clock In */}
                <button
                  disabled={isClockedIn || isLoadingToday}
                  onClick={() => startCamera("in")}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                    isClockedIn
                      ? "bg-slate-50 text-slate-400 border border-slate-200/50 cursor-not-allowed shadow-none"
                      : "bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5 active:translate-y-0 shadow-blue-500/10"
                  }`}
                >
                  <LogIn size={15} />
                  <span>{isClockedIn ? "Sudah Absen Masuk" : "Absen Masuk"}</span>
                </button>

                {/* Clock Out */}
                <button
                  disabled={!isClockedIn || isClockedOut || isLoadingToday}
                  onClick={() => startCamera("out")}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
                    !isClockedIn || isClockedOut
                      ? "bg-slate-50 text-slate-400 border border-slate-200/50 cursor-not-allowed shadow-none"
                      : "bg-slate-900 hover:bg-slate-800 text-white hover:-translate-y-0.5 active:translate-y-0 shadow-slate-950/10"
                  }`}
                >
                  <LogOut size={15} />
                  <span>{isClockedOut ? "Sudah Absen Keluar" : "Absen Keluar"}</span>
                </button>
              </div>
            </motion.div>

            {/* Attendance Details Card */}
            {isClockedIn && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4"
              >
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Detail Presensi Hari Ini
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Jam Masuk</span>
                    <p className="font-bold text-slate-800 mt-1">
                      {todayAttendance?.clockIn
                        ? new Date(todayAttendance.clockIn).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </p>
                    <span
                      className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                        todayAttendance?.status === "LATE"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}
                    >
                      {todayAttendance?.status === "LATE" ? "Terlambat" : "Tepat Waktu"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Jam Keluar</span>
                    <p className="font-bold text-slate-800 mt-1">
                      {todayAttendance?.clockOut
                        ? new Date(todayAttendance.clockOut).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </p>
                    <span className="inline-block mt-1.5 text-[9px] text-slate-400 font-medium">
                      {todayAttendance?.clockOut ? "Selesai" : "Belum Absen"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-3 text-[10px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={12} className="text-slate-400" />
                    <span className="truncate">{todayAttendance?.device || "-"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe size={12} className="text-slate-400" />
                    <span className="truncate">{todayAttendance?.browser || "-"}</span>
                  </div>
                  {todayAttendance?.latitude && todayAttendance?.longitude && (
                    <div className="col-span-2 flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400" />
                      <a
                        href={`https://www.google.com/maps?q=${todayAttendance.latitude},${todayAttendance.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline font-semibold font-mono"
                      >
                        {todayAttendance.latitude.toFixed(6)}, {todayAttendance.longitude.toFixed(6)} (Lihat Peta)
                      </a>
                    </div>
                  )}
                </div>

                {/* Captured Selfie Preview Row */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {todayAttendance?.fotoMasuk && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block">Foto Masuk</span>
                      <div className="relative group rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setPreviewPhotoUrl(todayAttendance.fotoMasuk)}>
                        <img src={todayAttendance.fotoMasuk} alt="Selfie Masuk" className="h-20 w-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {todayAttendance?.fotoKeluar && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 block">Foto Keluar</span>
                      <div className="relative group rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setPreviewPhotoUrl(todayAttendance.fotoKeluar)}>
                        <img src={todayAttendance.fotoKeluar} alt="Selfie Keluar" className="h-20 w-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye size={16} className="text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Attendance History */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Riwayat Kehadiran Bulanan
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Daftar presensi self-camera Anda</p>
                </div>
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                  <Calendar size={14} className="text-slate-400 ml-1.5" />
                  <input
                    type="month"
                    value={historyPeriod}
                    onChange={(e) => setHistoryPeriod(e.target.value)}
                    className="px-2 py-1 bg-transparent border-none text-xs focus:outline-none text-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold h-9">
                      <th className="py-2 pr-3">Tanggal</th>
                      <th className="py-2 px-3">Jam Masuk</th>
                      <th className="py-2 px-3">Jam Keluar</th>
                      <th className="py-2 px-3">Foto</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingHistory ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center">
                          <Loader2 size={24} className="animate-spin text-blue-600 mx-auto" />
                        </td>
                      </tr>
                    ) : attendanceHistory.length > 0 ? (
                      attendanceHistory.map((item) => (
                        <tr key={item.id} className="h-12 hover:bg-slate-50/40 transition-colors">
                          <td className="py-2 pr-3 font-semibold text-slate-800">
                            {new Date(item.clockIn!).toLocaleDateString("id-ID", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">
                            {new Date(item.clockIn!).toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="py-2 px-3 text-slate-600 font-medium">
                            {item.clockOut
                              ? new Date(item.clockOut).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex gap-1.5">
                              {item.fotoMasuk && (
                                <img
                                  src={item.fotoMasuk}
                                  alt="Selfie"
                                  onClick={() => setPreviewPhotoUrl(item.fotoMasuk)}
                                  className="w-7 h-7 object-cover rounded-lg border border-slate-200 hover:scale-110 cursor-pointer transition-transform"
                                />
                              )}
                              {item.fotoKeluar && (
                                <img
                                  src={item.fotoKeluar}
                                  alt="Selfie"
                                  onClick={() => setPreviewPhotoUrl(item.fotoKeluar)}
                                  className="w-7 h-7 object-cover rounded-lg border border-slate-200 hover:scale-110 cursor-pointer transition-transform"
                                />
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                item.status === "LATE"
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              }`}
                            >
                              {item.status === "LATE" ? "Terlambat" : "Tepat Waktu"}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Belum ada riwayat presensi pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Live Selfie Camera Modal/Overlay */}
        <AnimatePresence>
          {isCameraActive && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      Selfie Presensi {activeClockType === "in" ? "Masuk" : "Keluar"}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Silakan posisikan wajah Anda di dalam area kamera.
                    </p>
                  </div>
                  <button
                    onClick={() => stopCamera()}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
                  >
                    <XCircle size={20} />
                  </button>
                </div>

                {/* Camera View Area */}
                <div className="bg-slate-950 aspect-video relative flex items-center justify-center overflow-hidden">
                  {cameraError ? (
                    <div className="p-6 text-center text-slate-400 max-w-xs space-y-3">
                      <XCircle className="mx-auto text-rose-500" size={32} />
                      <p className="text-xs font-semibold">{cameraError}</p>
                    </div>
                  ) : capturedPhoto ? (
                    /* Photo Snapshot Preview */
                    <img
                      src={capturedPhoto}
                      alt="Pratinjau Absen"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    /* Live video stream */
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform -scale-x-100"
                      />
                      {/* Frame Guide Guideline overlay */}
                      <div className="absolute inset-0 border-[35px] border-slate-950/60 pointer-events-none flex items-center justify-center">
                        <div className="w-[300px] h-[300px] rounded-full border-2 border-dashed border-white/70 relative">
                          <div className="absolute -top-7 left-0 right-0 text-center text-white text-[10px] font-bold drop-shadow-md bg-black/40 py-1 px-2.5 rounded-full mx-auto w-max">
                            Pastikan wajah berada di dalam frame
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Status and Action Buttons */}
                <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
                  {/* Camera metadata display */}
                  <div className="flex items-center justify-end text-[10px] font-bold text-slate-400">
                    <span>Resolusi: 640x480 (JPEG)</span>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => stopCamera()}
                      disabled={isSubmittingAbsen}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Batal
                    </button>

                    {capturedPhoto ? (
                      /* Retake or Confirm */
                      <>
                        <button
                          onClick={() => retrySnapshot()}
                          disabled={isSubmittingAbsen}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <RefreshCw size={13} />
                          <span>Ulangi Foto</span>
                        </button>
                        <button
                          onClick={() => submitAttendance()}
                          disabled={isSubmittingAbsen}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                        >
                          {isSubmittingAbsen ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <CheckCircle size={13} />
                          )}
                          <span>Lanjutkan Absen</span>
                        </button>
                      </>
                    ) : (
                      /* Snap picture button */
                      <button
                        onClick={() => captureSnapshot()}
                        disabled={!!cameraError}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-blue-500/15"
                      >
                        <Camera size={15} />
                        <span>Ambil Foto</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* hidden canvas for snapshot processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Global Photo Preview Modal */}
        <AnimatePresence>
          {previewPhotoUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setPreviewPhotoUrl(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-2"
                onClick={(e) => e.stopPropagation()}
              >
                <img src={previewPhotoUrl} alt="Preview" className="w-full h-auto rounded-2xl object-contain aspect-video" />
                <button
                  onClick={() => setPreviewPhotoUrl(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // --- RENDER ADMIN MONITORING ---
  const filteredMonitorData = monitorData.filter((d) => {
    const matchesSearch =
      d.employee.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      d.employee.position.toLowerCase().includes(adminSearch.toLowerCase());
    
    if (adminStatusFilter) {
      return matchesSearch && d.attendance.status === adminStatusFilter;
    }
    return matchesSearch;
  });

  const totalHadir = monitorData.filter((d) => d.attendance.status === "PRESENT" || d.attendance.status === "LATE").length;
  const totalTerlambat = monitorData.filter((d) => d.attendance.status === "LATE").length;
  const totalBelumAbsen = monitorData.filter((d) => d.attendance.status === "ABSENT").length;

  const totalPages = Math.ceil(filteredMonitorData.length / itemsPerPage) || 1;
  const paginatedMonitorData = filteredMonitorData.slice(
    (adminCurrentPage - 1) * itemsPerPage,
    adminCurrentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Monitoring Presensi Karyawan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau foto selfie, lokasi GPS, IP address, dan tipe device karyawan secara realtime.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handlePrintPDF()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-white"
          >
            <Printer size={14} />
            <span>Cetak PDF</span>
          </button>
          <button
            onClick={() => handleExportCSVAdmin()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer bg-white"
          >
            <Download size={14} />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm no-print">
        <div className="flex items-center gap-3">
          <Calendar size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal Monitor:</span>
          <input
            type="date"
            value={monitorDate}
            onChange={(e) => {
              setMonitorDate(e.target.value);
              setAdminCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          />
        </div>
        
        <button
          onClick={() => refetchMonitor()}
          className="flex items-center justify-center gap-1.5 px-4 py-1.5 border border-blue-100 hover:bg-blue-50 text-xs font-semibold rounded-xl transition-all cursor-pointer text-blue-600 bg-blue-50/40"
        >
          <RefreshCw size={13} className={isLoadingMonitor ? "animate-spin" : ""} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Karyawan Hadir</span>
            <p className="text-3xl font-extrabold text-blue-600">{isLoadingMonitor ? "-" : totalHadir}</p>
            <p className="text-[10px] text-slate-450 font-medium">Hadir tepat waktu atau terlambat</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50 text-blue-600">
            <UserCheck size={24} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Terlambat</span>
            <p className="text-3xl font-extrabold text-amber-600">{isLoadingMonitor ? "-" : totalTerlambat}</p>
            <p className="text-[10px] text-slate-450 font-medium">Absen masuk setelah pukul 09:00 WIB</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600">
            <AlertCircle size={24} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm flex items-center justify-between"
        >
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Belum Presensi</span>
            <p className="text-3xl font-extrabold text-rose-600">{isLoadingMonitor ? "-" : totalBelumAbsen}</p>
            <p className="text-[10px] text-slate-450 font-medium">Karyawan aktif tanpa data absen hari ini</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-600">
            <XCircle size={24} />
          </div>
        </motion.div>
      </div>

      {/* Filter and Search Table Control */}
      <div className="flex flex-col md:flex-row gap-3 bg-white border border-slate-200/80 rounded-3xl p-4 shadow-sm no-print">
        <div className="relative flex-1">
          <Search size={16} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama karyawan atau jabatan..."
            value={adminSearch}
            onChange={(e) => {
              setAdminSearch(e.target.value);
              setAdminCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={adminStatusFilter}
            onChange={(e) => {
              setAdminStatusFilter(e.target.value);
              setAdminCurrentPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-semibold"
          >
            <option value="">Semua Status</option>
            <option value="PRESENT">Hadir</option>
            <option value="LATE">Terlambat</option>
            <option value="ABSENT">Belum Absen</option>
          </select>
        </div>
      </div>

      {/* Monitor Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold h-11 bg-slate-50/50">
                <th className="py-2.5 px-4">Karyawan</th>
                <th className="py-2.5 px-4">Jabatan</th>
                <th className="py-2.5 px-4">Absen Masuk</th>
                <th className="py-2.5 px-4">Absen Keluar</th>
                <th className="py-2.5 px-4">Foto Selfie</th>
                <th className="py-2.5 px-4">Device & IP Address</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingMonitor ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 size={24} className="animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : paginatedMonitorData.length > 0 ? (
                paginatedMonitorData.map(({ employee, attendance }) => (
                  <tr key={employee.id} className="hover:bg-slate-50/40 transition-colors h-14">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {employee.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {employee.position}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-650">
                      {attendance.clockIn
                        ? new Date(attendance.clockIn).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-650">
                      {attendance.clockOut
                        ? new Date(attendance.clockOut).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5">
                        {attendance.fotoMasuk && (
                          <div className="relative group w-9 h-9 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setPreviewPhotoUrl(attendance.fotoMasuk)}>
                            <img src={attendance.fotoMasuk} alt="Masuk" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={12} className="text-white" />
                            </div>
                          </div>
                        )}
                        {attendance.fotoKeluar && (
                          <div className="relative group w-9 h-9 rounded-lg overflow-hidden border border-slate-200 cursor-pointer" onClick={() => setPreviewPhotoUrl(attendance.fotoKeluar)}>
                            <img src={attendance.fotoKeluar} alt="Keluar" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye size={12} className="text-white" />
                            </div>
                          </div>
                        )}
                        {!attendance.fotoMasuk && !attendance.fotoKeluar && (
                          <span className="text-slate-400 font-medium">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {attendance.status !== "ABSENT" ? (
                        <div className="space-y-0.5 text-[10px] text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-750">{attendance.device || "-"}</span>
                            <span>•</span>
                            <span>{attendance.browser || "-"}</span>
                          </div>
                          <p className="font-mono text-[9px] text-slate-400 mt-0.5">{attendance.ipAddress || "-"}</p>
                        </div>
                      ) : (
                        <span className="text-slate-450">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                          attendance.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : attendance.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}
                      >
                        {attendance.status === "PRESENT"
                          ? "Hadir"
                          : attendance.status === "LATE"
                          ? "Terlambat"
                          : "Belum Absen"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Tidak ada data presensi karyawan yang ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {filteredMonitorData.length > itemsPerPage && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between no-print">
            <span className="text-[10px] text-slate-500 font-medium">
              Menampilkan {Math.min(filteredMonitorData.length, (adminCurrentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredMonitorData.length, adminCurrentPage * itemsPerPage)} dari {filteredMonitorData.length} data
            </span>
            <div className="flex gap-2">
              <button
                disabled={adminCurrentPage === 1}
                onClick={() => setAdminCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={adminCurrentPage === totalPages}
                onClick={() => setAdminCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Photo Preview Modal */}
      <AnimatePresence>
        {previewPhotoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setPreviewPhotoUrl(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={previewPhotoUrl} alt="Preview" className="w-full h-auto rounded-2xl object-contain aspect-video" />
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
