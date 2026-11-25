import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const investigationQueue = new Queue("datapilot-investigations", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 }
  }
});
