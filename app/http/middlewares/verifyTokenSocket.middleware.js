const { verifyAccessToken } = require('./authorizationSystem.middleware');

async function verifyTokenSocket(socket, next) {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            return next(new Error("Authentication error: Missing token"));
        }

        // استفاده از middleware verifyAccessToken برای اعتبارسنجی token
        const decoded = await verifyAccessToken(token); 

        if (!decoded) {
            return next(new Error("Authentication error: Invalid token"));
        }

        socket.user = decoded;
        next();

    } catch (error) {
        console.error("Socket authentication error:", error);
        next(new Error("Authentication error: " + error.message)); // ارسال پیام خطای اصلی
    }
}

module.exports = { verifyTokenSocket };