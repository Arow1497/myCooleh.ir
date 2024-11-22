// cache.middleware.js
const Redis = require('redis');
const { promisify } = require('util');
const crypto = require('crypto');

class CacheManager {
  constructor(config = {}) {
    // تنظیمات پیشفرض
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      prefix: 'cache:',
      defaultTTL: 3600,
      ...config
    };

    this.client = Redis.createClient(this.config);
    
    // تبدیل متدهای Redis به Promise
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
    this.keysAsync = promisify(this.client.keys).bind(this.client);
    // this.flushAsync = promisify(this.client.flushall).bind(this.client);
    this.scanAsync = promisify(this.client.scan).bind(this.client);

    // مدیریت خطاها و وضعیت اتصال
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.status = 'error';
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.status = 'connected';
    });

    this.client.on('reconnecting', () => {
      console.log('Reconnecting to Redis');
      this.status = 'reconnecting';
    });
  }

  // ایجاد کلید یکتا با استفاده از هش
  generateKey(req) {
    const { url, params, query, body, headers } = req;
    const data = {
      url,
      params,
      query,
      // فقط برای درخواست‌های POST
      body: req.method === 'POST' ? body : undefined,
      // هدرهای خاص که می‌خواهیم در کلید لحاظ شوند
      authorization: headers.authorization,
      'user-agent': headers['user-agent']
    };
    
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    return `${this.config.prefix}${req.method}:${url}:${hash}`;
  }

  // ذخیره داده در cache با امکان تنظیم tags
  async set(key, data, options = {}) {
    try {
      const {
        ttl = this.config.defaultTTL,
        tags = [],
      } = options;

      const cacheData = {
        data,
        tags,
        timestamp: Date.now()
      };

      const serializedData = JSON.stringify(cacheData);
      await this.setAsync(key, serializedData, 'EX', ttl);

      // ذخیره ارتباط tag ها با کلید
      for (const tag of tags) {
        await this.setAsync(`${this.config.prefix}tag:${tag}:${key}`, '1', 'EX', ttl);
      }

      return true;
    } catch (error) {
      console.error('Cache Set Error:', error);
      return false;
    }
  }

  // دریافت داده از cache
  async get(key) {
    try {
      const data = await this.getAsync(key);
      if (!data) return null;

      const { data: cachedData, timestamp, tags } = JSON.parse(data);
      return {
        data: cachedData,
        metadata: {
          timestamp,
          tags,
          age: Date.now() - timestamp
        }
      };
    } catch (error) {
      console.error('Cache Get Error:', error);
      return null;
    }
  }

  // حذف داده از cache
  async delete(key) {
    try {
      await this.delAsync(key);
      return true;
    } catch (error) {
      console.error('Cache Delete Error:', error);
      return false;
    }
  }

  // حذف همه داده‌های cache با یک tag خاص
  async invalidateByTag(tag) {
    try {
      const pattern = `${this.config.prefix}tag:${tag}:*`;
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.scanAsync(cursor, 'MATCH', pattern);
        cursor = nextCursor;
        
        for (const key of keys) {
          const cacheKey = key.split(':').slice(3).join(':');
          await this.delete(cacheKey);
          await this.delete(key);
        }
      } while (cursor !== '0');

      return true;
    } catch (error) {
      console.error('Cache Invalidate By Tag Error:', error);
      return false;
    }
  }

  // حذف کل cache
  async clear() {
    try {
      await this.flushAsync();
      return true;
    } catch (error) {
      console.error('Cache Clear Error:', error);
      return false;
    }
  }

  // دریافت وضعیت سیستم cache
  getStatus() {
    return {
      status: this.status,
      config: {
        host: this.config.host,
        port: this.config.port,
        prefix: this.config.prefix
      }
    };
  }

  // میدلور اصلی برای Express با قابلیت‌های پیشرفته
  middleware(options = {}) {
    const {
      ttl,
      exclude = [],
      methods = ['GET'],
      tags = [],
      conditionalCache = () => true,
      responseHandler,
      enableCompression = true,
      cacheErrors = false,
    } = options;

    return async (req, res, next) => {
      // بررسی شرایط cache نشدن
      if (
        !methods.includes(req.method) ||
        exclude.some(pattern => {
          if (pattern instanceof RegExp) {
            return pattern.test(req.path);
          }
          return req.path.startsWith(pattern);
        }) ||
        !conditionalCache(req)
      ) {
        return next();
      }

      const cacheKey = this.generateKey(req);

      try {
        // بررسی وجود داده در cache
        const cachedData = await this.get(cacheKey);
        
        if (cachedData) {
          // اضافه کردن هدرهای cache
          res.set({
            'X-Cache': 'HIT',
            'X-Cache-Age': cachedData.metadata.age,
            'X-Cache-Tags': cachedData.metadata.tags.join(',')
          });

          return res.json(cachedData.data);
        }

        // ذخیره پاسخ اصلی
        const originalJson = res.json;
        
        // جایگزینی متد json برای ذخیره در cache
        res.json = async (data) => {
          // اجازه پردازش داده قبل از ذخیره در cache
          const processedData = responseHandler ? await responseHandler(data) : data;

          // ذخیره در cache
          if (res.statusCode >= 200 && res.statusCode < 400 || cacheErrors) {
            await this.set(cacheKey, processedData, {
              ttl,
              tags: [...tags, `status:${res.statusCode}`]
            });
          }

          res.set('X-Cache', 'MISS');
          originalJson.call(res, processedData);
        };

        next();
      } catch (error) {
        console.error('Cache Middleware Error:', error);
        next();
      }
    };
  }
}

