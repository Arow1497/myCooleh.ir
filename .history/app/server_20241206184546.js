const express = require("express");
const { default: mongoose } = require("mongoose");
const path = require("path");
const { AllRoutes } = require("./routes/router");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const { createRedisClient } = require("./utils/initRedis");
const helmet = require('helmet');
const apprenticeshipSwagger = require("./routes/admin/swagger/Main/apprenticeship.swagger")
const userAuthSwagger = require("./routes/admin/swagger/Main/userAuth.swagger")
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');
const cookieParser = require('cookie-parser');
const slowDown = require('express-slow-down');
const compression = require('compression'); 
const responseTime = require('response-time');
const { initialSocket } = require("./utils/initSocket");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const { errorHandler } = require("./http/middlewares/errorHandling.middleware");
const { securityMiddleware, commonValidationRules, bruteforce } = require("./http/middlewares/security.middleware");
const { generalRateLimiter, checkSuspiciousActivity, sensitivePathLimiter, authRateLimiter } = require("./http/middlewares/rateLimiter.middleware");
const { logger, EnhancedMongoTransport } = require("./utils/logger/winston");
const { morganMiddleware } = require("./utils/logger/morgan");
const cacheManager = require("./http/middlewares/cache.middleware");
const actuator = require('express-actuator');
const statusMonitor = require('express-status-monitor');
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
        this.initRedis();
        this.createServer();
        this.handleProcessShutdown();
    }

    configApplication() {
        // Basic middleware
        this.configureBasicMiddleware();
        
        // Security middleware
        this.configureSecurityMiddleware();
        
        // Logging middleware
        this.configureLoggingMiddleware();
        
        // Configure ffmpeg
        ffmpeg.setFfmpegPath(ffmpegStatic.path);

        // Swagger documentation
        this.setupSwagger();

        // Cache middleware
        this.setupCache();

        // Health check endpoint
        this.setupHealthCheck();
    }

    configureBasicMiddleware() {
          // Compression middleware
          this.#app.use(compression({
            level: 6,
            threshold: 100 * 1024, // Only compress responses larger than 100kb
            filter: (req, res) => {
                if (req.headers['x-no-compression']) {
                    return false;
                }
                return compression.filter(req, res);
            }
        }));

        this.#app.use(express.json({ 
            limit: '10kb',
            verify: (req, res, buf) => {
                try {
                    JSON.parse(buf);
                } catch(e) {
                    res.status(400).json({ 
                        status: 'error', 
                        message: 'Invalid JSON',
                        details: 'Request body contains invalid JSON'
                    });
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

         // Application monitoring
         this.#app.use(statusMonitor({
            title: 'Server Status',
            path: '/status',
            spans: [{
                interval: 1,
                retention: 60
            }, {
                interval: 5,
                retention: 60
            }, {
                interval: 15,
                retention: 60
            }]
        }));

        // Application metrics and health endpoints
        this.#app.use(actuator({
            basePath: '/management'
        }));

    }

    
    configureSecurityMiddleware() {
        // Basic Security Headers with Helmet
        this.#app.use(helmet());

        // Content Security Policy
        const cspConfig = {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: [],
                workerSrc: ["'self'"],
                manifestSrc: ["'self'"],
                prefetchSrc: ["'self'"],
                baseUri: ["'self'"]
            }
        };
        this.#app.use(helmet.contentSecurityPolicy(cspConfig));

        // Enhanced CORS configuration
        const corsOptions = {
            origin: (origin, callback) => {
                const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
                if (!origin || allowedOrigins.indexOf(origin) !== -1) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true,
            maxAge: 86400,
            optionsSuccessStatus: 200
        };
        this.#app.use(cors(corsOptions));

        // Rate Limiters
        this.#app.use(sensitivePathLimiter);
        this.#app.use(authRateLimiter);
        this.#app.use(generalRateLimiter);
        this.#app.use(checkSuspiciousActivity);

        // Speed Limiter
        const speedLimiter = slowDown({
            windowMs: 15 * 60 * 1000, //15 دقیقه
            delayAfter: 100, // بعد از 100 درخواست، شروع به تأخیر می‌کند
            delayMs: () => 1000 // 1000 میلی‌ثانیه تأخیر برای هر درخواست اضافی
        });
        this.#app.use(speedLimiter);

        // Cookie Parser with Security Options
        this.#app.use(cookieParser(process.env.COOKIE_SECRET, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        }));

        // Data Sanitization
        this.#app.use(mongoSanitize()); // Against NoSQL Injection
        this.#app.use(xssClean()); // Against XSS
        this.#app.use(hpp()); // Prevent HTTP Parameter Pollution

        // Brute Force Protection for Login Route
        this.#app.use('/api/auth/login', bruteforce.prevent);

        // Custom Security Headers
        this.#app.use(securityMiddleware);

        // Connection Limit
        let connections = 0;
        const MAX_CONNECTIONS = 1000;
        this.#app.use((req, res, next) => {
            connections++;
            if (connections > MAX_CONNECTIONS) {
                res.status(503).json({
                    status: 'error',
                    message: 'Server is too busy. Please try again later.'
                });
                return;
            }
            res.on('finish', () => {
                connections--;
            });
            next();
        });
    }

    configureLoggingMiddleware() {
        this.#app.use(morganMiddleware);
        
        // Add response time tracking
        this.#app.use(responseTime((req, res, time) => {
            logger.info(`${req.method} ${req.url} - ${time}ms`);
        }));
    }

    setupHealthCheck() {
        this.#app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                nodeVersion: process.version,
                dbConnections: {
                    mongodb: mongoose.connection.readyState,
                    mariadb: this.#prisma ? 'Connected' : 'Disconnected'
                }
            });
        });
    }

    
