import "dotenv/config";
import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { closeInvestigationQueue } from "./queues/investigation.queue.js";
import { closeRedisConnection } from "./queues/redis.js";

const port = Number(process.env.PORT || 4000);
const app = createApp();
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`DataPilot API listening on port ${port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; closing API gracefully`);
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  server.close(async error => {
    try {
      await closeInvestigationQueue();
      await closeRedisConnection();
      await prisma.$disconnect();
      if (error) throw error;
      clearTimeout(forceExit);
      process.exit(0);
    } catch (shutdownError) {
      console.error("API shutdown failed", shutdownError);
      process.exit(1);
    }
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
