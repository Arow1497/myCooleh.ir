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
const { morganMiddleware } = require("./utils/logger/morgan");
const cacheManager = require("./http/middlewares/cache.middleware");
const { AppError } = require("./http/errors/AppError");
const { logger } = require("./utils/logger/winston");

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
        this.createRoutes(); // Moved before server creation
        this.connectToMongoDB();
        this.connectToMariaDB();
        this.createServer();
        
        this.handleProcessShutdown();
    }

    configApplication() {
        // Basic middleware
        this.#app.use(cors({
            origin: "*",
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
            allowedHeaders: "Authorization,Content-Type"
        }));
        this.#app.use(express.json({ limit: "50mb" }));
        this.#app.use(express.urlencoded({ limit: "50mb", extended: true }));
        this.#app.use(express.static(path.join(__dirname, "..", "public")));
        
        // Logging middleware
        this.#app.use(morganMiddleware);

        // Configure ffmpeg
        ffmpeg.setFfmpegPath(ffmpegStatic.path);

        // Swagger documentation
        this.setupSwagger();

        // Cache middleware
        this.setupCache();
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
    }

    createRoutes() {
        // API routes
        this.#app.use('/api', AllRoutes);

        // 404 handler
        this.#app.all('*', (req, res, next) => {
            next(new AppError(404, `مسیر ${req.originalUrl} در این سرور یافت نشد`));
        });

        // Error handlers
        this.#app.use((err, req, res, next) => {
            if (err instanceof PrismaClient.PrismaClientKnownRequestError) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Database operation failed'
                });
            }
            next(err);
        });

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
    }

    initRedis() {
        require("./utils/initRedis");
    }
};