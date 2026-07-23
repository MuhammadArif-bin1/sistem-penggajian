import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getJakartaTodayStr() {
  const d = new Date();
  const jakartaTime = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const yyyy = jakartaTime.getFullYear();
  const mm = String(jakartaTime.getMonth() + 1).padStart(2, "0");
  const dd = String(jakartaTime.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getJakartaTodayStr();

    // Fetch all active employees
    const employees = await prisma.employee.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        position: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Fetch attendance for the specific date
    const attendances = await prisma.attendance.findMany({
      where: {
        date,
      },
    });

    // Map attendances by employeeId
    const attendanceMap = new Map(attendances.map((a) => [a.employeeId, a]));

    // Construct response data
    const data = employees.map((emp) => {
      const att = attendanceMap.get(emp.id) || null;
      return {
        employee: {
          id: emp.id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          position: emp.position.name,
        },
        attendance: att
          ? {
              id: att.id,
              clockIn: att.clockIn,
              clockOut: att.clockOut,
              status: att.status,
              fotoMasuk: att.fotoMasuk,
              fotoKeluar: att.fotoKeluar,
              device: att.device,
              browser: att.browser,
              ipAddress: att.ipAddress,
              latitude: att.latitude,
              longitude: att.longitude,
            }
          : {
              id: null,
              clockIn: null,
              clockOut: null,
              status: "ABSENT", // default status
              fotoMasuk: null,
              fotoKeluar: null,
              device: null,
              browser: null,
              ipAddress: null,
              latitude: null,
              longitude: null,
            },
      };
    });

    return NextResponse.json({
      success: true,
      message: "Monitoring absensi berhasil diambil",
      data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data monitoring absensi" },
      { status: 500 }
    );
  }
}
