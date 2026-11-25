import { Queue } from "bullmq";
import { getRedisConnection } from "./redis.js";

let queue;
export function getInvestigationQueue() {
  if (!queue) {
    queue = new Queue("datapilot-investigations", {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 }
      }
    });
  }
  return queue;
}
