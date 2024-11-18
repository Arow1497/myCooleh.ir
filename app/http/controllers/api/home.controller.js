const createError = require("http-errors");
const Controller = require("../controller");

module.exports = new (class HomeController extends Controller {
  async indexPage(req, res, next) {
    try {
      // اطلاعات پایه API
      const apiInfo = {
        name: " پلتفرم خودرویی کوله", // نام پروژه
        version: "1.0.0",
        description: "API صفحه اصلی پلتفرم جامع خودرویی کوله  ",
        environment: process.env.NODE_ENV || 'development',
        
        // اطلاعات سرور
        server: {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },

        // لینک‌های مهم
        endpoints: {
          documentation: "/api/docs",
          health: "/api/health",
          metrics: "/api/metrics"
        },

        // امکانات و ویژگی‌های اصلی
        features: [
          "مدیریت محصولات",
          "مدیریت کاربران",
          "سبد خرید",
          "پرداخت آنلاین",
          "مدیریت سفارشات"
        ],

        // اطلاعات تماس و پشتیبانی
        contact: {
          email: "support@example.com",
          website: "https://example.com",
          documentation: "https://docs.example.com"
        },

        // وضعیت سرویس‌های اصلی
        services: {
          database: "connected",
          cache: "active",
          messageQueue: "running"
        }
      };

      // افزودن headers مفید
      res.set({
        'X-API-Version': apiInfo.version,
        'X-Response-Time': process.hrtime()[0],
        'Cache-Control': 'no-cache',
        'Content-Language': 'fa-IR'
      });

      // بررسی format درخواستی
      const format = req.accepts(['json', 'html']);
      
      if (format === 'html') {
        // ارسال نسخه HTML ساده
        const htmlResponse = `
          <!DOCTYPE html>
          <html dir="rtl" lang="fa">
            <head>
              <meta charset="UTF-8">
              <title>${apiInfo.name} - API</title>
            </head>
            <body>
              <h1>${apiInfo.name}</h1>
              <p>${apiInfo.description}</p>
              <h2>مستندات API</h2>
              <p>برای دسترسی به مستندات کامل به آدرس ${apiInfo.endpoints.documentation} مراجعه کنید.</p>
            </body>
          </html>
        `;
        return res.status(200).type('html').send(htmlResponse);
      }

      // ارسال پاسخ JSON به همراه وضعیت
      return res.status(200).json({
        status: "success",
        message: "Welcome to API",
        data: apiInfo
      });

    } catch (error) {
      console.error("IndexPage Error:", error);
      next(createError(500, "خطا در دریافت اطلاعات صفحه اصلی"));
    }
  }

  // متد health check برای مانیتورینگ
  async healthCheck(req, res, next) {
    try {
      const health = {
        uptime: process.uptime(),
        timestamp: Date.now(),
        status: "OK"
      };

      return res.status(200).json(health);
    } catch (error) {
      next(createError(500, "خطا در بررسی وضعیت سرور"));
    }
  }
})();