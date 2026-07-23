import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { AuthProvider } from "@/components/AuthContext";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Sistem Penggajian Karyawan - Portal Payroll",
  description: "Aplikasi Manajemen Payroll dan Slip Gaji Karyawan Profesional",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("h-full", "antialiased", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className="min-h-full bg-slate-50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 flex flex-col font-sans transition-colors duration-200">
        <Providers>
          <AuthProvider>{children}</AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
