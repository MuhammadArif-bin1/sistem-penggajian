import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function updateHR() {
  const hash = await bcrypt.hash("hr1234", 10);
  const updated = await prisma.user.update({
    where: { email: "hr@payroll.com" },
    data: { passwordHash: hash },
  });
  console.log("SUCCESS: HR password updated to hr1234 for user:", updated.email);
}

updateHR()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
