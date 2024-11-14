const express = require("express");
const { default: mongoose } = require("mongoose");
const path = require("path");
const { AllRoutes } = require("./router/router");
const morgan = require("morgan");
const creatHttpError = require("http-errors");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const {initialSocket} = require("./utils/initSocket");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");

require("dotenv").config()

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
      ffmpeg.setFfmpegPath(ffmpegStatic.path);
      this.#app.use(cors({
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders: "Authorization,Content-Type"
      }));
      this.#app.use(morgan("dev"));
      this.#app.use(express.json({limit: "50mb"}));
      this.#app.use(express.urlencoded({limit: "50mb", extended: true}));
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
    )
  );
}

    createServer(){
      const http = require("http");
      const server = http.createServer(this.#app);
      const io = initialSocket(server);
      server.listen(this.#PORT, () => {
        console.log("run > http://localhost" + " " + this.#PORT);
    })
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

    initRedis(){
      require("./utils/initRedis");
    }
    createRoutes(){
     this.#app.use(AllRoutes);
     
    }

    errorHandling(){
       this.#app.use((req,res,next) => {
        next(creatHttpError.NotFound("آدرس مورد نظر یافت نشد"));
       });
       this.#app.use((error, req, res, next) =>{
        const serverError = creatHttpError.InternalServerError();
        const statusCode = error.status || serverError.status;
        const message = error.message || serverError.message;
        return res.status(statusCode).json({
          statusCode,
         errors:{
          message,
          
         }
        })
    })
       }
    }