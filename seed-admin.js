const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  const user = await prisma.user.upsert({
    where: { email: "superadmin@erp.com" },
    update: {},
    create: {
      email: "superadmin@erp.com",
      name: "Super Admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      loginId: "SUPERADMIN",
      isActive: true,
    },
  });

  console.log("Superadmin created successfully:", user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());