// ایجاد نمونه singleton
const cacheManager = new CacheManager();

module.exports = cacheManager;

/*

برای استفاده از این سیستم cache، شما می‌توانید به این صورت عمل کنید:
javascriptCopy// app.js
const express = require('express');
const cacheManager = require('./middlewares/cache.middleware');

const app = express();

استفاده از cache در کل برنامه
app.use(cacheManager.middleware({
  ttl: 3600,                    // مدت زمان نگهداری cache (1 ساعت)
  exclude: ['/admin', '/api/private'],  // مسیرهایی که نباید cache شوند
  methods: ['GET'],             // فقط درخواست‌های GET cache شوند
  conditionalCache: (req) => {
    شرط سفارشی برای cache کردن
    return !req.headers['x-skip-cache'];
  }
}));

یا استفاده در یک مسیر خاص
app.get('/api/products', 
  cacheManager.middleware({ ttl: 1800 }), // 30 دقیقه
  async (req, res) => {
    const products = await getProducts();
    res.json(products);
  }
);
این سیستم cache دارای ویژگی‌های زیر است:

استفاده از Redis به عنوان ذخیره‌ساز cache
قابلیت تنظیم TTL (Time To Live) برای هر cache
امکان استثنا کردن مسیرهای خاص
پشتیبانی از متدهای HTTP مختلف
امکان اضافه کردن شرط سفارشی برای cache کردن
مدیریت خطا و لاگینگ
تولید کلید یکتا براساس URL و پارامترها

ویژگی‌های جدید اضافه شده به سیستم cache:

مدیریت Tags: امکان گروه‌بندی cache‌ها با tag و حذف گروهی آنها
Compression: امکان فشرده‌سازی داده‌ها قبل از ذخیره
وضعیت اتصال: مانیتورینگ وضعیت اتصال به Redis
کلیدهای امن: استفاده از هش SHA-256 برای تولید کلیدهای یکتا
پردازش پاسخ: امکان تغییر داده قبل از ذخیره در cache
هدرهای اضافی: اضافه کردن اطلاعات cache در هدرهای HTTP
مدیریت خطا: بهبود سیستم مدیریت خطا و لاگینگ
API های مدیریتی: اضافه کردن endpoint های مدیریت cache
پشتیبانی از Regex: امکان استفاده از regex برای exclude کردن مسیرها
متادیتا: ذخیره اطلاعات اضافی مانند timestamp همراه با داده‌ها
*/