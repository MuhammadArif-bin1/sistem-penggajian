import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import path from "path";
import fs from "fs";

export async function POST(request: NextRequest) {
  try {
    const actor = getAuthUser(request);
    if (!actor || (actor.role !== "ADMIN" && actor.role !== "HR")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin/HR access required" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "File foto wajib diupload" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Format file harus JPG, PNG, atau WebP" },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: "Ukuran file maksimal 2MB" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "employees");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(file.name) || ".jpg";
    const fileName = `emp_${Date.now()}_${Math.floor(Math.random() * 10000)}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const photoUrl = `/uploads/employees/${fileName}`;

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: "Foto berhasil diupload",
      data: { url: photoUrl },
    });
  } catch (error: any) {
    console.error("[UPLOAD ERROR]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Gagal mengupload foto" },
      { status: 500 }
    );
  }
}
