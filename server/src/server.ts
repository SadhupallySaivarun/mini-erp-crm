import app from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Mini ERP + CRM API running on http://localhost:${env.PORT}/api/v1`);
  console.log(`   Environment: ${env.NODE_ENV}`);
});

async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("Server closed. Database disconnected.");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
