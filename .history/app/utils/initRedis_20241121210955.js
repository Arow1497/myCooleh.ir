const redisDB = require("redis");
const {logger} = require("../utils/logger/winston")
const redisClient = redisDB.createClient();
redisClient.connect();
redisClient.on("connect", () => logger.info("connected to redis"));
redisClient.on("ready", () => logger.info("connected to redis and ready to use"));
redisClient.on("error", (err) => logger.error("RedisError: ", err.message));
redisClient.on("end", () => logger.error("disconected from redis"));

module.exports = {redisClient}

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
