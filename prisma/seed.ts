import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { hashPassword } from "better-auth/crypto";
import { env } from "../src/env.js";

const ADMIN_EMAIL = "christian.sulit@kmc.solutions";
const ADMIN_NAME = "Christian Angelo M Sulit";

const ORG_NAME = "KMC Solutions";
const ORG_SLUG = "kmc-solutions";

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = createPrismaClient();

  const adminPassword = env.SEED_ADMIN_PASSWORD;

  if (!adminPassword || adminPassword.length < 8) {
    console.error(
      "SEED_ADMIN_PASSWORD env var is required (min 8 characters). Set it in your .env file."
    );
    process.exit(1);
  }

  console.log("Starting database seed...\n");

  // 1. Create or find admin user
  let user = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        emailVerified: true,
        role: "admin",
      },
    });
    console.log(`Created admin user: ${user.email} (id: ${user.id})`);
  } else {
    console.log(`Admin user already exists: ${user.email} (id: ${user.id})`);
  }

  // 2. Ensure role is admin and email is verified
  if (user.role !== "admin" || !user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin", emailVerified: true },
    });
    console.log("Updated user role to admin");
  }

  // 3. Create credential account if not exists
  const existingAccount = await prisma.account.findFirst({
    where: {
      userId: user.id,
      providerId: "credential",
    },
  });

  if (!existingAccount) {
    const hashedPassword = await hashPassword(adminPassword);
    await prisma.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        password: hashedPassword,
        userId: user.id,
      },
    });
    console.log("Created credential account with password");
  } else {
    console.log("Credential account already exists");
  }

  // 4. Create organization
  let org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: ORG_NAME,
        slug: ORG_SLUG,
      },
    });
    console.log(`Created organization: ${org.name} (id: ${org.id})`);
  } else {
    console.log(`Organization already exists: ${org.name} (id: ${org.id})`);
  }

  // 5. Add user as owner of the organization
  const existingMember = await prisma.member.findFirst({
    where: {
      userId: user.id,
      organizationId: org.id,
    },
  });

  if (!existingMember) {
    await prisma.member.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    });
    console.log(`Added user as owner of ${org.name}`);
  } else {
    console.log(`User already a member of ${org.name} (role: ${existingMember.role})`);
  }

  console.log("\nSeed complete!");
  console.log("\nAdmin credentials:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  Role:     admin`);
  console.log(`  Org:      ${ORG_NAME} (${ORG_SLUG})`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
