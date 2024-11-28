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

/*

I've created a modular WebSocket implementation for the conversation features. Here's what each file does:

websocket/handlers/conversationHandler.js:

Handles all conversation-related socket events
Implements real-time messaging, reactions, read receipts, and typing indicators
Uses Prisma for database operations
Maintains room-based communication
websocket/socketManager.js:

Manages socket connections and event routing
Initializes handlers and sets up event listeners
Handles user authentication state
websocket/middlewares/socketAuth.js:

Implements authentication for socket connections
Verifies tokens and attaches user data to socket
websocket/index.js:

Sets up the Socket.IO server with Redis adapter
Configures CORS and connection settings
Initializes the socket manager
برای استفاده از این سیستم:

در سمت سرور:

const { initializeSocket } = require('./websocket');
const httpServer = require('http').createServer(app);
init
در سمت کلاینت:

اتصال به سوکت
const socket = io('YOUR_SERVER_URL', {
  auth: { token: 'USER_JWT_TOKEN' },
  transports: ['websocket']
});

پیوستن به گفتگو
socket.emit('joinConversation', { conversationId: 'CONVERSATION_ID' });

ارسال پیام
socket.emit('sendMessage', {
  conversationId: 'CONVERSATION_ID',
  content: 'متن پیام',
  attachments: [] // اختیاری
});

دریافت پیام‌های جدید
socket.on('newMessage', (message) => {
  console.log('پیام جدید:', message);
});

اعلام تایپ کردن
socket.emit('typing', {
  conversationId: 'CONVERSATION_ID',
  isTyping: true
});
این پیاده‌سازی:

از Redis برای مقیاس‌پذیری استفاده می‌کند
امنیت را با middleware احراز هویت تأمین می‌کند
از room‌ها برای مدیریت گفتگوها استفاده می‌کند
قابلیت‌های real-time مانند typing indicator را پشتیبانی می‌کند
با سیستم موجود Prisma یکپارچه است

*/