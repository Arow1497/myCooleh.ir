const Queue = require('bull');

const imageProcessingQueue = new Queue('image processing', {
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379
  }
});

module.exports = imageProcessingQueue;