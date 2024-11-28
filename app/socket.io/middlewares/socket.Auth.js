const { verifyTokenSocket } = require("../../http/middlewares/verifyTokenSocket.middleware");

const socketAuth = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const user = verifyTokenSocket(token);
    socket.handshake.auth.user = user;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};

module.exports = socketAuth;