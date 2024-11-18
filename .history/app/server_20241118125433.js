const express = require("express");
const { default: mongoose } = require("mongoose");
const path = require("path");
const { AllRoutes } = require("./router/router");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const {initialSocket} = require("./utils/initSocket");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { PrismaClient } = require('@prisma/client');
const { errorHandler } = require("./http/middlewares/errorHandling.middleware");
const { securityMiddleware, commonValidationRules, bruteforce } = require("./http/middlewares/security.middleware");
const { generalRateLimiter, checkSuspiciousActivity, sensitivePathLimiter, authRateLimiter } = require("./http/middlewares/rateLimiter.middleware");
const { logger } = require("./utils/logger/winston");
const { morganMiddleware } = require("./utils/logger/morgan");
const cacheManager = require("./http/middlewares/cache.middleware");
const { AppError } = require("./http/errors/AppError");


require("dotenv").config()

module.exports = class Application {
    #app = express();
    #DB_URI;
    #PORT;
    #prisma;
    constructor(PORT, DB_URI){
        this.#PORT = PORT;
        this.#DB_URI = DB_URI;
        this.#prisma = new PrismaClient();
        this.configApplication();
        this.initRedis();
        this.connectToMongoDB();
        this.connectToMariaDB();
        this.createServer();
        this.createRoutes();
        process.on("SIGINT", async() => {
          await this.closeConnections();
          console.log("All connections closed");
          process.exit(0);
      });
  
    }
    configApplication(){
      ffmpeg.setFfmpegPath(ffmpegStatic.path);
      this.#app.use(cors({
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders: "Authorization,Content-Type"
      }));
      this.#app.use(morganMiddleware);
      // this.#app.use(loggerMiddleware);
      this.#app.use(sensitivePathLimiter);
      this.#app.use(authRateLimiter);
      this.#app.use(generalRateLimiter);
      this.#app.use(checkSuspiciousActivity);
      // this.#app.use(securityMiddleware)
      this.#app.use(express.json({limit: "50mb"}));
      this.#app.use(express.urlencoded({limit: "50mb", extended: true}));
      this.#app.use(express.static(path.join(__dirname, "..", "public")));
              // Example of protected route with validation and brute force protection
        // this.#app.post('/api/auth/login',
        //   [
        //     commonValidationRules.email,
        //     commonValidationRules.password,
        //     bruteforce.prevent
        //   ],
        //   async (req, res) => {
        //     try {
        //       const { email, password } = req.body;
        //       // Here you would typically:
        //       // 1. Validate user credentials
        //       // 2. Generate JWT token
        //       // 3. Send response
        //       res.json({
        //         status: 'success',
        //         message: 'Login successful'
        //       });
        //     } catch (error) {
        //       res.status(400).json({
        //         status: 'error',
        //         message: 'Login failed'
        //       });
        //     }
        // });

        // // Example of protected route with validation
        // this.#app.get('/api/users/:id',
        //   [
        //     commonValidationRules.id,
        //     commonValidationRules.page,
        //     commonValidationRules.limit
        //   ],
        //   async (req, res) => {
        //     try {
        //       const userId = parseInt(req.params.id);
        //       const user = await prisma.user.findUnique({
        //         where: { id: userId }
        //       });
              
        //       if (!user) {
        //         return res.status(404).json({
        //           status: 'error',
        //           message: 'User not found'
        //         });
        //       }
              
        //       res.json({
        //         status: 'success',
        //         data: user
        //       });
        //     } catch (error) {
        //       next(error);
        //     }
        // });

      // Error handling for Prisma
      // this.#app.use((err, req, res, next) => {
      //   if (err instanceof PrismaClient.PrismaClientKnownRequestError) {
      //     return res.status(400).json({
      //       status: 'error',
      //       message: 'Database operation failed'
      //     });
      //   }
      //   next(err);
      // });
      this.#app.use('/api', cacheManager.middleware({
        ttl: 3600,
        exclude: [
          '/api/auth',  // مسیرهای authentication
          '/api/admin', // پنل ادمین
          /\/api\/private.*/ // همه مسیرهای خصوصی با regex
        ],
        methods: ['GET', 'POST'],
        tags: ['api'],
        conditionalCache: (req) => {
          // مثال: cache نکردن درخواست‌های کاربران غیر لاگین
          return !!req.headers.authorization;
        },
        responseHandler: async (data) => {
          // پردازش داده قبل از ذخیره در cache
          if (Array.isArray(data)) {
            return {
              items: data,
              count: data.length,
              cached: true
            };
          }
          return data;
        }
      }));
      // مثال: endpoint برای دریافت محصولات
      this.#app.get('/api/products', 
        cacheManager.middleware({
          ttl: 1800, // 30 دقیقه
          tags: ['products']
        }),
        async (req, res) => {
          const products = await prisma.product.findMany();
          res.json(products);
        }
      );
      // مثال: بروزرسانی محصول و حذف cache
      this.#app.put('/api/products/:id', async (req, res) => {
        const { id } = req.params;
        const product = await prisma.product.update({
          where: { id: parseInt(id) },
          data: req.body
        });
        // حذف cache های مرتبط با محصولات
        await cacheManager.invalidateByTag('products');
        
        res.json(product);
      });
      // API برای مدیریت cache
      this.#app.delete('/api/cache', async (req, res) => {
        await cacheManager.clear();
        res.json({ message: 'Cache cleared successfully' });
      });
      this.#app.get('/api/cache/status', (req, res) => {
        res.json(cacheManager.getStatus());
      });

      this.#app.use("/api-doc", swaggerUI.serve, swaggerUI.setup(swaggerJsDoc({
        swaggerDefinition: {
          openapi: "3.0.0",
          info: {
            title: "Cooleh-Project",
            version: "1.0.0",
            description:"This is Cooleh-Project project swagger ui and documentation"
          },
          servers: [
            {
              url: "http://localhost:7000",
            },
            {
              url: "http://localhost:4000",
            },
          ],
          components : {
            securitySchemes : {
              BearerAuth : {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
                
              }
            }
          },
          security : [{BearerAuth : [] }]
        },
        apis: ["./app/router/**/*.js"],
      }),
      {explorer: true},
    )
  );
      // میدلور برای مسیرهای یافت نشده
      this.#app.all('*', (req, res, next) => {
        next(new AppError(404, `مسیر ${req.originalUrl} در این سرور یافت نشد`));
      });
      // میدلور مدیریت خطا باید آخرین میدلور باشد
      this.#app.use(errorHandler);
         
}

   
    createServer() {
      const http = require("http");
      const { logger } = require("./utils/logger/winston"); // مسیر فایل کانفیگ logger خود را قرار دهید
      const server = http.createServer(this.#app);

      // راه‌اندازی Socket.io
      const io = initialSocket(server);
      // شروع سرور
      server.listen(this.#PORT, () => {
        logger.info(`Server is running at http://localhost:${this.#PORT}`);
      });
      // مدیریت خطاهای سطح سرور
      server.on("error", (err) => {
        logger.error("Server Error:", err);
      });
      // مدیریت بسته‌شدن سرور
      server.on("close", () => {
        logger.info("Server is shutting down.");
      });
    }

    connectToMongoDB(){
     mongoose.connect(this.#DB_URI).then(() => {
      console.log("connected to MongoDB");
     }).catch(error =>{
      console.log(error?.message ?? "Failed to connect MongoDB");
     })
     mongoose.connection.on("connected", () =>{
      console.log("Mongoose connected to DB");
     })
     mongoose.connection.on("disconnected", () =>{
      console.log("Mongoose connection is off");
     })
     process.on("SIGINT", async() => {
      await mongoose.connection.close();
      console.log("disconnected");
      process.exit(0)
     })
    }

    async connectToMariaDB() {
      try {
          await this.#prisma.$connect();
          console.log("PrismaORM connected to MariaDB and Database is Ready to use...");
          
          // اضافه کردن event listener برای بستن اتصال MariaDB هنگام خروج
          process.on('beforeExit', async () => {
              await this.#prisma.$disconnect();
              console.log("MariaDB connection closed");
          });
      } catch (error) {
          console.error("Failed to connect to MariaDB:", error?.message);
      }
  }

  async closeConnections() {
      try {
          await Promise.all([
              this.#prisma.$disconnect(),
              mongoose.connection.close()
          ]);
          console.log("All database connections closed");
      } catch (error) {
          console.error("Error closing database connections:", error?.message);
      }
  }

    initRedis(){
      require("./utils/initRedis");
    }
    createRoutes(){
     this.#app.use(AllRoutes);
     
    }
    }