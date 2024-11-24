// Example content of dashboard.js
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const imageProcessingQueue = require('./index'); // Assuming index.js exports the queue instance

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullAdapter(imageProcessingQueue)
  ],
  serverAdapter: serverAdapter,
});

// ... (Code to mount the serverAdapter on your Express app)