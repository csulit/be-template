import "dotenv/config";
import { defineConfig, env } from "prisma/config";

type Env = {
  DATABASE_URL: string;
};

export default defineConfig({
  // Points to folder - Prisma recursively searches for all *.prisma files
  // Includes: ./schema.prisma and ./models/*.prisma
  schema: ".",
  migrations: {
    path: "./migrations",
  },
  datasource: {
    url: env<Env>("DATABASE_URL"),
  },
});
