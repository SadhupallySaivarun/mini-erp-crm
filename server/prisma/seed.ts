import { PrismaClient, Role, CustomerType, CustomerStatus } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Password@123", 10);

  const [admin, sales, warehouse, accounts] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@erpcrm.test" },
      update: {},
      create: { name: "Admin User", email: "admin@erpcrm.test", passwordHash: password, role: Role.ADMIN },
    }),
    prisma.user.upsert({
      where: { email: "sales@erpcrm.test" },
      update: {},
      create: { name: "Sales User", email: "sales@erpcrm.test", passwordHash: password, role: Role.SALES },
    }),
    prisma.user.upsert({
      where: { email: "warehouse@erpcrm.test" },
      update: {},
      create: {
        name: "Warehouse User",
        email: "warehouse@erpcrm.test",
        passwordHash: password,
        role: Role.WAREHOUSE,
      },
    }),
    prisma.user.upsert({
      where: { email: "accounts@erpcrm.test" },
      update: {},
      create: {
        name: "Accounts User",
        email: "accounts@erpcrm.test",
        passwordHash: password,
        role: Role.ACCOUNTS,
      },
    }),
  ]);

  const customer = await prisma.customer.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Rahul Traders",
      mobile: "9876543210",
      email: "rahul@traders.com",
      businessName: "Rahul Traders Pvt Ltd",
      gstNumber: "29ABCDE1234F1Z5",
      customerType: CustomerType.WHOLESALE,
      address: "12 MG Road, Bengaluru",
      status: CustomerStatus.ACTIVE,
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-001" },
    update: {},
    create: {
      name: "Steel Bolt 10mm",
      sku: "SKU-001",
      category: "Hardware",
      unitPrice: 5.5,
      currentStock: 500,
      minStockAlert: 50,
      location: "Warehouse A",
    },
  });

  await prisma.product.upsert({
    where: { sku: "SKU-002" },
    update: {},
    create: {
      name: "Steel Nut 10mm",
      sku: "SKU-002",
      category: "Hardware",
      unitPrice: 2.25,
      currentStock: 20,
      minStockAlert: 30, // intentionally low, to demo low-stock alerts
      location: "Warehouse A",
    },
  });

  console.log("✅ Seed complete.");
  console.log("Test login credentials (password for all: Password@123):");
  console.log(`  Admin:     ${admin.email}`);
  console.log(`  Sales:     ${sales.email}`);
  console.log(`  Warehouse: ${warehouse.email}`);
  console.log(`  Accounts:  ${accounts.email}`);
  console.log(`Sample customer: ${customer.name} (${customer.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
