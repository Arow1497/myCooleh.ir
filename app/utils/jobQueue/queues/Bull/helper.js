// Example content of helper.js
function logJobDetails(job) {
    console.log(`Job ${job.id} started with data:`, job.data);
  }
  
  module.exports = {
    logJobDetails
  };