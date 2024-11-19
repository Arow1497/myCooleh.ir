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
        @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Vazirmatn', sans-serif;
        }

        body {
            background-color: #f8fafc;
            min-height: 100vh;
            color: #1e293b;
            line-height: 1.6;
        }

        .navbar {
            background: white;
            padding: 1rem 2rem;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: fixed;
            width: 100%;
            top: 0;
            z-index: 1000;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: 700;
            color: #0284c7;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .nav-links {
            display: flex;
            gap: 2rem;
        }

        .nav-links a {
            color: #64748b;
            text-decoration: none;
            font-weight: 500;
            transition: color 0.2s;
        }

        .nav-links a:hover {
            color: #0284c7;
        }

        .hero {
            padding: 8rem 2rem 4rem;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4rem;
        }

        .hero-content {
            max-width: 600px;
        }

        .hero h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 1rem;
        }

        .hero p {
            color: #475569;
            font-size: 1.125rem;
            margin-bottom: 2rem;
        }

        .hero-image {
            flex-shrink: 0;
            width: 400px;
            height: 400px;
            background-image: url('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800');
            background-size: cover;
            background-position: center;
            border-radius: 2rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }

        .section {
            background: white;
            border-radius: 1rem;
            padding: 2rem;
            margin-bottom: 2rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }

        .section h2 {
            font-size: 1.5rem;
            color: #0f172a;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .section h2 i {
            color: #0284c7;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 1.5rem;
        }

        .feature-card {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 1rem;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #e2e8f0;
        }

        .feature-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.05);
        }

        .feature-card i {
            font-size: 2rem;
            color: #0284c7;
            margin-bottom: 1rem;
        }

        .feature-card h3 {
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
            color: #0f172a;
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            border-radius: 0.75rem;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
        }

        .status-item i {
            font-size: 1.5rem;
            color: #0284c7;
        }

        .status-item.active {
            background: #f0fdf4;
            border-color: #86efac;
        }

        .status-item.active i {
            color: #16a34a;
        }

        .contact-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .contact-item {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.5rem;
            background: #f8fafc;
            border-radius: 0.75rem;
            border: 1px solid #e2e8f0;
        }

        .contact-item i {
            font-size: 1.5rem;
            color: #0284c7;
        }

        @media (max-width: 768px) {
            .hero {
                flex-direction: column;
                text-align: center;
                padding: 6rem 1rem 2rem;
            }

            .hero-image {
                width: 100%;
                height: 300px;
            }

            .nav-links {
                display: none;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <div class="logo">
            <i class="fas fa-car"></i>
            پلتفرم خودرویی کوله
        </div>
        <div class="nav-links">
            <a href="#features">امکانات</a>
            <a href="#status">وضعیت</a>
            <a href="#contact">تماس</a>
        </div>
    </nav>

    <section class="hero">
        <div class="hero-content">
            <h1>پلتفرم جامع خودرویی کوله</h1>
            <p>راه‌حلی هوشمند و یکپارچه برای مدیریت خدمات خودرویی با API های قدرتمند و زیرساخت مطمئن</p>
            <div class="badge">نسخه 1.0.0</div>
        </div>
        <div class="hero-image"></div>
    </section>

    <div class="container">
        <section id="features" class="section">
            <h2><i class="fas fa-star"></i> امکانات اصلی</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <i class="fas fa-box"></i>
                    <h3>مدیریت محصولات</h3>
                    <p>مدیریت کامل کاتالوگ محصولات و خدمات</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-users"></i>
                    <h3>مدیریت کاربران</h3>
                    <p>سیستم جامع مدیریت کاربران و سطوح دسترسی</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-shopping-cart"></i>
                    <h3>سبد خرید</h3>
                    <p>سیستم سبد خرید پیشرفته با امکانات متنوع</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-credit-card"></i>
                    <h3>پرداخت آنلاین</h3>
                    <p>درگاه‌های پرداخت متنوع و امن</p>
                </div>
            </div>
        </section>

        <section id="status" class="section">
            <h2><i class="fas fa-server"></i> وضعیت سرویس‌ها</h2>
            <div class="status-grid">
                <div class="status-item active">
                    <i class="fas fa-database"></i>
                    <div>
                        <h3>پایگاه داده</h3>
                        <p>در حال کار</p>
                    </div>
                </div>
                <div class="status-item active">
                    <i class="fas fa-memory"></i>
                    <div>
                        <h3>کش</h3>
                        <p>فعال</p>
                    </div>
                </div>
                <div class="status-item active">
                    <i class="fas fa-exchange-alt"></i>
                    <div>
                        <h3>صف پیام</h3>
                        <p>در حال اجرا</p>
                    </div>
                </div>
            </div>
        </section>

        <section id="contact" class="section">
            <h2><i class="fas fa-address-card"></i> اطلاعات تماس</h2>
            <div class="contact-grid">
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <h3>ایمیل پشتیبانی</h3>
                        <p>support@example.com</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-globe"></i>
                    <div>
                        <h3>وب‌سایت</h3>
                        <p>example.com</p>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-book"></i>
                    <div>
                        <h3>مستندات</h3>
                        <p>docs.example.com</p>
                    </div>
                </div>
            </div>
        </section>
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