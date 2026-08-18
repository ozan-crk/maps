import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const rawUrl = process.env.DATABASE_URL || "mysql://user:userpassword@localhost:3306/harita";
let mariadbUrl = rawUrl.replace(/^mysql:\/\//, "mariadb://");
if (!mariadbUrl.includes("allowPublicKeyRetrieval")) {
  mariadbUrl += (mariadbUrl.includes("?") ? "&" : "?") + "allowPublicKeyRetrieval=true";
}
const adapter = new PrismaMariaDb(mariadbUrl);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
