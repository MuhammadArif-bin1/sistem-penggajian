import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

function getJakartaDateInfo() {
  const d = new Date();
  const jakartaTime = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
  const yyyy = jakartaTime.getFullYear();
  const mm = String(jakartaTime.getMonth() + 1).padStart(2, "0");
  const dd = String(jakartaTime.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}-${mm}-${dd}`;
  const hours = jakartaTime.getHours();
  const minutes = jakartaTime.getMinutes();
  return { dateStr, hours, minutes, now: d };
}

export async function GET(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let employeeId = actor.employeeId;
    if ((actor.role === "ADMIN" || actor.role === "HR") && !employeeId) {
      // Fallback for presentation: pick the first active employee
      const firstEmp = await prisma.employee.findFirst({
        where: { status: "ACTIVE" },
      });
      if (firstEmp) {
        employeeId = firstEmp.id;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, message: "Hanya akun yang terhubung ke Karyawan yang dapat mengakses status absensi" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period"); // format: YYYY-MM

    if (period) {
      // Fetch monthly history for employee
      const attendances = await prisma.attendance.findMany({
        where: {
          employeeId: employeeId,
          date: {
            startsWith: period,
          },
        },
        orderBy: {
          date: "desc",
        },
      });
      return NextResponse.json({ success: true, data: attendances });
    }

    // Default: fetch today's status
    const { dateStr } = getJakartaDateInfo();
    const todayAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employeeId,
          date: dateStr,
        },
      },
    });

    return NextResponse.json({ success: true, data: todayAttendance });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengambil data absensi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    let employeeId = actor.employeeId;
    if ((actor.role === "ADMIN" || actor.role === "HR") && !employeeId) {
      // Fallback for presentation: pick the first active employee
      const firstEmp = await prisma.employee.findFirst({
        where: { status: "ACTIVE" },
      });
      if (firstEmp) {
        employeeId = firstEmp.id;
      }
    }

    if (!employeeId) {
      return NextResponse.json({ success: false, message: "Hanya akun yang terhubung ke Karyawan yang dapat melakukan absensi" }, { status: 400 });
    }

    const body = await request.json();
    const { type, photo } = body; // "in" or "out"

    if (type !== "in" && type !== "out") {
      return NextResponse.json({ success: false, message: "Tipe absen tidak valid (harus 'in' atau 'out')" }, { status: 400 });
    }

    if (!photo) {
      return NextResponse.json({ success: false, message: "Foto selfie wajib diambil secara realtime" }, { status: 400 });
    }

    // Process photo saving
    const base64Data = photo.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length < 5000) {
      return NextResponse.json({ success: false, message: "Foto selfie tidak valid atau terlalu kecil" }, { status: 400 });
    }

    const fileName = `${type}_${employeeId}_${Date.now()}.jpg`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "attendance");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    const photoPath = `/uploads/attendance/${fileName}`;

    // Get User Agent details
    const userAgent = request.headers.get("user-agent") || "";
    let device = "Desktop";
    if (/mobile/i.test(userAgent)) {
      device = "Mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
      device = "Tablet";
    }

    let browser = "Unknown";
    if (/chrome|crios/i.test(userAgent)) {
      browser = "Chrome";
    } else if (/firefox|fxios/i.test(userAgent)) {
      browser = "Firefox";
    } else if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) {
      browser = "Safari";
    } else if (/edge|edg/i.test(userAgent)) {
      browser = "Edge";
    }

    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    const { dateStr, hours, minutes, now } = getJakartaDateInfo();

    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: employeeId,
            date: dateStr,
          },
        },
      });

      if (type === "in") {
        if (existing) {
          throw new Error("Anda sudah melakukan absen masuk hari ini");
        }

        // Check if late (after 09:00 WIB)
        const isLate = hours > 9 || (hours === 9 && minutes > 0);
        const status = isLate ? "LATE" : "PRESENT";

        const created = await tx.attendance.create({
          data: {
            employeeId: employeeId,
            date: dateStr,
            clockIn: now,
            status,
            fotoMasuk: photoPath,
            device,
            browser,
            ipAddress,
            latitude: null,
            longitude: null,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: actor.userId,
            description: `Absen masuk pada hari ${dateStr} (${status === "LATE" ? "Terlambat" : "Tepat Waktu"})`,
            actionType: "CLOCK_IN",
          },
        });

        return { message: "Absen masuk berhasil", data: created };
      } else {
        // type === "out"
        if (!existing) {
          throw new Error("Anda harus melakukan absen masuk terlebih dahulu");
        }

        if (existing.clockOut) {
          throw new Error("Anda sudah melakukan absen keluar hari ini");
        }

        const updated = await tx.attendance.update({
          where: {
            id: existing.id,
          },
          data: {
            clockOut: now,
            fotoKeluar: photoPath,
            device,
            browser,
            ipAddress,
            latitude: null,
            longitude: null,
          },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: actor.userId,
            description: `Absen keluar pada hari ${dateStr}`,
            actionType: "CLOCK_OUT",
          },
        });

        return { message: "Absen keluar berhasil", data: updated };
      }
    });

    return NextResponse.json({ success: true, message: result.message, data: result.data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Gagal memproses absensi" },
      { status: 500 }
    );
  }
}
