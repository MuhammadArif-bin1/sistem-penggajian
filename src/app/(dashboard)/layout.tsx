"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import {
  LayoutDashboard,
  Users,
  BriefcaseBusiness,
  Wallet,
  FileBarChart,
  User,
  UserCircle,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Bell,
  Loader2,
  CalendarCheck,
  CalendarDays,
  Clock,
  ReceiptText,
  Building2,
  Shield,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

function getNotificationsForRole(role?: string): NotificationItem[] {
  if (role === "ADMIN" || role === "HR") {
    return [
      {
        id: 1,
        title: "Presensi Baru Masuk",
        message: "muhammad arif giovanni baru saja melakukan presensi masuk.",
        time: "10m yang lalu",
        unread: true,
      },
      {
        id: 2,
        title: "Laporan Bulanan",
        message: "Laporan presensi bulanan periode Juli 2026 siap diunduh.",
        time: "1j yang lalu",
        unread: true,
      },
      {
        id: 3,
        title: "Pembayaran Payroll",
        message:
          "Sistem mendeteksi 22 karyawan terdaftar siap menerima slip gaji.",
        time: "1h yang lalu",
        unread: false,
      },
    ];
  }

  if (role === "EMPLOYEE") {
    return [
      {
        id: 1,
        title: "Slip Gaji Terbit",
        message:
          "Slip gaji untuk periode Juni 2026 telah terbit. Silakan unduh di menu Slip Gaji.",
        time: "2j yang lalu",
        unread: true,
      },
      {
        id: 2,
        title: "Presensi Sukses",
        message: "Presensi masuk Anda hari ini berhasil tercatat tepat waktu.",
        time: "4j yang lalu",
        unread: false,
      },
      {
        id: 3,
        title: "Pengumuman HRD",
        message:
          "Semua karyawan diimbau untuk melengkapi data profil terbaru.",
        time: "2h yang lalu",
        unread: false,
      },
    ];
  }

  return [];
}

