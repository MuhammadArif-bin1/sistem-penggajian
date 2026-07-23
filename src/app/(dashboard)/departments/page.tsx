"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Building2 } from "lucide-react";

interface Employee {
  id: string;
  department?: string | null;
}

interface DepartmentItem {
  name: string;
  count: number;
}

export default function DepartmentsPage() {
  const {
    data: employees = [],
    isLoading,
    isError,
  } = useQuery<Employee[]>({
    queryKey: ["departments-data"],
    queryFn: async () => {
      const res = await fetch("/api/employees?limit=0");
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      return data.data;
    },
  });

  const departments = React.useMemo<DepartmentItem[]>(() => {
    const map = new Map<string, number>();
    employees.forEach((employee) => {
      const department = employee.department?.trim() || "Belum Ditetapkan";
      map.set(department, (map.get(department) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Departemen
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Ringkasan departemen dan jumlah karyawan untuk setiap divisi
            perusahaan.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <Building2 size={18} />
          Total departemen: {departments.length}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold h-14 bg-slate-50">
                <th className="py-3 px-4">Departemen / Divisi</th>
                <th className="py-3 px-4">Jumlah Karyawan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-500">
                    <Loader2 size={24} className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-500">
                    Gagal memuat data departemen.
                  </td>
                </tr>
              ) : departments.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-500">
                    Belum ada karyawan dengan departemen yang tersimpan.
                  </td>
                </tr>
              ) : (
                departments.map((department) => (
                  <tr
                    key={department.name}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {department.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {department.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
