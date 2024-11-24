// Example content of index.js
const Queue = require('bull');
const config = require('./config');

const imageProcessingQueue = new Queue('image processing', config.redis);

module.exports = imageProcessingQueue;