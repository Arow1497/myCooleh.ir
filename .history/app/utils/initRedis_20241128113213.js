const redisDB = require("redis");
const { logger } = require("../utils/logger/winston");
const retry = require("async-retry");

async function createRedisClient() {
  const redisClient = redisDB.createClient({
    socket: {
      host: process.env.REDIS_HOST || "localhost", // از متغیر محیطی استفاده کنید
      port: process.env.REDIS_PORT || 6379, // از متغیر محیطی استفاده کنید
      tls: process.env.REDIS_TLS === "true", // از متغیر محیطی استفاده کنید
    },
    password: process.env.REDIS_PASSWORD, // از متغیر محیطی استفاده کنید
    retry_strategy: function (options) {
      if (options.error && options.error.code === "ECONNREFUSED") {
        logger.error("The server refused the connection");
        return new Error("The server refused the connection");
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        logger.error("Retry time exhausted");
        return new Error("Retry time exhausted");
      }
      if (options.attempt > 10) {
        logger.error("Max retry attempts reached");
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000); // Retrying after 100ms, 200ms, 300ms...
    },
  });

  redisClient.on("connect", () => logger.info("connected to redis"));

  redisClient.on("ready", () => logger.info("connected to redis and ready to use"));

  redisClient.on("error", (err) => logger.error("RedisError: ", err.message));

  redisClient.on("end", () => logger.error("disconnected from redis"));

  await retry(
    async (bail) => {
      await redisClient.connect();
    },
    {
      retries: 5,
      minTimeout: 1000,
      onRetry: (err, attempt) => {
        logger.warn(`Retry connecting to Redis, attempt ${attempt}: ${err.message}`);
      },
    }
  );

  return redisClient;
}

module.exports = { createRedisClient };



/*
const redisDB = require("redis");
const {logger} = require("../utils/logger/winston")
const redisClient = redisDB.createClient();
redisClient.connect();
redisClient.on("connect", () => logger.info("connected to redis"));
redisClient.on("ready", () => logger.info("connected to redis and ready to use"));
redisClient.on("error", (err) => logger.error("RedisError: ", err.message));
redisClient.on("end", () => logger.error("disconected from redis"));

module.exports = {redisClient}
*/