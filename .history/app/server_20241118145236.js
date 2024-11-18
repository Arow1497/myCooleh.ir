const express = require("express");
const { default: mongoose } = require("mongoose");
const path = require("path");
const { AllRoutes } = require("./router/router");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const { initialSocket } = require("./utils/initSocket");
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
        this.initRedis();
        this.createRoutes();
        this.connectToMongoDB();
        this.connectToMariaDB();
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
    }

    configureBasicMiddleware() {
        this.#app.use(cors({
            origin: "*",
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
            allowedHeaders: "Authorization,Content-Type"
        }));
        this.#app.use(express.json({ limit: "50mb" }));
        this.#app.use(express.urlencoded({ limit: "50mb", extended: true }));
        this.#app.use(express.static(path.join(__dirname, "..", "public")));
    }

    configureSecurityMiddleware() {
        this.#app.use(sensitivePathLimiter);
        this.#app.use(authRateLimiter);
        this.#app.use(generalRateLimiter);
        this.#app.use(checkSuspiciousActivity);
        this.#app.use(securityMiddleware);
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
        // Protected routes with validation
        this.setupProtectedRoutes();
        
        // API routes
        this.#app.use('/', AllRoutes);

        // 404 handler
        this.#app.all('*', (req, res, next) => {
            next(new AppError(404, `مسیر ${req.originalUrl} در این سرور یافت نشد`));
        });

        // Error handlers
        this.setupErrorHandlers();
    }

    setupProtectedRoutes() {
        // Login route with brute force protection
        this.#app.post('/api/auth/login',
            [
                commonValidationRules.email,
                commonValidationRules.password,
                bruteforce.prevent
            ],
            async (req, res) => {
                try {
                    const { email, password } = req.body;
                    // Authentication logic here
                    res.json({
                        status: 'success',
                        message: 'Login successful'
                    });
                } catch (error) {
                    res.status(400).json({
                        status: 'error',
                        message: 'Login failed'
                    });
                }
            }
        );

        // Protected user route with validation
        this.#app.get('/api/users/:id',
            [
                commonValidationRules.id,
                commonValidationRules.page,
                commonValidationRules.limit
            ],
            async (req, res, next) => {
                try {
                    const userId = parseInt(req.params.id);
                    const user = await this.#prisma.user.findUnique({
                        where: { id: userId }
                    });
                    
                    if (!user) {
                        return res.status(404).json({
                            status: 'error',
                            message: 'User not found'
                        });
                    }
                    
                    res.json({
                        status: 'success',
                        data: user
                    });
                } catch (error) {
                    next(error);
                }
            }
        );
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

        server.on("close", () => {
            logger.info("Server is shutting down.");
        });
    }

    async connectToMongoDB() {
        try {
            await mongoose.connect(this.#DB_URI);
            logger.info("Connected to MongoDB");

            mongoose.connection.on("connected", () => {
                logger.info("Mongoose connected to DB");
            });

            mongoose.connection.on("disconnected", () => {
                logger.info("Mongoose connection is disconnected");
            });
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

    handleProcessShutdown() {
        process.on("SIGINT", async () => {
            await this.closeConnections();
            process.exit(0);
        });

        process.on('beforeExit', async () => {
            await this.closeConnections();
        });
    }

    initRedis() {
        require("./utils/initRedis");
    }
};