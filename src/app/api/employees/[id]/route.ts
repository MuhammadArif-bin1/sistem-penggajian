import { NextRequest, NextResponse } from "next/server";
import { employeeService } from "@/services/EmployeeService";
import { getAuthUser } from "@/lib/auth";

type Params = Promise<{ id: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params;
    const employee = await employeeService.getEmployeeById(id);
    return NextResponse.json({
      success: true,
      message: "Detail karyawan berhasil diambil",
      data: employee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil detail karyawan" },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const employee = await employeeService.updateEmployee(id, body, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Data karyawan berhasil diperbarui",
      data: employee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memperbarui data karyawan" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const employee = await employeeService.deleteEmployee(id, actor.userId);

    return NextResponse.json({
      success: true,
      message: "Karyawan berhasil dihapus",
      data: employee,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal menghapus karyawan" },
      { status: 400 }
    );
  }
}
