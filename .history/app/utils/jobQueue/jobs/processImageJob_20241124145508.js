const imageProcessingQueue = require('../queues/imageProcessingQueue');
const { processImage } = require('../../path/to/your/image-processing-logic'); // مسیر درست را جایگزین کنید

imageProcessingQueue.process(async (job) => {
  try {
    await processImage(job.data);
    return Promise.resolve({ result: `Image processed successfully: ${job.data.filePath}` });
  } catch (error) {
    return Promise.reject(error);
  }
});