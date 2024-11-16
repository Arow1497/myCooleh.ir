const { morganMiddleware, morganFileLogger } = require('./morgan');
const logger = require('./winston');

module.exports = {
  logger,
  morganMiddleware,
  morganFileLogger
}