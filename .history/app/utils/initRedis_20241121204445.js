const redis = require('redis');
const { logger } = require('../utils/logger/winston'); 

let redisClient; // تعریف متغیر redisClient در سطح سراسری

async function initRedis() {
    try {
        redisClient = redis.createClient({
            socket: {
                host: '127.0.0.1',
                port: 6379,
                reconnectStrategy: retries => Math.min(retries * 50, 500), // تنظیم بازگشت خودکار در صورت قطع شدن اتصال
            },
        });

        redisClient.on('error', (err) => {
            logger.error('Redis connection error:', err.message);
        });

        await redisClient.connect();
        logger.info('Connected to Redis and ready to use');
    } catch (error) {
        logger.error('Failed to connect to Redis:', error.message);
    }
}

// خروجی گرفتن از متغیر redisClient
module.exports = { initRedis, redisClient };


/*
 مدیریت بک‌آپ گیری با snapshotting و AOF
 در اینجا باید تنظیمات مربوط به پیکربندی Redis را در فایل redis.conf خود انجام دهید
 برای snapshotting و AOF

    برای مثال، این تنظیمات را در redis.conf اضافه کنید:
    
    # Snapshotting configuration
    save 900 1   # ذخیره هر ۱۵ دقیقه اگر حداقل ۱ تغییر انجام شده باشد
    save 300 10  # ذخیره هر ۵ دقیقه اگر حداقل ۱۰ تغییر انجام شده باشد
    save 60 10000 # ذخیره هر ۱ دقیقه اگر حداقل ۱۰,۰۰۰ تغییر انجام شده باشد
    
    # AOF (Append-Only File) configuration
    appendonly yes
    appendfilename "appendonly.aof"
    appendfsync everysec  # عملیات ذخیره سازی در هر ثانیه

    # می‌توانید یک cron job برای تهیه نسخه پشتیبان از فایل‌های RDB و AOF ایجاد کنید
*/
