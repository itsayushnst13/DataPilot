import IORedis from "ioredis";
let redisConnection;
export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: true
    });
  }
  return redisConnection;
}
