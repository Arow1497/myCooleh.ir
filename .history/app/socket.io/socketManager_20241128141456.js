const ConversationHandler = require('./handlers/conversationHandler');

class SocketManager {
  constructor(io) {
    this.io = io;
    this.conversationHandler = new ConversationHandler(io);
  }

  initialize() {
    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);

      // Store user info from auth middleware
      const user = socket.handshake.auth.user;
      socket.user = user;

      // Conversation events
      socket.on('joinConversation', (data) => 
        this.conversationHandler.handleJoinConversation(socket, data));
      
      socket.on('sendMessage', (data) => 
        this.conversationHandler.handleSendMessage(socket, data));
      
      socket.on('addReaction', (data) => 
        this.conversationHandler.handleReaction(socket, data));
      
      socket.on('markRead', (data) => 
        this.conversationHandler.handleReadReceipt(socket, data));
      
      socket.on('typing', (data) => 
        this.conversationHandler.handleTyping(socket, data));

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }
}

module.exports = SocketManager;