setupSwagger() {
    const swaggerOptions = {
        swaggerDefinition: {
            openapi: "3.0.0",
            info: {
                title: "Cooleh-Project",
                version: "1.0.0",
                description: "This is Cooleh-Project project swagger UI and documentation"
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
            security: [{ BearerAuth: [] }],
            paths: {
                ...apprenticeshipSwagger.paths,
                ...userAuthSwagger.paths,

                // اضافه کردن مسیرهای مربوط به فایل Apprenticeship
            }
        },
        // حذف نیاز به اسکن مسیرهای دیگر در صورت استفاده از فایل خاص
        apis: []
    };

    this.#app.use(
        "/api-doc",
        swaggerUI.serve,
        swaggerUI.setup(swaggerJsDoc(swaggerOptions), { explorer: true })
    );
}

    setupCache() {
        const cacheOptions = {
            ttl: 3600,
            exclude: ['/api/auth', '/api/admin', /\/api\/private.*/],
            methods: ['GET', 'POST'],
            tags: ['api'],
            conditionalCache: (req) => !!req.headers.authorization,
            responseHandler: async (data) => {
                if (Array.isArray(data)) {
                    return {
                        items: data,
                        count: data.length,
                        cached: true
                    };
                }
                return data;
            }
        };

        this.#app.use('/api', cacheManager.middleware(cacheOptions));
        // Cache management endpoints
        this.setupCacheManagementRoutes();
    }
    setupCacheManagementRoutes() {
      this.#app.delete('/api/cache', async (req, res) => {
          await cacheManager.clear();
          res.json({ message: 'Cache cleared successfully' });
      });

      this.#app.get('/api/cache/status', (req, res) => {
          res.json(cacheManager.getStatus());
      });
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
      // Prisma Error handlers
      this.#app.use((err, req, res, next) => {
          if (err instanceof PrismaClientKnownRequestError) {
              logger.error('Prisma Known Error:', err);
              return res.status(400).json({
                  status: 'error',
                  message: 'Database operation failed',
                  code: err.code,
                  target: err.meta?.target || []
              });
          }
          
          if (err instanceof PrismaClientValidationError) {
              logger.error('Prisma Validation Error:', err);
              return res.status(400).json({
                  status: 'error',
                  message: 'Invalid data provided',
                  details: err.message
              });
          }
          
          if (err instanceof PrismaClientUnknownRequestError) {
              logger.error('Prisma Unknown Error:', err);
              return res.status(500).json({
                  status: 'error',
                  message: 'Internal server error'
              });
          }
          
          next(err);
      });
      // Enhanced catch-all error handler
      this.#app.use((err, req, res, next) => {
        const statusCode = err.statusCode || 500;
        logger.error(`Unhandled Error: ${err.message}`, {
            stack: err.stack,
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            query: req.query
        });

        res.status(statusCode).json({
            status: 'error',
            message: err.message || 'Internal Server Error',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
      });
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
            // شروع فرآیند خاموش شدن برای سیستم لاگینگ
            logger.transports.forEach(transport => {
                if (transport instanceof EnhancedMongoTransport) {
                    transport.startShutdown();
                }
            });
    
            // ثبت آخرین لاگ‌ها
            await logger.info('Starting to close all database connections...');
    
            let errors = [];
    
            // بستن اتصال Redis
            try {
                if (this.redisClient && this.redisClient.isOpen) {
                    await this.redisClient.quit();
                    await logger.info('Redis connection closed');
                }
            } catch (error) {
                errors.push({ service: 'Redis', error: error?.message || error });
            }
    
            // بستن اتصال Prisma
            try {
                await this.#prisma.$disconnect();
                await logger.info('Prisma ORM disconnected.');
            } catch (error) {
                errors.push({ service: 'Prisma', error: error?.message || error });
            }
    
            // ذخیره لاگ‌های معوق قبل از بستن اتصال مونگو
            let logsSaved = true;
            for (const transport of logger.transports) {
                if (transport instanceof EnhancedMongoTransport) {
                    logsSaved = await transport.savePendingLogs();
                    if (!logsSaved) {
                        errors.push({ service: 'Logger', error: 'Failed to save pending logs' });
                    }
                }
            }
    
            // در نهایت بستن اتصال mongoose
            try {
                if (mongoose.connection.readyState === 1) {
                    await logger.info('Closing MongoDB connection...');
                    await mongoose.connection.close();
                    await logger.info('MongoDB connection closed');
                }
            } catch (error) {
                errors.push({ service: 'MongoDB', error: error?.message || error });
            }
    
            // گزارش نتیجه نهایی
            if (errors.length > 0) {
                const errorMessage = errors.map(e => `${e.service}: ${e.error}`).join('; ');
                throw new Error(`Failed to close some connections: ${errorMessage}`);
            }
    
            await logger.info('All database connections closed successfully');
        } catch (error) {
            // استفاده از console.error برای اطمینان از نمایش خطا
            console.error('Error during shutdown:', error?.message || error);
            await logger.error('Error during shutdown:', { error: error?.message || error });
        }
    }

    async initRedis(){ 
        try {
            const redisClient = await createRedisClient();
            this.#app.set("redisClient", redisClient);
        } catch (error) {
            console.error("Error initializing Redis client:", error);
            // handle error appropriately
        }
    }
    
     // process management
     handleProcessShutdown() {
        process.on("SIGINT", async () => {
            console.log('SIGINT received. Shutting down gracefully...');
            try {
                await this.closeConnections();
            } catch (error) {
                console.error('Error during shutdown:', error);
            }
            process.exit(0);
        });
    
        process.on('SIGTERM', async () => {
            console.log('SIGTERM received. Shutting down gracefully...');
            try {
                await this.closeConnections();
            } catch (error) {
                console.error('Error during shutdown:', error);
            }
            process.exit(0);
        });
    
        process.on('unhandledRejection', (reason, promise) => {
            // Check for specific Mongoose/MongoDB related errors
            if (
                reason instanceof mongoose.Error.MongooseServerSelectionError ||
                reason instanceof mongoose.Error.DisconnectedError ||
                reason.name === 'MongoNotConnectedError' ||
                reason.name === 'MongoExpiredSessionError'
            ) {
                console.error('MongoDB connection issue:', reason);
                // Optionally exit the process
                process.exit(1);
            } else {
                console.error('Unhandled Rejection at:', promise, 'reason:', reason);
            }
        });
    
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            // Exit the process
            process.exit(1);
        });
    }

};