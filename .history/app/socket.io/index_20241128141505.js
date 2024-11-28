const socketIO = require("socket.io");
const redisAdapter = require("socket.io-redis");
const socketAuth = require("./middlewares/socketAuth");
const SocketManager = require("./socketManager");

function initializeSocket(httpServer) {
    const io = socketIO(httpServer, {
        cors: {
            origin: ["https://your-allowed-domain.com", "https://another-allowed-domain.com"],
            methods: ["GET", "POST"]
        },
        transports: ["websocket"],
        pingTimeout: 10000,
        pingInterval: 5000,
    });

    // Redis Adapter for scalability
    io.adapter(redisAdapter({ host: 'localhost', port: 6379 }));

    // Authentication middleware
    io.use(socketAuth);

    // Initialize socket manager
    const socketManager = new SocketManager(io);
    socketManager.initialize();

    return io;
}

module.exports = {
    initializeSocket
};