const { logger } = require("./app/utils/logger/winston");

logger.info('Server is running at http://localhost:7000');
logger.info('Connected to Redis and ready to use');
logger.system('System check completed');
logger.security('New login attempt', { ip: '192.168.1.1' });
logger.performance('Hi its james');
logger.error('it is a test eror');
logger.custom('Hi its james');
logger.general('Hi its james');
