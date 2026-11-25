import "dotenv/config";
import { Worker } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { getRedisConnection } from "../queues/redis.js";
import { runInvestigation } from "../services/investigation.js";

const worker = new Worker("datapilot-investigations", async job => {
  await prisma.investigation.update({
    where: { id: job.data.investigationId },
    data: { status: "RUNNING", error: null, startedAt: new Date() }
  });
  await runInvestigation(job.data.investigationId);
}, { connection: getRedisConnection(), concurrency: 3 });

worker.on("completed", job => console.log("Investigation completed:", job.data.investigationId));
worker.on("failed", async (job, error) => {
  console.error("Investigation attempt failed:", job?.data?.investigationId, error.message);
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    await prisma.investigation.update({
      where: { id: job.data.investigationId },
      data: { status: "FAILED", error: error.message.slice(0, 500), completedAt: new Date() }
    }).catch(console.error);
  }
});
worker.on("error", error => console.error("Investigation worker error:", error));
console.log("DataPilot investigation worker started");
