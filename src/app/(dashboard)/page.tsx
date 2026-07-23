"use client";

import React from "react";
import { useAuth } from "@/components/AuthContext";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Loader2 } from "lucide-react";

export default function HomeDashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) return null;

  if (user.role === "ADMIN" || user.role === "HR") {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
}
