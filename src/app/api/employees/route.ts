import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/services/EmployeeService";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const positionId = searchParams.get("positionId") || undefined;
    const bankName = searchParams.get("bankName") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const result = await employeeService.getEmployees(
      { search, status, positionId, bankName },
      page,
      limit,
    );
    return NextResponse.json({
      success: true,
      message: "Data karyawan berhasil diambil",
      data: result.items,
      meta: result.meta,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil data karyawan",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const employee = await employeeService.createEmployee(body, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Karyawan berhasil ditambahkan",
      data: employee,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal menambahkan karyawan",
      },
      { status: 400 },
    );
  }
}
