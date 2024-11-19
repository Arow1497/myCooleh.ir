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
    <title>پلتفرم خودرویی کوله - API</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Vazirmatn', sans-serif;
        }

        body {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 2rem;
            color: #2d3748;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(90deg, #4a90e2 0%, #357abd 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 1rem;
        }

        .content {
            padding: 2rem;
        }

        .section {
            margin-bottom: 2rem;
            padding: 1.5rem;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        }

        .section h2 {
            color: #4a90e2;
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }

        .feature-card {
            background: #f8fafc;
            padding: 1rem;
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .feature-card i {
            font-size: 1.5rem;
            color: #4a90e2;
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem;
            border-radius: 6px;
            background: #f0f9ff;
        }

        .status-item.active {
            color: #059669;
            background: #ecfdf5;
        }

        .endpoints-list {
            list-style: none;
        }

        .endpoints-list li {
            margin-bottom: 0.5rem;
            padding: 0.5rem;
            background: #f8fafc;
            border-radius: 6px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .contact-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .contact-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .contact-item i {
            color: #4a90e2;
        }

        .badge {
            background: #4a90e2;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .container {
                margin: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>پلتفرم خودرویی کوله</h1>
            <p>نسخه 1.0.0</p>
        </header>

        <main class="content">
            <section class="section">
                <h2><i class="fas fa-info-circle"></i> درباره API</h2>
                <p>API صفحه اصلی پلتفرم جامع خودرویی کوله - یک راه‌حل کامل برای مدیریت خدمات خودرویی</p>
            </section>

            <section class="section">
                <h2><i class="fas fa-star"></i> امکانات اصلی</h2>
                <div class="features-grid">
                    <div class="feature-card">
                        <i class="fas fa-box"></i>
                        <span>مدیریت محصولات</span>
                    </div>
                    <div class="feature-card">
                        <i class="fas fa-users"></i>
                        <span>مدیریت کاربران</span>
                    </div>
                    <div class="feature-card">
                        <i class="fas fa-shopping-cart"></i>
                        <span>سبد خرید</span>
                    </div>
                    <div class="feature-card">
                        <i class="fas fa-credit-card"></i>
                        <span>پرداخت آنلاین</span>
                    </div>
                    <div class="feature-card">
                        <i class="fas fa-clipboard-list"></i>
                        <span>مدیریت سفارشات</span>
                    </div>
                </div>
            </section>

            <section class="section">
                <h2><i class="fas fa-link"></i> نقاط دسترسی</h2>
                <ul class="endpoints-list">
                    <li>
                        <i class="fas fa-book"></i>
                        <span>مستندات:</span>
                        <code>/api/docs</code>
                    </li>
                    <li>
                        <i class="fas fa-heartbeat"></i>
                        <span>سلامت سیستم:</span>
                        <code>/api/health</code>
                    </li>
                    <li>
                        <i class="fas fa-chart-line"></i>
                        <span>متریک‌ها:</span>
                        <code>/api/metrics</code>
                    </li>
                </ul>
            </section>

            <section class="section">
                <h2><i class="fas fa-server"></i> وضعیت سرویس‌ها</h2>
                <div class="status-grid">
                    <div class="status-item active">
                        <i class="fas fa-database"></i>
                        <span>پایگاه داده: فعال</span>
                    </div>
                    <div class="status-item active">
                        <i class="fas fa-memory"></i>
                        <span>کش: فعال</span>
                    </div>
                    <div class="status-item active">
                        <i class="fas fa-exchange-alt"></i>
                        <span>صف پیام: در حال اجرا</span>
                    </div>
                </div>
            </section>

            <section class="section">
                <h2><i class="fas fa-address-card"></i> اطلاعات تماس</h2>
                <div class="contact-info">
                    <div class="contact-item">
                        <i class="fas fa-envelope"></i>
                        <span>ایمیل: support@example.com</span>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-globe"></i>
                        <span>وب‌سایت: example.com</span>
                    </div>
                    <div class="contact-item">
                        <i class="fas fa-book"></i>
                        <span>مستندات: docs.example.com</span>
                    </div>
                </div>
            </section>
        </main>
    </div>
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