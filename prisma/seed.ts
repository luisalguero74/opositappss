import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("$aC468eUi)n7", 10);

  const admin = await prisma.user.upsert({
    where: { email: "alguero2@yahoo.com" },
    update: {},
    create: {
      email: "alguero2@yahoo.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Admin user created:", admin);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });