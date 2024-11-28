const redisDB = require("redis");
const { logger } = require("../utils/logger/winston");
const retry = require("async-retry");

async function createRedisClient() {
  const redisClient = redisDB.createClient({
    socket: {
      host: "localhost",
      port: 6379,
    },
    password: process.env.REDIS_PASSWORD,
    retry_strategy: function (options) {
        if (options.error && options.error.code === "ECONNREFUSED") {
            logger.error("The server refused the connection");
            return new Error("The server refused the connection");
        }
        if (options.attempt > 3) { 
            logger.error("Max retry attempts reached");
            return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
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