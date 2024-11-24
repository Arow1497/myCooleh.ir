// Example content of config.js
module.exports = {
    redis: {
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: process.env.REDIS_PORT || 6379
    },
    settings: {
      attempts: 3, // Number of retry attempts
      backoff: {
        type: 'exponential',
        delay: 5000 // Initial delay in milliseconds
      }
    }
  };