interface DashboardUser {
  email: string;
  role: string;
  employee?: {
    name: string;
  } | null;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles: string[];
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

interface SidebarContentProps {
  allowedDashboardItem: boolean;
  collapsed: boolean;
  dashboardItem: NavigationItem;
  logout: () => void | Promise<void>;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
  pathname: string;
  role: string;
  user: DashboardUser;
  visibleGroups: NavigationGroup[];
}

function normalizePath(value: string) {
  const clean = value.split("?")[0];
  return clean.replace(/\/$/, "") || "/";
}

function SidebarContent({
  allowedDashboardItem,
  collapsed,
  dashboardItem,
  logout,
  onNavigate,
  onToggleCollapsed,
  pathname,
  role,
  user,
  visibleGroups,
}: SidebarContentProps) {
  const normalizedPathname = normalizePath(pathname);
  const isActive = (href: string) => normalizePath(href) === normalizedPathname;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/80 shadow-[1px_0_10px_rgba(0,0,0,0.03)] transition-colors duration-200">
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/80 bg-white/90">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="min-w-[32px] w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
            <Wallet size={16} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-semibold text-sm text-slate-800 truncate">
                Sistem Penggajian
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.25em]">
                HRIS Panel
              </p>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapsed}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 cursor-pointer transition-all"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="flex-1 py-4 px-3 overflow-y-auto">
        {allowedDashboardItem && (
          <Link
            href={dashboardItem.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 h-11 px-3.5 rounded-xl text-sm transition-all duration-200 ${
              isActive(dashboardItem.href)
                ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/25"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
            }`}
          >
            <LayoutDashboard
              size={18}
              className={`transition-colors shrink-0 ${isActive(dashboardItem.href) ? "text-white" : "text-slate-400 group-hover:text-blue-600"}`}
            />
            {!collapsed && <span>Dashboard</span>}
          </Link>
        )}

        {visibleGroups.map((group) => (
          <div key={group.title} className="mt-4 first:mt-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3.5 mb-2 mt-4 select-none">
              {group.title}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 h-11 px-3.5 rounded-xl text-sm transition-all duration-200 ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-sm shadow-blue-600/25"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`transition-colors shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-blue-600"}`}
                    />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-slate-200/80 bg-white/80">
        {!collapsed && (
          <div className="mb-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-semibold text-sm shrink-0">
                {user.employee?.name?.charAt(0) ||
                  user.email.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user.employee?.name || "Administrator"}
                </p>
                <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700 mt-1">
                  {role}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 h-11 px-3.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-blue-600 cursor-pointer transition-all"
        >
          <LogOut size={17} className="text-slate-400 transition-colors" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationReadState, setNotificationReadState] = useState<
    Record<string, boolean>
  >({});
  const hasRedirectedToLogin = useRef(false);

  useEffect(() => {
    if (!loading && !user && !hasRedirectedToLogin.current) {
      hasRedirectedToLogin.current = true;
      router.replace("/login");
    }
  }, [loading, user, router]);

  const notifications = useMemo(() => {
    return getNotificationsForRole(user?.role).map((notification) => {
      const key = `${user?.role ?? "guest"}:${notification.id}`;
      return {
        ...notification,
        unread: notificationReadState[key] ?? notification.unread,
      };
    });
  }, [notificationReadState, user?.role]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    setNotificationReadState((prev) => ({
      ...prev,
      ...Object.fromEntries(
        notifications.map((notification) => [
          `${user?.role ?? "guest"}:${notification.id}`,
          false,
        ])
      ),
    }));
  };

  const toggleReadStatus = (id: number) => {
    const current = notifications.find((notification) => notification.id === id);
    if (!current) return;

    setNotificationReadState((prev) => ({
      ...prev,
      [`${user?.role ?? "guest"}:${id}`]: !current.unread,
    }));
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const role = user.role;

  const dashboardItem: NavigationItem = {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "HR", "EMPLOYEE"],
  };

  const navigationGroups: NavigationGroup[] = [
    {
      title: "MASTER DATA",
      items: [
        {
          name: "Karyawan",
          href: "/employees",
          icon: Users,
          roles: ["ADMIN", "HR"],
        },
        {
          name: "Departemen",
          href: "/departments",
          icon: Building2,
          roles: ["ADMIN", "HR"],
        },
        {
          name: "Jabatan",
          href: "/positions",
          icon: BriefcaseBusiness,
          roles: ["ADMIN", "HR"],
        },
      ],
    },
    {
      title: "KEHADIRAN",
      items: [
        {
          name: "Absensi",
          href: "/absensi",
          icon: CalendarCheck,
          roles: ["ADMIN", "HR", "EMPLOYEE"],
        },
        {
          name: "Cuti",
          href: "/cuti",
          icon: CalendarDays,
          roles: ["ADMIN", "HR", "EMPLOYEE"],
        },
        {
          name: "Lembur",
          href: "/absensi/lembur",
          icon: Clock,
          roles: ["ADMIN", "HR", "EMPLOYEE"],
        },
      ],
    },
    {
      title: "PENGGAJIAN",
      items: [
        {
          name: "Penggajian",
          href: "/penggajian",
          icon: Wallet,
          roles: ["ADMIN", "HR"],
        },
        {
          name: "Slip Gaji",
          href: "/slips",
          icon: ReceiptText,
          roles: ["ADMIN", "HR", "EMPLOYEE"],
        },
      ],
    },
    {
      title: "LAPORAN",
      items: [
        {
          name: "Laporan",
          href: "/reports",
          icon: FileBarChart,
          roles: ["ADMIN", "HR"],
        },
      ],
    },
    {
      title: "AKUN",
      items: [
        {
          name: "Profil",
          href: "/profile",
          icon: UserCircle,
          roles: ["ADMIN", "HR", "EMPLOYEE"],
        },
      ],
    },
    {
      title: "PENGATURAN",
      items: [
        {
          name: "Pengaturan",
          href: "/settings",
          icon: Settings,
          roles: ["ADMIN"],
        },
      ],
    },
  ];

  const allowedDashboardItem = dashboardItem.roles.includes(role);
  const visibleGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);

  const sidebarProps: SidebarContentProps = {
    allowedDashboardItem,
    collapsed,
    dashboardItem,
    logout,
    onNavigate: () => setMobileOpen(false),
    onToggleCollapsed: () => setCollapsed((current) => !current),
    pathname,
    role,
    user,
    visibleGroups,
  };

  return (
    <div className="h-screen overflow-hidden flex bg-gradient-to-tr from-[#FFF5E6] via-[#FFFDF9] to-[#F1F5F9] font-sans antialiased text-[#0F172A] relative transition-colors duration-300">
      {/* Decorative Glow Orbs for Premium White-Orange Depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-orange-400/10 blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[35%] left-[15%] w-[35%] h-[35%] rounded-full bg-amber-400/5 blur-[140px] pointer-events-none -z-10" />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 z-30 h-screen shrink-0 ${
          collapsed ? "w-18" : "w-64"
        }`}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="md:hidden fixed inset-0 bg-black z-40"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-64 z-50 h-full"
            >
              <SidebarContent {...sidebarProps} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md z-20 flex-shrink-0 flex items-center justify-between px-5 md:px-7 transition-all duration-300 shadow-sm shadow-slate-100/50 no-print">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200/60 text-slate-600 cursor-pointer"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3.5">
            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 relative cursor-pointer transition-colors"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-40"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">
                          Notifikasi
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-[10px] font-bold text-orange-600 hover:underline cursor-pointer"
                          >
                            Tandai semua dibaca
                          </button>
                        )}
                      </div>
                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                        {notifications.length > 0 ? (
                          notifications.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => toggleReadStatus(item.id)}
                              className={`p-4 text-left transition-colors cursor-pointer relative group ${
                                item.unread
                                  ? "bg-orange-500/5 hover:bg-orange-500/10"
                                  : "hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <p
                                  className={`text-xs font-bold text-slate-800 ${item.unread ? "pr-3" : ""}`}
                                >
                                  {item.title}
                                </p>
                                <span className="text-[9px] text-slate-400 shrink-0 mt-0.5">
                                  {item.time}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                                {item.message}
                              </p>
                              {item.unread && (
                                <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-orange-600 rounded-full" />
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Tidak ada notifikasi baru
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white font-extrabold flex items-center justify-center shadow-md shadow-blue-500/10 cursor-pointer hover:opacity-95 transition-all"
              >
                {user.employee?.name?.charAt(0) ||
                  user.email.charAt(0).toUpperCase()}
              </button>

              <AnimatePresence>
                {showProfileDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowProfileDropdown(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-lg p-2 z-20"
                    >
                      <div className="px-3.5 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {user.employee?.name || "Administrator"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5">
                          {user.email}
                        </p>
                      </div>
                      <div className="p-1 space-y-0.5">
                        <Link
                          href="/profile"
                          onClick={() => setShowProfileDropdown(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-blue-50/50 hover:text-blue-600 rounded-xl transition-colors"
                        >
                          <User size={14} />
                          <span>Profil Saya</span>
                        </Link>
                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors text-left"
                        >
                          <LogOut size={14} />
                          <span>Keluar</span>
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-5 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
