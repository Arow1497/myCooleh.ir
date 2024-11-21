const express = require("express");
const { default: mongoose } = require("mongoose");
const path = require("path");
const { AllRoutes } = require("./routes/router");
const morgan = require("morgan");
const createHttpError = require("http-errors");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const errorHandler = require('./http/middlewares/errorHandling.middleware');
const logger = require('./utils/logger/winston');
require("dotenv").config();

module.exports = class Application {
    #app = express();
    #DB_URI;
    #PORT;
    constructor(PORT, DB_URI){
        this.#PORT = PORT;
        this.#DB_URI = DB_URI;
        this.configApplication();
        this.initRedis();
        this.connectToMongoDB();
        this.createServer();
        this.createRoutes();
        this.errorHandling();
    }

    configApplication(){
        this.#app.use(cors());
        this.#app.use(morgan("dev"));
        this.#app.use(express.json());
        this.#app.use(express.urlencoded({extended: true}));
        this.#app.use(express.static(path.join(__dirname, "..", "public")));
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
        ));
    }

    createServer(){
        const http = require("http");
        const server = http.createServer(this.#app);
        
        server.listen(this.#PORT, () => {
            logger.info(`Server running on http://localhost:${this.#PORT}`);
        });

        server.on('error', (error) => {
            logger.error('Server Error:', error);
        });
    }

    connectToMongoDB(){
        mongoose.connect(this.#DB_URI)
            .then(() => {
                logger.info("Connected to MongoDB");
            })
            .catch(error => {
                logger.error("MongoDB Connection Error:", error);
            });

        mongoose.connection.on("connected", () => {
            logger.info("Mongoose connected to DB");
        });

        mongoose.connection.on("disconnected", () => {
            logger.warn("Mongoose connection is disconnected");
        });

        process.on("SIGINT", async() => {
            await mongoose.connection.close();
            logger.info("Mongoose connection closed through app termination");
            process.exit(0);
        });
    }

    initRedis(){
        require("./utils/init.redis");
    }

    createRoutes(){
        this.#app.use(AllRoutes);
    }

    errorHandling(){
        // 404 handler
        this.#app.use((req, res, next) => {
            next(createHttpError.NotFound("Route not found"));
        });

        // Global error handler
        this.#app.use(errorHandler);
    }
}