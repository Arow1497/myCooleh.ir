const express = require("express");
const { default: mongoose } = require("mongoose");
const path = require("path");
const { AllRoutes } = require("./routes/router");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const helmet = require('helmet');
const initRedis = require('./utils/initRedis');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const slowDown = require('express-slow-down');
const { initialSocket } = require("./utils/initSocket");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { errorHandler, handleUncaughtException, handleUnhandledRejection } = require("./http/middlewares/errorHandling.middleware");
const { securityMiddleware, commonValidationRules, bruteforce } = require("./http/middlewares/security.middleware");
const { generalRateLimiter, checkSuspiciousActivity, sensitivePathLimiter, authRateLimiter } = require("./http/middlewares/rateLimiter.middleware");
const { logger } = require("./utils/logger/winston");
const { morganMiddleware } = require("./utils/logger/morgan");
const cacheManager = require("./http/middlewares/cache.middleware");
const { AppError } = require("./http/errors/AppError");
const { PrismaClient,
  Prisma: {
      PrismaClientKnownRequestError,
      PrismaClientValidationError,
      PrismaClientUnknownRequestError
  }
} = require('@prisma/client');

require("dotenv").config();

module.exports = class Application {
    #app = express();
    #DB_URI;
    #PORT;
    #prisma;

    constructor(PORT, DB_URI) {
        this.#PORT = PORT;
        this.#DB_URI = DB_URI;
        this.#prisma = new PrismaClient();
        this.configApplication();
        this.createRoutes();
        this.connectToMongoDB();
        this.connectToMariaDB();
        this.startServer();
        this.createServer();
        this.initializeErrorHandling();
    }

    configApplication() {
        // Basic middleware
        this.configureBasicMiddleware();
        
        // Logging middleware
        this.configureLoggingMiddleware();
        
        // Swagger documentation
        this.setupSwagger();

    }

    configureBasicMiddleware() {
        this.#app.use(express.json({ 
            limit: '10kb',
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf);
                } catch(e) {
                    res.status(400).json({ status: 'error', message: 'Invalid JSON' });
                    throw new Error('Invalid JSON');
                }
            }
        }));
        this.#app.use(express.urlencoded({ 
            extended: true, 
            limit: '10kb',
            parameterLimit: 50
        }));
        this.#app.use(express.static(path.join(__dirname, "..", "public")));
    }


    configureLoggingMiddleware() {
        this.#app.use(morganMiddleware);
    }

    setupSwagger() {
        const swaggerOptions = {
            swaggerDefinition: {
                openapi: "3.0.0",
                info: {
                    title: "Cooleh-Project",
                    version: "1.0.0",
                    description: "This is Cooleh-Project project swagger ui and documentation"
                },
                servers: [
                    { url: "http://localhost:7000" },
                    { url: "http://localhost:4000" }
                ],
                components: {
                    securitySchemes: {
                        BearerAuth: {
                            type: "http",
                            scheme: "bearer",
                            bearerFormat: "JWT"
                        }
                    }
                },
                security: [{ BearerAuth: [] }]
            },
            apis: ["./app/router/**/*.js"]
        };

        this.#app.use("/api-doc", 
            swaggerUI.serve, 
            swaggerUI.setup(swaggerJsDoc(swaggerOptions), { explorer: true })
        );
    }


    createRoutes() {
       // API routes
       this.#app.use('/', AllRoutes);

       // 404 handler
       this.#app.all('*', (req, res, next) => {
           next(new AppError(404, `مسیر ${req.originalUrl} در این سرور یافت نشد`));
       });

       // Error handlers
       this.setupErrorHandlers();
    }

    setupErrorHandlers() {

      // Global error handler
      this.#app.use(errorHandler);
  }

    createServer() {
        const http = require("http");
        const server = http.createServer(this.#app);
        const io = initialSocket(server);

        server.listen(this.#PORT, () => {
            logger.info(`Server is running at http://localhost:${this.#PORT}`);
        });

        server.on("error", (err) => {
            logger.error("Server Error:", err);
        });
    }

    async connectToMongoDB() {
        try {
            await mongoose.connect(this.#DB_URI);
            logger.info("Connected to MongoDB");
        } catch (error) {
            logger.error("MongoDB connection error:", error?.message);
        }
    }

    async connectToMariaDB() {
        try {
            await this.#prisma.$connect();
            logger.info("PrismaORM connected to MariaDB");
        } catch (error) {
            logger.error("MariaDB connection error:", error?.message);
        }
    }

    async closeConnections() {
        try {
            await Promise.all([
                this.#prisma.$disconnect(),
                mongoose.connection.close()
            ]);
            logger.info("All database connections closed");
        } catch (error) {
            logger.error("Error closing database connections:", error?.message);
        }
    }
    async startServer() {
        try {
            await initRedis();
        } catch (error) {
            logger.error('Redis initialization error:', error.message);
        }
    }
    
    initializeErrorHandling() {
        // حذف event listener های قبلی
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');
        
        // تنظیم event listener های جدید
        process.on('uncaughtException', handleUncaughtException);
        process.on('unhandledRejection', handleUnhandledRejection);
        
        // مدیریت graceful shutdown
        const shutdown = async (signal) => {
            try {
                logger.info(`${signal} received. Starting graceful shutdown...`);
                
                // بستن اتصال‌های دیتابیس
                await this.closeConnections();
                
                // اطمینان از ثبت تمام لاگ‌ها
                await new Promise(resolve => {
                    logger.on('finish', resolve);
                    setTimeout(resolve, 2000); // timeout برای جلوگیری از hanging
                });
                
                logger.info('Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        // تنظیم signal handlers
        ['SIGTERM', 'SIGINT'].forEach(signal => {
            process.on(signal, () => shutdown(signal));
        });
    }

 
  
};