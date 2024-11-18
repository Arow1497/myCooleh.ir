// const redisDB = require("redis");

// const redisClient = redisDB.createClient({
//     socket: {
//         reconnectStrategy: retries => Math.min(retries * 50, 500), // تنظیم بازگشت خودکار در صورت قطع شدن اتصال
//     },
    // سایر تنظیمات مانند هاست و پورت به صورت پیش فرض اعمال می‌شود مگر اینکه نیاز به تنظیم خاصی داشته باشید
// });

// redisClient.connect();

// مدیریت رویدادها
// redisClient.on("connect", () => console.log("Connected to Redis"));
// redisClient.on("ready", () => console.log("Connected to Redis and ready to use"));
// redisClient.on("error", (err) => {
//     console.error("Redis Error: ", err.message);
    // در اینجا می‌توانید به یک سیستم ثبت لاگ متصل شوید یا ایمیل هشدار ارسال کنید
// });
// redisClient.on("end", () => console.log("Disconnected from Redis"));

// مدیریت بک‌آپ گیری با snapshotting و AOF
// در اینجا باید تنظیمات مربوط به پیکربندی Redis را در فایل redis.conf خود انجام دهید
// برای snapshotting و AOF
/*
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

// module.exports = redisClient;

const redis = require('redis');
const logger = require('../utils/logger/winston'); // مسیر دقیق logger را وارد کنید.

async function initRedis() {
    try {
        const client = redis.createClient({
            socket: {
                host: '127.0.0.1',
                port: 6379,
            },
        });

        client.on('error', (err) => {
            logger.error('Redis connection error:', err.message);
        });

        await client.connect();
        logger.info('Connected to Redis and ready to use');

        return client; // در صورت نیاز به استفاده از client
    } catch (error) {
        logger.error('Failed to connect to Redis:', error.message);
    }
}

module.exports = {initRedis};
