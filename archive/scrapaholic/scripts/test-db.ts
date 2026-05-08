import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const product = await prisma.product.create({
    data: {
      url: "https://example.com/test-supplement",
      name: "Test Magnesium",
      brand: "TestBrand",
      category: "supplements",
      rawClaims: { claims: ["supports sleep", "muscle recovery"] },
    },
  });
  console.log("INSERT OK:", product);

  const found = await prisma.product.findFirst({ where: { id: product.id } });
  console.log("QUERY OK:", found);

  await prisma.product.delete({ where: { id: product.id } });
  console.log("CLEANUP OK: test row deleted");
}

main().finally(() => prisma.$disconnect());
