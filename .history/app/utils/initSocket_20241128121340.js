const socketIO = require("socket.io");
const { verifyTokenSocket } = require("./middlewares/verifyTokenSocket"); // فرض بر وجود middleware احراز هویت
const redisAdapter = require("socket.io-redis");

function initialSocket(httpServer){
    const io = socketIO(httpServer, {
        cors: {
            origin: ["https://your-allowed-domain.com", "https://another-allowed-domain.com"], // لیست دامنه‌های مجاز
            methods: ["GET", "POST"] // متدهای مجاز
        },
        transports: ["websocket"], // فقط WebSocket مجاز است
        pingTimeout: 10000, // زمان timeout برای ping (میلی‌ثانیه)
        pingInterval: 5000, // فاصله زمانی ارسال ping (میلی‌ثانیه)
    });

    // استفاده از Redis Adapter برای scalability
    io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

    // Middleware برای احراز هویت
    io.use(verifyTokenSocket);

    // مدیریت اتصالات
    io.on("connection", (socket) => {
        console.log("A user connected", socket.id);

        // نمونه‌ای از join کردن به room
        socket.join("general");

        // نمونه‌ای از ارسال پیام به room
        io.to("general").emit("message", "Welcome to general room!");

        // مدیریت قطع اتصال
        socket.on("disconnect", () => {
            console.log("User disconnected", socket.id);
        });

        // مدیریت خطاها
        socket.on("error", (error) => {
            console.error("Socket error:", error);
        });

        // سایر event handlerها
    });

    return io;
}

module.exports = {
    initialSocket
};